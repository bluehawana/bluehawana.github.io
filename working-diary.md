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
