# Update Working Diary Skill

**Description**: This skill automates the creation of day-by-day development logs in `working-diary.md`. It extracts context from recent commits and uncommitted changes, prompts for any missing context about challenges or design decisions, and documents the progress transparently so other developers can learn from the journey.

## Instructions

1. **Review Context**:
   - Check the `working-diary.md` file to understand the current structure and recent entries.
   - Run `git log -n 5` and `git diff` to analyze what the user has recently worked on.
   - Review the modified files to understand the core functionality that was altered or added.

2. **Gather Details (If Needed)**:
   - If the implementation details, challenges faced, or decision-making processes are not completely obvious from the codebase, **pause and ask the user** (or infer and ask for confirmation).
   - Key questions to answer:
     - *What are the solutions we implemented?*
     - *What were the issues (technical or non-technical)?*
     - *How did we solve those issues step-by-step?*

3. **Format the Entry**:
   - Append a new entry to `working-diary.md` under the current date (e.g., `## YYYY-MM-DD`).
   - Use the following structured sections:
     - **Goal**: A brief summary of what we wanted to achieve today.
     - **Solutions**: The technical approach taken.
     - **Issues Faced**: Challenges, blockers, or confusing bugs encountered.
     - **How We Solved It**: The specific actions, workarounds, or refactors used to overcome the issues.
   - Write in an educational, transparent tone ("we" narrative). Document embarrassing situations or roadblocks honestly so others can learn from them.

4. **Security Check**:
   - Scan the newly generated entry for any credentials, API keys, personal emails, or sensitive server URLs. Ensure NO secrets are leaked.

5. **Commit and Push**:
   - Once the user is satisfied with the entry, run the following commands:
     ```bash
     git add working-diary.md
     git commit -m "docs: Update working diary for $(date +%Y-%m-%d)"
     git push
     ```

## Example Topics to Document
- "How we synced the contents from GitHub repos to my website."
- "How we synced LinkedIn posts to the blog on my website."
- "What kind of issues we faced beforehand and how we solved them."
