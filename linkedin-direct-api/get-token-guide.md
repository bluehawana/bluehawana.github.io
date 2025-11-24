# 🔑 Get LinkedIn Access Token - Quick Guide

## Method 1: Use Existing Token (If You Have One)

If you already have a LinkedIn access token, test it immediately:

```bash
cd linkedin-direct-api
npm install
node test-token.js YOUR_ACCESS_TOKEN_HERE
```

## Method 2: Get Token from LinkedIn Developer Console

### Step 1: Create LinkedIn App
1. Go to [LinkedIn Developer Console](https://developer.linkedin.com/)
2. Click "Create App"
3. Fill in:
   - **App name**: `Bluehawana Portfolio Sync`
   - **LinkedIn Page**: Your personal LinkedIn page
   - **Privacy policy URL**: `https://bluehawana.github.io/privacy`
   - **App logo**: Upload any image

### Step 2: Request API Products
1. In your app, go to "Products" tab
2. Request: **"Share on LinkedIn"** (this gives access to your posts)
3. Wait for approval (usually instant for personal use)

### Step 3: Get Access Token
1. Go to "Auth" tab in your app
2. Copy your **Client ID** and **Client Secret**
3. Use this URL (replace CLIENT_ID):

```
https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=https://oauth.pstmn.io/v1/callback&scope=openid%20profile%20email%20w_member_social
```

4. Open URL in browser, authorize the app
5. Copy the `code` from the callback URL
6. Exchange code for token using curl:

```bash
curl -X POST https://www.linkedin.com/oauth/v2/accessToken \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_CODE_HERE" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=https://oauth.pstmn.io/v1/callback"
```

## Method 3: Browser Developer Tools (Quick & Dirty)

1. Login to LinkedIn in your browser
2. Open Developer Tools (F12)
3. Go to Network tab
4. Navigate to your LinkedIn profile
5. Look for API calls to `api.linkedin.com`
6. Find the `Authorization: Bearer` header
7. Copy the token after "Bearer "

## Test Your Token

Once you have a token:

```bash
# Test the token
node test-token.js YOUR_TOKEN_HERE

# If it works, sync your posts
node sync-posts.js YOUR_TOKEN_HERE
```

## Expected Output

If successful, you should see:
- ✅ Connection test passed
- ✅ API endpoints accessible  
- ✅ Your posts retrieved (including AOSP15 post!)
- 📁 Posts saved to ../data/linkedin-posts.json

## Troubleshooting

### Token Invalid (401 error)
- Token expired or malformed
- Get a fresh token using Method 2

### Insufficient Permissions (403 error)  
- Need `w_member_social` scope
- Re-authorize with correct scopes

### No Posts Found
- LinkedIn API restrictions on personal posts
- Try Method 3 (browser token) for better access

## Next Steps

Once you have a working token:
1. Set it as environment variable: `LINKEDIN_ACCESS_TOKEN=your_token`
2. Run automated sync every few hours
3. Deploy to Heroku for 24/7 automation

The token approach is **much more reliable** than scraping and gives you **real activity IDs** for proper LinkedIn URLs!