# LinkedIn Sync Cloudflare Worker

Professional LinkedIn API synchronization worker for automated content management.

## 🚀 Features

- **Automated LinkedIn post synchronization** via LinkedIn API v2
- **GitHub repository updates** with commit automation
- **Real-time status monitoring** and health checks
- **Webhook support** for instant LinkedIn updates
- **Intelligent content processing** with tag generation
- **Duplicate prevention** and smart merging
- **CORS support** for frontend integration

## 📋 Prerequisites

1. **LinkedIn Developer App** with API access
2. **GitHub Personal Access Token** with repo permissions
3. **Cloudflare Workers** account (free tier sufficient)

## 🛠️ Deployment Instructions

### 1. Install Wrangler CLI
```bash
npm install -g wrangler
```

### 2. Authenticate with Cloudflare
```bash
wrangler login
```

### 3. Set Environment Variables
```bash
# LinkedIn API credentials
wrangler secret put LINKEDIN_CLIENT_ID
wrangler secret put LINKEDIN_CLIENT_SECRET
wrangler secret put LINKEDIN_ACCESS_TOKEN

# GitHub integration
wrangler secret put GITHUB_TOKEN
wrangler secret put GITHUB_REPO  # bluehawana/bluehawana.github.io
```

### 4. Deploy Worker
```bash
cd workers/
wrangler deploy
```

## 📡 API Endpoints

### `/linkedin-sync`
- **Method**: GET
- **Description**: Manually trigger LinkedIn post synchronization
- **Response**: JSON with sync status and post count

### `/automation-status`
- **Method**: GET  
- **Description**: Check worker and API connectivity status
- **Response**: JSON with LinkedIn, GitHub, and worker status

### `/github-update`
- **Method**: POST
- **Description**: Update GitHub repository with provided posts
- **Body**: `{ "posts": [...] }`

### `/webhook/linkedin`
- **Method**: POST
- **Description**: Handle LinkedIn webhook notifications
- **Body**: LinkedIn webhook payload

## 🔧 Configuration

### Environment Variables Required:
```
LINKEDIN_CLIENT_ID=your_linkedin_app_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_app_client_secret  
LINKEDIN_ACCESS_TOKEN=your_linkedin_user_access_token
GITHUB_TOKEN=ghp_your_github_personal_access_token
GITHUB_REPO=bluehawana/bluehawana.github.io
```

### Automatic Scheduling:
- Worker runs **every 6 hours** via cron trigger
- Can be manually triggered via API endpoint
- Supports webhook-based real-time updates

## 🔗 Frontend Integration

Update your website's JavaScript to use the worker:

```javascript
// Replace local API calls with worker endpoints
const WORKER_URL = 'https://your-worker.your-subdomain.workers.dev';

async function syncLinkedInPosts() {
  const response = await fetch(`${WORKER_URL}/linkedin-sync`);
  const result = await response.json();
  console.log('Sync result:', result);
}

async function getAutomationStatus() {
  const response = await fetch(`${WORKER_URL}/automation-status`);
  const status = await response.json();
  return status;
}
```

## 📊 Monitoring

The worker provides detailed logging and status information:
- **LinkedIn API connectivity** status
- **GitHub API connectivity** status  
- **Post processing** success/failure rates
- **Sync timestamps** and frequency
- **Error tracking** with detailed messages

## 🛡️ Security Features

- **Environment variable protection** for API credentials
- **CORS headers** for secure browser requests
- **Error handling** with appropriate HTTP status codes
- **Rate limiting** respect for LinkedIn API limits
- **Content validation** before GitHub updates

## 🔄 How It Works

1. **Fetch LinkedIn Posts**: Uses LinkedIn API v2 to get user's recent posts
2. **Process Content**: Extracts text, generates tags, creates proper URLs
3. **Merge Data**: Combines new posts with existing ones, preventing duplicates  
4. **Update GitHub**: Commits updated JSON file to repository
5. **Status Reporting**: Provides detailed feedback on sync operations

## 📞 Support

For issues or questions about the worker deployment:
- Check Cloudflare Workers logs in the dashboard
- Verify environment variables are set correctly
- Test API endpoints individually
- Monitor rate limits for LinkedIn API

Worker will be accessible at: `https://linkedin-sync-worker.your-subdomain.workers.dev`