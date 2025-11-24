/**
 * LinkedIn OAuth 2.0 Callback Handler
 * Handles the authorization code exchange and token storage
 */

const https = require('https');
const querystring = require('querystring');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { code, state, error, error_description } = event.queryStringParameters || {};

    if (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: error,
          description: error_description || 'OAuth authorization failed'
        })
      };
    }

    if (!code) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'missing_code',
          description: 'Authorization code is required'
        })
      };
    }

    // Exchange authorization code for access token
    const tokenData = await exchangeCodeForToken(code);

    if (!tokenData.access_token) {
      throw new Error('Failed to obtain access token');
    }

    // Store the token securely (in a real app, you'd save this to a database)
    const userProfile = await getUserProfile(tokenData.access_token);

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'text/html'
      },
      body: generateSuccessPage(tokenData, userProfile)
    };

  } catch (error) {
    console.error('OAuth callback error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'oauth_error',
        description: error.message
      })
    };
  }
};

async function exchangeCodeForToken(authCode) {
  const tokenParams = {
    grant_type: 'authorization_code',
    code: authCode,
    redirect_uri: 'https://bluehawana.netlify.app/oauth/linkedin/callback',
    client_id: process.env.LINKEDIN_CLIENT_ID,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET
  };

  const postData = querystring.stringify(tokenParams);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.linkedin.com',
      path: '/oauth/v2/accessToken',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve(response);
          } else {
            reject(new Error(response.error_description || response.error || 'Token exchange failed'));
          }
        } catch (error) {
          reject(new Error('Invalid response from LinkedIn'));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function getUserProfile(accessToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.linkedin.com',
      path: '/v2/userinfo',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const profile = JSON.parse(data);
          resolve(profile);
        } catch (error) {
          resolve({ name: 'Unknown User' });
        }
      });
    });

    req.on('error', () => resolve({ name: 'Unknown User' }));
    req.end();
  });
}

function generateSuccessPage(tokenData, userProfile) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>LinkedIn OAuth Success</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px; margin: 50px auto; padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; min-height: 100vh;
        }
        .container { 
            background: rgba(255,255,255,0.95); color: #333;
            padding: 40px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
        .token { background: #f8f9fa; padding: 15px; border-radius: 8px; word-break: break-all; }
        .steps { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .copy-btn { 
            background: #007bff; color: white; border: none; padding: 10px 20px;
            border-radius: 5px; cursor: pointer; margin: 10px 0;
        }
        .copy-btn:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="container">
        <div class="success">✅ LinkedIn OAuth Success!</div>
        
        <h2>Welcome, ${userProfile.name || 'LinkedIn User'}!</h2>
        
        <h3>Access Token Obtained</h3>
        <div class="token" id="accessToken">${tokenData.access_token}</div>
        <button class="copy-btn" onclick="copyToken()">📋 Copy Token</button>
        
        <div class="steps">
            <h3>Next Steps:</h3>
            <ol>
                <li><strong>Set Environment Variable:</strong>
                    <br>Add this to your Netlify environment variables:
                    <br><code>LINKEDIN_ACCESS_TOKEN = ${tokenData.access_token}</code>
                </li>
                <li><strong>Test the Integration:</strong>
                    <br>Your LinkedIn post syncing should now work automatically!
                </li>
                <li><strong>Token Expires:</strong>
                    <br>This token expires in ${Math.floor((tokenData.expires_in || 5184000) / 86400)} days
                </li>
            </ol>
        </div>
        
        <p><strong>Security Note:</strong> This token provides access to your LinkedIn data. 
           Keep it secure and only use it for authorized applications.</p>
        
        <div style="margin-top: 30px; text-align: center;">
            <a href="/" style="color: #007bff; text-decoration: none;">← Back to Website</a>
        </div>
    </div>
    
    <script>
        function copyToken() {
            const tokenElement = document.getElementById('accessToken');
            const token = tokenElement.textContent;
            navigator.clipboard.writeText(token).then(() => {
                const btn = document.querySelector('.copy-btn');
                btn.textContent = '✅ Copied!';
                btn.style.background = '#28a745';
                setTimeout(() => {
                    btn.textContent = '📋 Copy Token';
                    btn.style.background = '#007bff';
                }, 2000);
            });
        }
        
        // Auto-expire this page after 10 minutes for security
        setTimeout(() => {
            document.body.innerHTML = '<div class="container"><h2>⚠️ Session Expired</h2><p>For security reasons, this page has been cleared. The token has been copied - please save it securely.</p></div>';
        }, 600000);
    </script>
</body>
</html>`;
}