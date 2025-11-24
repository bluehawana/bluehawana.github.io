# LinkedIn OAuth 2.0 Automation

Automatically sync your LinkedIn posts to your blog using OAuth 2.0 authentication.

## 🔑 OAuth Configuration

Your LinkedIn app is configured with:
- **Client ID**: `77duha47hcbh8o`
- **Scopes**: `openid`, `profile`, `r_events`, `w_member_social`, `email`, `rw_events`
- **Access Token**: Configured and ready to use (60-day expiry)

## 🚀 Quick Start

### 1. Test the OAuth Integration

```bash
# Test your OAuth token
node test-oauth-integration.js

# Test in browser
open oauth-test.html
```

### 2. Run Manual Sync

```bash
# Sync LinkedIn posts now
node linkedin-oauth-automation.js
```

### 3. Test with New Post

1. **Post something new on LinkedIn**
2. **Wait 1-2 minutes** for LinkedIn to process it
3. **Run the sync**: `node linkedin-oauth-automation.js`
4. **Check results**:
   - New post in `data/linkedin-posts.json`
   - Blog post created in `_posts/` directory

## 📁 File Structure

```
├── linkedin-oauth-automation.js    # Main automation script
├── test-oauth-integration.js       # Integration test
├── oauth-test.html                 # Browser test page
├── linkedin_config.js              # OAuth configuration
├── data/
│   ├── linkedin-posts.json         # Synced posts data
│   └── linkedin-sync-log.json      # Sync history
└── _posts/                         # Generated blog posts
    └── YYYY-MM-DD-linkedin-*.md
```

## 🔄 Automation Features

### Automatic Detection
- ✅ Detects new LinkedIn posts using OAuth API
- ✅ Compares with existing posts to find new content
- ✅ Creates blog posts automatically
- ✅ Tracks sync history and timestamps

### Smart Tagging
- Extracts hashtags from LinkedIn posts
- Generates tags based on content keywords
- Supports categories: development, tech, career, AI, etc.

### Engagement Tracking
- Captures likes, comments, and shares
- Includes engagement stats in blog posts
- Updates metrics on each sync

## 🤖 GitHub Actions

The automation runs automatically every 2 hours via GitHub Actions:

```yaml
# Runs every 2 hours
- cron: '0 */2 * * *'
```

### Manual Trigger
You can also trigger the sync manually:
1. Go to your GitHub repository
2. Click "Actions" tab
3. Select "Update LinkedIn Posts (OAuth)"
4. Click "Run workflow"

## 🧪 Testing

### Test OAuth Token
```bash
node test-oauth-token.js
```

### Test Full Integration
```bash
node test-oauth-integration.js
```

### Test with New Post
1. Create a new LinkedIn post
2. Run: `node linkedin-oauth-automation.js`
3. Check for new files in `data/` and `_posts/`

## 📊 Output Format

### LinkedIn Posts Data (`data/linkedin-posts.json`)
```json
[
  {
    "id": "urn:li:share:123456789",
    "content": "Your LinkedIn post content...",
    "date": "2024-01-15",
    "timestamp": 1705123456789,
    "url": "https://www.linkedin.com/feed/update/...",
    "type": "linkedin_oauth",
    "engagement": {
      "likes": 25,
      "comments": 5,
      "shares": 2
    },
    "tags": ["development", "tech"],
    "source": "oauth_api"
  }
]
```

### Blog Posts (`_posts/YYYY-MM-DD-linkedin-*.md`)
```markdown
---
layout: post
title: "LinkedIn Update - 2024-01-15"
date: 2024-01-15
categories: [linkedin, social]
tags: [development, tech]
linkedin_url: https://www.linkedin.com/feed/update/...
linkedin_id: urn:li:share:123456789
engagement:
  likes: 25
  comments: 5
  shares: 2
---

Your LinkedIn post content...

---

*Originally posted on [LinkedIn](https://www.linkedin.com/feed/update/...)*

**Engagement Stats:**
- 👍 25 likes
- 💬 5 comments  
- 🔄 2 shares
```

## 🔧 Configuration

### Environment Variables
```bash
# Optional: Override the access token
export LINKEDIN_ACCESS_TOKEN="your_token_here"
```

### GitHub Secrets
For GitHub Actions, add this secret:
- `LINKEDIN_ACCESS_TOKEN`: Your OAuth access token

## 🚨 Token Expiry

Your OAuth token expires in ~60 days. When it expires:

1. **Regenerate token** in LinkedIn Developer Console
2. **Update** `linkedin_config.js` with new token
3. **Update** GitHub secret `LINKEDIN_ACCESS_TOKEN`

## 📈 Monitoring

Check sync status:
- **Sync log**: `data/linkedin-sync-log.json`
- **GitHub Actions**: Repository → Actions tab
- **Console output**: Run scripts manually to see detailed logs

## 🛠️ Troubleshooting

### Common Issues

**"No OAuth access token available"**
- Check `linkedin_config.js` has correct token
- Verify token hasn't expired

**"API request failed: 401"**
- Token expired or invalid
- Regenerate token in LinkedIn Developer Console

**"Failed to get member ID"**
- Check token has correct scopes
- Verify LinkedIn app permissions

### Debug Mode
```bash
# Run with detailed logging
DEBUG=1 node linkedin-oauth-automation.js
```

## 🎯 Next Steps

1. **Test the integration** with a new LinkedIn post
2. **Monitor the automation** via GitHub Actions
3. **Customize blog post templates** as needed
4. **Set up notifications** for sync failures (optional)

The OAuth integration is now ready to automatically sync your LinkedIn posts to your blog! 🚀