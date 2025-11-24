#!/usr/bin/env node

/**
 * LinkedIn API Testing Script
 * Based on Microsoft's LinkedIn API tutorial
 */

const https = require('https');

// Configuration
const config = {
  clientId: process.env.LINKEDIN_CLIENT_ID || 'your-client-id',
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET || 'your-client-secret',
  accessToken: process.env.LINKEDIN_ACCESS_TOKEN || 'your-access-token',
  baseUrl: 'https://api.linkedin.com/v2'
};

/**
 * Make authenticated request to LinkedIn API
 */
function makeLinkedInRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `${config.baseUrl}${endpoint}`;
    const urlObj = new URL(url);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        ...options.headers
      }
    };

    console.log(`🔄 Testing: ${requestOptions.method} ${url}`);
    console.log(`📋 Headers:`, JSON.stringify(requestOptions.headers, null, 2));

    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      console.log(`📊 Status: ${res.statusCode}`);
      console.log(`📋 Response Headers:`, JSON.stringify(res.headers, null, 2));

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

/**
 * Test suite for LinkedIn API
 */
async function runTests() {
  console.log('🚀 LinkedIn API Test Suite');
  console.log('=' * 50);
  console.log(`Client ID: ${config.clientId.substring(0, 8)}...`);
  console.log(`Access Token: ${config.accessToken ? config.accessToken.substring(0, 8) + '...' : 'NOT SET'}`);
  console.log('=' * 50);

  const tests = [
    {
      name: 'User Profile (userinfo)',
      endpoint: '/userinfo',
      description: 'Basic user profile information'
    },
    {
      name: 'Person Profile (people)',
      endpoint: '/people/(id:{person-id})',
      description: 'Detailed person profile (requires person ID)'
    },
    {
      name: 'UGC Posts',
      endpoint: '/ugcPosts?q=authors&authors=List(urn:li:person:{person-id})',
      description: 'User generated content posts'
    },
    {
      name: 'Posts API',
      endpoint: '/posts?q=author&author=urn:li:person:{person-id}',
      description: 'Posts API v2'
    },
    {
      name: 'Shares API', 
      endpoint: '/shares?q=owners&owners=urn:li:person:{person-id}',
      description: 'Legacy shares API'
    }
  ];

  for (const test of tests) {
    console.log(`\n🧪 Testing: ${test.name}`);
    console.log(`📖 ${test.description}`);
    
    try {
      const result = await makeLinkedInRequest(test.endpoint);
      
      if (result.status === 200) {
        console.log('✅ SUCCESS');
        console.log(`📄 Response:`, JSON.stringify(result.data, null, 2));
      } else if (result.status === 401) {
        console.log('❌ UNAUTHORIZED - Check access token');
        console.log(`📄 Error:`, JSON.stringify(result.data, null, 2));
      } else if (result.status === 403) {
        console.log('🔒 FORBIDDEN - Check scopes/permissions');
        console.log(`📄 Error:`, JSON.stringify(result.data, null, 2));
      } else {
        console.log(`⚠️  HTTP ${result.status}`);
        console.log(`📄 Response:`, JSON.stringify(result.data, null, 2));
      }
    } catch (error) {
      console.log(`💥 ERROR: ${error.message}`);
    }
    
    console.log('-' * 40);
  }

  // Test token introspection
  console.log('\n🔍 Token Introspection');
  try {
    const introspectResult = await makeLinkedInRequest('/introspectToken', {
      method: 'POST',
      body: {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        token: config.accessToken
      }
    });
    
    console.log('Token details:', JSON.stringify(introspectResult.data, null, 2));
  } catch (error) {
    console.log(`Token introspection failed: ${error.message}`);
  }
}

/**
 * Generate OAuth 2.0 authorization URL
 */
function generateAuthUrl() {
  const scopes = [
    'profile',
    'email', 
    'openid',
    'w_member_social'
  ].join(' ');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: 'https://bluehawana.netlify.app/oauth/linkedin/callback',
    state: 'linkedin-api-test-' + Date.now(),
    scope: scopes
  });

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  
  console.log('🔗 LinkedIn OAuth 2.0 Authorization URL:');
  console.log(authUrl);
  console.log('\n📋 Required Scopes:', scopes);
  console.log('🔄 Redirect URI: https://oauth.pstmn.io/v1/callback');
}

// Main execution
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'auth') {
    generateAuthUrl();
  } else if (command === 'test') {
    runTests().catch(console.error);
  } else {
    console.log('LinkedIn API Testing Tool');
    console.log('');
    console.log('Usage:');
    console.log('  node test-linkedin-api.js auth    # Generate OAuth URL');
    console.log('  node test-linkedin-api.js test    # Run API tests');
    console.log('');
    console.log('Environment Variables:');
    console.log('  LINKEDIN_CLIENT_ID');
    console.log('  LINKEDIN_CLIENT_SECRET'); 
    console.log('  LINKEDIN_ACCESS_TOKEN');
  }
}