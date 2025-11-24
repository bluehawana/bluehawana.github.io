# Environment Variable Setup for LinkedIn Automation

## 🔐 Secure API Key Management

This project uses environment variables to securely store API keys and configuration settings.

## 📁 Environment Files

### `.env.example`
- Template file showing all available environment variables
- Safe to commit to git
- Contains placeholder values only

### `.env.local`  
- Contains your actual API keys for local development
- **NEVER commit this file to git!** (protected by .gitignore)
- Used when running scripts locally

### `.env` (optional)
- Can contain shared configuration for your team
- Usually committed to git (but not in this project for security)

## 🚀 Quick Setup

1. **Copy the template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Add your real API key:**
   Edit `.env.local` and replace:
   ```
   SCRAPINGDOG_API_KEY=your_scrapingdog_api_key_here
   ```
   With your actual key:
   ```
   SCRAPINGDOG_API_KEY=68ac0adb282d10b8936bc5a5
   ```

3. **Test the setup:**
   ```bash
   node automated-linkedin-sync.js sync
   ```

## 🔧 Available Environment Variables

### Required
- `SCRAPINGDOG_API_KEY` - Your ScrapingDog API key for LinkedIn scraping

### Optional
- `LINKEDIN_PROFILE_ID` - LinkedIn profile ID (default: hzl)
- `SYNC_INTERVAL_MINUTES` - How often to sync (default: 30)
- `MAX_POSTS_TO_SYNC` - Maximum posts per sync (default: 10)

### LinkedIn OAuth (Advanced)
- `LINKEDIN_CLIENT_ID` - For direct LinkedIn API access
- `LINKEDIN_CLIENT_SECRET` - For OAuth authentication
- `LINKEDIN_ACCESS_TOKEN` - User access token
- `LINKEDIN_REFRESH_TOKEN` - For token renewal

## 🌐 GitHub Actions Setup

For automated syncing via GitHub Actions:

1. Go to your repository Settings
2. Navigate to "Secrets and variables" → "Actions"
3. Add repository secrets:
   - `SCRAPINGDOG_API_KEY` = your actual API key

## 🛡️ Security Best Practices

### ✅ DO:
- Use `.env.local` for local development
- Add API keys as GitHub repository secrets
- Keep `.env.example` updated with new variables
- Use different API keys for production vs development

### ❌ DON'T:
- Commit `.env.local` or `.env` files with real keys
- Hardcode API keys directly in source code
- Share API keys in chat, email, or documentation
- Use production API keys for development/testing

## 🔍 Troubleshooting

### "Missing API key" error
- Check that `.env.local` exists and contains your API key
- Verify the file format (no extra spaces, quotes handled correctly)
- Ensure the file is in the project root directory

### GitHub Actions failing
- Check that `SCRAPINGDOG_API_KEY` is set as a repository secret
- Verify the secret name matches exactly (case-sensitive)

### Environment not loading
- Make sure you're running scripts from the project root directory
- Check file permissions on `.env.local`
- Verify there are no syntax errors in the env file

## 📖 File Format

Environment files should follow this format:
```bash
# Comments start with #
VARIABLE_NAME=value_without_quotes
QUOTED_VALUE="value with spaces"
MULTILINE_VALUE=first_part_second_part

# Empty lines are ignored
```

---

*This setup ensures your API keys remain secure while making the automation system easy to configure and deploy.*