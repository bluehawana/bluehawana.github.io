# LinkedIn Sync Architecture Documentation

## Overview

Your LinkedIn posts are automatically synced to your website (www.bluehawana.com) through multiple redundant systems to ensure posts are always up-to-date.

## Architecture Components

### 1. Frontend (Netlify)
- **URL**: https://app.netlify.com/projects/bluehawana
- **Domain**: www.bluehawana.com
- **Deployment**: https://app.netlify.com/projects/bluehawana/deploys/6924144adec4a300083562ef
- **Source**: GitHub repository `bluehawana/bluehawana.github.io`

**Frontend Features:**
- Static website hosted on Netlify
- Automatically deploys when changes are pushed to GitHub
- JavaScript loads LinkedIn posts from `/data/linkedin-posts.json`
- Posts displayed in the "Latest Professional Insights" section on homepage
- Full blog page at `/pages/blog.html`

### 2. Backend - GitHub Actions (Primary Sync)
**Location**: `.github/workflows/`

**Workflows:**
1. **update-linkedin-posts.yml** (Primary)
   - Runs every 30 minutes
   - Uses LinkedIn OAuth API
   - More reliable and gets full post content

2. **linkedin-sync.yml** (Backup)
   - Runs every 30 minutes
   - Uses ScrapingDog API
   - Fallback if OAuth fails

**How it works:**
- GitHub Actions runs on schedule (every 30 minutes)
- Fetches latest LinkedIn posts via API
- Creates markdown files in `_posts/` directory
- Updates `data/linkedin-posts.json`
- Commits and pushes changes to GitHub
- Netlify auto-deploys the updated site

### 3. Backend - VPS (Optional Backup)
**Location**: RackNerd VPS
- **Host**: 107.175.235.220
- **User**: harvad
- **OS**: Debian Linux

**Setup Required:**
Run the setup script on your VPS:
```bash
# SSH into your VPS
ssh harvad@107.175.235.220

# Download and run the setup script
curl -O https://raw.githubusercontent.com/bluehawana/bluehawana.github.io/main/vps-setup-linkedin-sync.sh
chmod +x vps-setup-linkedin-sync.sh
./vps-setup-linkedin-sync.sh
```

This will:
- Clone your GitHub repository
- Set up a cron job to sync every 30 minutes
- Push updates back to GitHub
- Provides redundancy if GitHub Actions fails

### 4. Netlify Functions (API Endpoints)
**Location**: `netlify/functions/`

Available API endpoints:
- `/api/linkedin-sync` - Manual sync trigger
- `/api/linkedin-posts-sync` - OAuth-based sync
- `/api/linkedin-activity-sync` - Activity sync
- `/api/automation-status` - Check sync status
- `/api/github-update` - Update GitHub repository

## Data Flow

```
LinkedIn Profile (hzl)
         ↓
    [30-minute trigger]
         ↓
   GitHub Actions
   (OAuth + ScrapingDog APIs)
         ↓
   Updates Repository:
   - _data/linkedin-posts.json
   - data/linkedin-posts.json
   - _posts/*.md (blog posts)
         ↓
   Commits & Pushes to GitHub
         ↓
   Netlify Auto-Deploy
         ↓
   Website Updated (www.bluehawana.com)
         ↓
   Visitors See Latest Posts
```

## API Keys & Secrets

### GitHub Secrets (for GitHub Actions)
Required secrets in your GitHub repository settings:

1. **RAPIDAPI_KEY** - For RapidAPI LinkedIn scraping
2. **LINKEDIN_ACCESS_TOKEN** - OAuth token for LinkedIn API
3. **LINKEDIN_PROFILE_URN** - Your LinkedIn profile URN
4. **GITHUB_TOKEN** - Automatically provided by GitHub

### Netlify Environment Variables
Set in Netlify dashboard:

1. **LINKEDIN_ACCESS_TOKEN**
2. **LINKEDIN_CLIENT_ID**
3. **LINKEDIN_CLIENT_SECRET**
4. **RAPIDAPI_KEY**
5. **GITHUB_TOKEN**

### VPS Environment Variables
If setting up VPS backup, edit `.env.local`:

```bash
SCRAPINGDOG_API_KEY=your_key_here
LINKEDIN_ACCESS_TOKEN=your_token_here
LINKEDIN_PROFILE_ID=hzl
SYNC_INTERVAL_MINUTES=30
MAX_POSTS_TO_SYNC=10
```

## Current Status

### ✅ Completed
- GitHub Actions workflows re-enabled
- Sync frequency set to every 30 minutes
- Both workflows (OAuth + ScrapingDog) active
- Frontend properly configured to display posts

### 🔧 To Configure
1. **VPS Backup Sync** (Optional but recommended)
   - Run the setup script on your VPS
   - Add API keys to `.env.local`
   - Test with: `/home/harvad/linkedin-sync/run-sync.sh`

2. **API Keys Verification**
   - Verify GitHub Secrets are set correctly
   - Check Netlify environment variables
   - Test manual sync via GitHub Actions "Run workflow" button

## Testing

### Test GitHub Actions Sync
1. Go to: https://github.com/bluehawana/bluehawana.github.io/actions
2. Select "Update LinkedIn Posts (OAuth)"
3. Click "Run workflow" → "Run workflow"
4. Wait 2-3 minutes
5. Check if new posts appear in `data/linkedin-posts.json`

### Test Website Display
1. Visit: https://www.bluehawana.com
2. Scroll to "Latest Professional Insights" section
3. Verify posts are showing
4. Click on a post to verify the LinkedIn link works

### Test VPS Sync (if configured)
```bash
ssh harvad@107.175.235.220
/home/harvad/linkedin-sync/run-sync.sh
tail -f /home/harvad/linkedin-sync/sync.log
```

## Monitoring

### Check Sync Status
- **GitHub Actions**: https://github.com/bluehawana/bluehawana.github.io/actions
- **Netlify Deploys**: https://app.netlify.com/sites/bluehawana/deploys
- **Last Sync Report**: Check `_data/last-sync-report.json` in repository
- **VPS Logs**: `tail -f /home/harvad/linkedin-sync/sync.log`

### Troubleshooting

**If posts aren't syncing:**
1. Check GitHub Actions for errors
2. Verify API keys in GitHub Secrets
3. Check API rate limits
4. Review sync logs
5. Try manual workflow trigger

**If posts don't appear on website:**
1. Check if `data/linkedin-posts.json` has data
2. Clear browser cache
3. Check Netlify deployment logs
4. Verify JavaScript console for errors

## Maintenance

### Update Sync Frequency
Edit `.github/workflows/update-linkedin-posts.yml`:
```yaml
on:
  schedule:
    - cron: '*/30 * * * *'  # Every 30 minutes
```

Change `*/30` to desired interval:
- `*/15` = every 15 minutes
- `*/60` or `0 * * * *` = every hour
- `0 */2 * * *` = every 2 hours

### Update API Keys
- GitHub: Repository Settings → Secrets and variables → Actions
- Netlify: Site settings → Environment variables
- VPS: Edit `/home/harvad/linkedin-sync/bluehawana.github.io/.env.local`

## Support

For issues or questions:
1. Check GitHub Actions logs
2. Review this documentation
3. Check LinkedIn API status
4. Verify all API keys are valid and not expired

---

**Last Updated**: 2025-11-24
**Documentation Version**: 1.0
**Maintained by**: Claude Code
