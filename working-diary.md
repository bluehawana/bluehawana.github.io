# Working Diary

This diary documents our day-by-day development journey. It records our goals, the technical and non-technical issues we face, and the specific solutions we implement. By sharing these details, we hope other developers can learn from our experiences, challenges, and "aha" moments.

---

## Historical Entry: Syncing GitHub Repositories to the Website

**Goal**: Automatically display and sync the latest projects from GitHub to the portfolio website so that the "Projects" section is always up to date without manual HTML edits.

**Solutions**:
- We utilized the GitHub REST API to fetch public repositories for the user.
- We built a vanilla JavaScript script to dynamically render these repositories into HTML cards.
- We implemented aggressive caching at the origin (via `_headers`) to avoid hitting API rate limits and to ensure fast page loads through Cloudflare Pages.

**Issues Faced**:
- *Technical Issue*: We ran into aggressive API rate limits when the page loaded frequently, causing the GitHub API to return 403 Forbidden errors.
- *Technical Issue*: The generated cards sometimes lacked placeholder images for repos without descriptions or proper topics, causing UI inconsistency.
- *Deployment Issue*: Using GitHub Actions to generate static pages and push them was conflicting with Cloudflare Pages' automatic deployment tracking.

**How We Solved It**:
1. **Handling Rate Limits**: We shifted the strategy. Instead of fetching the API purely on the client side every time a user visits, we implemented a build-time script (`cf-deploy.sh`) that fetches the repos and bakes them into the HTML, leveraging Cloudflare Workers/Pages for caching.
2. **UI Consistency**: We added a fallback logic in our JavaScript parser. If a repository didn't have an explicit image or topic, it assigned a random gradient background and categorized it under "General" to ensure the grid always looked premium.
3. **Deployment Flow**: We configured Cloudflare Pages to hook directly into the `main` branch, bypassing the redundant GitHub Actions push. We added specific cache control headers in `_headers` to optimize asset delivery.

---

## Historical Entry: Syncing LinkedIn Posts to the Blog

**Goal**: Extract recent LinkedIn activity/posts and automatically display them as blog entries on the portfolio, creating a unified personal brand presence.

**Solutions**:
- We built a custom LinkedIn scraper/extractor (e.g., `linkedin-post-extractor.js` and `sync-linkedin-posts.js`).
- We configured a scheduled GitHub Action (running daily/weekly) to trigger the script, fetch the latest posts, format them as JSON, and commit the results back to the repository.
- The frontend dynamically loads `harvad-li-linkedin-profile.json` to render the posts.

**Issues Faced**:
- *Technical Issue*: LinkedIn heavily protects its feed. Using a standard API requires strict OAuth flows that frequently expire, and standard scraping gets blocked by Captchas.
- *Technical Issue*: The structure of LinkedIn posts (images, shared articles, plain text) varies wildly, causing the parser to crash or render `undefined` in the HTML.
- *Non-technical Issue*: Figuring out whether we were violating terms of service by scraping our own profile.

**How We Solved It**:
1. **Bypassing the Blockers**: We settled on a hybrid approach. For automated syncing, we utilized session cookies (li_at) stored securely in GitHub Secrets. The script simulates an authenticated request to the feed API rather than scraping raw HTML, vastly improving reliability.
2. **Handling Data Variations**: We implemented a robust JSON parser with extensive null-checking. If an image wasn't present, the layout cleanly collapsed that section. If a post was a shared article, it extracted the embedded `url` and `title` instead of the raw text.
3. **Daily Sync Actions**: We wrapped the entire flow in a GitHub Action (`Auto-sync LinkedIn posts`) that runs on a cron job. If the parser ever fails (due to LinkedIn changing their API), the Action fails silently without breaking the live website, giving us time to fix the parser (`Fix: Update LinkedIn Parser`) as seen in recent commits.

---

## 2026-05-14: Adding Paid 1-on-1 Consultations

**Goal**: Add a "Buy Me a Coffee" booking section to the website to handle requests for personal consulting, project reviews, and interview prep.

**Solutions**: 
- We integrated a Call-to-Action button linking to a Buy Me A Coffee "Extra".
- We configured the workflow so that payment is collected first via BMAC, and the Calendly booking link is only revealed in the post-payment confirmation.

**Issues Faced**:
- *Non-technical Issue*: We previously removed this section to avoid making the website look "too commercial."
- *Technical Issue*: Ensuring a foolproof workflow where payment is strictly enforced before a calendar block can be reserved, without writing a custom backend.

**How We Solved It**:
1. We realized that valuable knowledge transfer should be charged. My current rate for Volvo Group is 615 SEK (~$60) per hour, which covers active coding, breaks, and lunch. If I'm not being paid, that time is better spent learning new technologies. There is no reason to offer these 1-on-1s for free.
2. To solve the payment-before-booking enforcement, we leveraged BMAC's "Extras" feature. By putting the Calendly link exclusively in the BMAC post-purchase confirmation, we created a seamless funnel that automatically handles receipts and calendar invites for both host and guest without any custom backend logic.

---

*(Future entries generated by the AI skill will appear here)*

---

## 2026-05-19: LLM Provider Abstraction & Branch Strategy

**Goal**: Refactor DevOpsBot's code review engine to support multiple LLM backends (oMLX on MacBook M5, Ollama on company Mac Studios) and set up a clean branch-per-environment strategy.

**Solutions**:
- Created `src/llm-provider.js` as a unified provider abstraction: `generate(prompt, model)` auto-selects between oMLX and Ollama via config or `DEVOPSBOT_PROVIDER` env var.
- Refactored `src/reviewer.js` to use the new provider (`import { generate as llmGenerate }`).
- Set up two feature branches:
  - **max5** (MacBook M5) — defaults to oMLX; switch to local Ollama with `DEVOPSBOT_PROVIDER=ollama node src/cli.js review`.
  - **Lundby** (Volvo Group, Gothenburg) — provider: ollama, BMC hostnames with failover across Mac Studios.
- Renamed old branches in-place: `local-omlx` → `max5`, `company-ollama` → `Lundby`.

**Issues Faced**:
- *Technical Issue*: The `reviewCode` function's `parseJSON` was returning `{ error: "..." }` because the LLM was generating a 6500+ character self-review (100+ repeated bullet points) instead of clean JSON — so `modelA.code` was `undefined` even though the prompt requested it.
- *Technical Issue*: parseJSON's early return for `typeof text === 'object'` was correct but the LLM output format was the bottleneck, not the parser.
- *Technical Issue*: The A/B comparison test (`reviewer.test.js`) passed despite `code: undefined` because it only checked `title` and `score`, not `code`.
- *Non-technical Issue*: Context window limits in Claude Code conversations. Pushing past 67K tokens caused the model to lose context from early messages.
- *Non-technical Issue*: Branch naming (`local-omlx` / `company-ollama`) was descriptive but verbose.

**How We Solved It**:
1. Added `code` field explicitly to the CODE_AUDIT_PROMPT JSON format section and constrained array lengths to ≤10 items each, which fixed the LLM output format.
2. Bumped oMLX context window from 65K → 128K in `~/.omlx/settings.json` — this is Qwen3's native limit (YaRN scaling beyond that degrades quality).
3. Created `Lundby` branch for the Lundby Volvo Mac Studios with multi-studio failover support.
4. Set up branch workflow: `main` holds shared code, feature branches hold environment-specific config. Merge main into branches to sync.

**Unresolved**:
- Failover port bug in `llm-provider.js:99`: hardcoded `:11434` when reading `studio.host` — only affects Lundby when host:port is in config.
- Second Mac Studio's BMC hostname on Lundby is still a placeholder.
- Branches not yet pushed to origin.
