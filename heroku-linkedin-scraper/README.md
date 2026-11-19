# 🚀 LinkedIn Auto-Scraper for Heroku

**100% Automated LinkedIn Post Synchronization** - No manual work required!

This Heroku app automatically scrapes your LinkedIn posts every 2 hours and updates your GitHub Pages website. Set it up once and forget about it!

## ✨ Features

- 🤖 **Fully Automated** - Runs 24/7 on Heroku
- 🔄 **Multiple Scraping Methods** - Puppeteer, HTTP, RSS fallbacks
- 📝 **Auto GitHub Updates** - Commits directly to your repo
- ⏰ **Scheduled Runs** - Every 2 hours automatically
- 🛡️ **Error Handling** - Graceful fallbacks when methods fail
- 📊 **Status Dashboard** - Monitor scraping activity
- 🔧 **Zero Maintenance** - Set and forget

## 🚀 One-Click Deploy to Heroku

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/bluehawana/linkedin-auto-scraper)

## 📋 Setup Instructions

### 1. **Create GitHub Personal Access Token**

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo` (full repository access)
4. Copy the token (you'll need it for Heroku)

### 2. **Deploy to Heroku**

1. Click the "Deploy to Heroku" button above
2. Fill in the environment variables:
   - `GITHUB_TOKEN`: Your GitHub personal access token
   - `GITHUB_REPO_OWNER`: `bluehawana`
   - `GITHUB_REPO_NAME`: `bluehawana.github.io`
   - `LINKEDIN_PROFILE_URL`: `https://www.linkedin.com/in/harvad`

3. Click "Deploy app"

### 3. **Verify Setup**

1. Wait for deployment to complete
2. Open your Heroku app URL
3. You should see: `{"status": "LinkedIn Auto-Scraper Running"}`
4. Check `/status` endpoint for detailed information

## 📊 Monitoring

### **Status Endpoints**

- `GET /` - Basic status and uptime
- `GET /status` - Detailed scraping information  
- `GET /logs` - Recent scraping logs
- `POST /scrape-now` - Trigger manual scrape

### **Example Status Response**
```json
{
  "server": "running",
  "lastScrape": "2025-09-07T15:30:00.000Z",
  "lastResult": {
    "postsFound": 5,
    "githubUpdate": true,
    "duration": 12500
  },
  "uptime": 86400
}
```

## ⚙️ How It Works

### **Scraping Process**
1. **Puppeteer Method** - Full browser automation (most reliable)
2. **HTTP Scraping** - Direct HTML parsing (faster)
3. **RSS Feeds** - LinkedIn RSS when available
4. **Fallback Methods** - Multiple backup approaches

### **GitHub Integration**
1. Fetches current `data/linkedin-posts.json`
2. Merges new posts with existing ones
3. Deduplicates based on content hash
4. Commits changes with descriptive message
5. Keeps only 10 most recent posts

### **Scheduling**
- Runs every 2 hours via cron: `0 */2 * * *`
- Daily health check at 9 AM
- Initial scrape 30 seconds after startup

## 🔧 Configuration

### **Environment Variables**

| Variable | Description | Default |
|----------|-------------|---------|
| `GITHUB_TOKEN` | GitHub Personal Access Token | Required |
| `GITHUB_REPO_OWNER` | Repository owner | `bluehawana` |
| `GITHUB_REPO_NAME` | Repository name | `bluehawana.github.io` |
| `LINKEDIN_PROFILE_URL` | Your LinkedIn profile | `https://www.linkedin.com/in/harvad` |
| `SCRAPE_INTERVAL_HOURS` | Scraping frequency | `2` |
| `MAX_POSTS_TO_KEEP` | Posts to retain | `10` |

### **Heroku Buildpacks**
1. `https://github.com/jontewks/puppeteer-heroku-buildpack`
2. `heroku/nodejs`

## 🛠️ Local Development

```bash
# Clone the repository
git clone https://github.com/bluehawana/linkedin-auto-scraper
cd linkedin-auto-scraper

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
nano .env

# Run locally
npm start

# Test scraping
npm run scrape
```

## 📈 Expected Results

After deployment, your LinkedIn posts will be automatically:

- ✅ **Scraped every 2 hours**
- ✅ **Committed to GitHub**
- ✅ **Displayed on your website**
- ✅ **Deduplicated and sorted**
- ✅ **Limited to 10 most recent**

## 🔍 Troubleshooting

### **Common Issues**

1. **No posts found**
   - Check LinkedIn profile is public
   - Verify profile URL is correct
   - LinkedIn may have changed their HTML structure

2. **GitHub update fails**
   - Verify GitHub token has `repo` permissions
   - Check repository name and owner are correct
   - Ensure repository exists and is accessible

3. **Heroku app crashes**
   - Check Heroku logs: `heroku logs --tail`
   - Verify all environment variables are set
   - Ensure buildpacks are properly configured

### **Debug Commands**

```bash
# Check Heroku logs
heroku logs --tail --app your-app-name

# Restart Heroku app
heroku restart --app your-app-name

# Check environment variables
heroku config --app your-app-name

# Manual scrape trigger
curl -X POST https://your-app-name.herokuapp.com/scrape-now
```

## 🎯 Success Metrics

Once running, you should see:

- 📊 **Regular commits** to your GitHub repo every 2 hours
- 🔄 **Updated LinkedIn posts** on your website
- 📈 **Status dashboard** showing successful scrapes
- 🤖 **Zero manual intervention** required

## 🆘 Support

If you encounter issues:

1. Check the status endpoint: `/status`
2. Review Heroku logs
3. Verify GitHub token permissions
4. Test manual scrape: `POST /scrape-now`

## 🎉 That's It!

Your LinkedIn posts will now automatically sync to your website **forever** with zero manual work required! 🚀

The scraper runs 24/7 on Heroku and handles all the complexity of LinkedIn's changing structure, GitHub API integration, and error recovery.

**Set it and forget it!** 💪