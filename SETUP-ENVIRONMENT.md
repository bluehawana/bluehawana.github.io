# LinkedIn Automation Environment Setup

## 🔐 Security Configuration

This automation system uses environment variables to securely store API keys and configuration.

### 1. Environment Variables Required

Create a `.env` file in the project root with:

```bash
# LinkedIn RapidAPI Configuration
RAPIDAPI_KEY=your_rapidapi_key_here
LINKEDIN_PROFILE_URN=urn:li:fsd_profile:ACoAAAnSTvABXgay-z5smZQ1OOq0MblgiB2GRLI

# Sync Configuration
MAX_POSTS_TO_SYNC=10
SYNC_INTERVAL_HOURS=6
```

### 2. GitHub Actions Secrets

In your GitHub repository settings, add these secrets:

- `RAPIDAPI_KEY`: Your LinkedIn Scraper RapidAPI key
- `LINKEDIN_PROFILE_URN`: Your LinkedIn profile URN

### 3. Netlify Environment Variables

In your Netlify site settings, add:

- `RAPIDAPI_KEY`: Your LinkedIn Scraper RapidAPI key
- `LINKEDIN_PROFILE_URN`: Your LinkedIn profile URN (already in netlify.toml)

### 4. Files to Keep Secure

The `.gitignore` file already protects these files:
- `.env`
- `.env.local`
- `.env.production`
- `secrets/`
- `credentials/`

## 🚀 Usage

### Local Development
```bash
# Set up environment
cp .env.example .env
# Edit .env with your API key

# Run sync
node linkedin-sync-simple.js
```

### GitHub Actions
The automation runs every 6 hours automatically using GitHub secrets.

### Netlify Deployment  
Environment variables are configured in netlify.toml and Netlify UI.

## 🔧 Testing

```bash
# Test sync (requires .env file)
node linkedin-sync-simple.js

# View dashboard
open linkedin-dashboard.html
```

## 📊 Monitoring

- **Dashboard**: `/linkedin-dashboard.html`
- **Data File**: `/data/linkedin-posts.json`
- **Blog Posts**: `/_posts/`
- **Logs**: Check console output

## 🛡️ Security Notes

- Never commit API keys to version control
- Use GitHub/Netlify environment variables for deployment
- The `.env` file is ignored by Git
- API keys are validated on startup