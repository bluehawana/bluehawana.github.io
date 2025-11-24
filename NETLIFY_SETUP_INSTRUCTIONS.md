# Netlify Environment Variables Setup Instructions

## Required Environment Variables

You need to add these environment variables in your Netlify Dashboard:

### 1. Go to Netlify Dashboard
- Visit: https://app.netlify.com
- Find your site: `bluehawana.github.io` or similar
- Go to: Site Settings → Environment Variables

### 2. Add These Variables

**LinkedIn Configuration:**
```
LINKEDIN_CLIENT_ID = 77duha47hcbh8o
LINKEDIN_CLIENT_SECRET = [Your LinkedIn App Client Secret]
LINKEDIN_ACCESS_TOKEN = [Your Access Token from previous message]
LINKEDIN_API_VERSION = 202505
```

**GitHub Configuration:**
```
GITHUB_REPO = bluehawana/bluehawana.github.io
GITHUB_TOKEN = [Your GitHub Personal Access Token]
```

**Site Configuration:**
```
SITE_URL = https://bluehawana.com
```

### 3. Where to Get Missing Values

**LinkedIn Client Secret:**
- Go to: https://developer.linkedin.com/apps
- Select your app
- Go to "Auth" tab
- Copy the "Client Secret"

**GitHub Token:**
- Go to: https://github.com/settings/tokens
- Generate new token (classic)
- Select scopes: `repo`, `user`
- Copy the generated token

### 4. After Adding Variables
- Click "Save" 
- Wait for automatic redeployment (1-2 minutes)
- Test the dashboard at: https://bluehawana.com/automation-dashboard

## Expected Results After Setup

✅ Dashboard shows "LinkedIn: Connected"  
✅ LinkedIn Sync button works via Netlify Functions  
✅ No more 404 errors from /.netlify/functions/linkedin-env  
✅ Automatic post synchronization functions properly  

## Security Notes

- Never commit these tokens to your repository
- Store them only in Netlify environment variables
- LinkedIn tokens expire every 60 days
- GitHub tokens should be rotated periodically

---

**Delete this file after setup is complete for security.**