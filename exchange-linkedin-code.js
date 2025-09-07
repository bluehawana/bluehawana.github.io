#!/usr/bin/env node

/**
 * Exchange LinkedIn Authorization Code for Access Token
 */

const https = require('https');
const querystring = require('querystring');

// Get the authorization code from command line or environment
const authCode = process.argv[2] || process.env.LINKEDIN_AUTH_CODE;
const clientId = process.env.LINKEDIN_CLIENT_ID || '77eab2x2hlg9e6';
const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || 'your-client-secret';

if (!authCode) {
  console.log('❌ No authorization code provided!');
  console.log('Usage: node exchange-linkedin-code.js YOUR_AUTH_CODE');
  console.log('Or set LINKEDIN_AUTH_CODE environment variable');
  process.exit(1);
}

if (!clientSecret || clientSecret === 'your-client-secret') {
  console.log('❌ LINKEDIN_CLIENT_SECRET not set!');
  console.log('Please set your LinkedIn client secret in environment variables');
  process.exit(1);
}

// Token exchange parameters
const tokenParams = {
  grant_type: 'authorization_code',
  code: authCode,
  redirect_uri: 'https://bluehawana.netlify.app/oauth/linkedin/callback',
  client_id: clientId,
  client_secret: clientSecret
};

const postData = querystring.stringify(tokenParams);

const options = {
  hostname: 'www.linkedin.com',
  path: '/oauth/v2/accessToken',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🔄 Exchanging authorization code for access token...');
console.log(`📋 Client ID: ${clientId}`);
console.log(`🔑 Auth Code: ${authCode.substring(0, 20)}...`);

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`\n📊 Response Status: ${res.statusCode}`);
    
    try {
      const response = JSON.parse(data);
      
      if (res.statusCode === 200) {
        console.log('✅ SUCCESS! Access token obtained\n');
        console.log('🔑 Access Token:', response.access_token);
        console.log('⏱️  Expires in:', response.expires_in, 'seconds');
        
        if (response.refresh_token) {
          console.log('🔄 Refresh Token:', response.refresh_token);
        }
        
        console.log('\n📝 Next Steps:');
        console.log('1. Set this in your environment:');
        console.log(`   export LINKEDIN_ACCESS_TOKEN="${response.access_token}"`);
        console.log('\n2. Update Netlify environment variable:');
        console.log('   - Go to Netlify Dashboard > Site Settings > Environment Variables');
        console.log('   - Update LINKEDIN_ACCESS_TOKEN with the token above');
        console.log('\n3. Test the token:');
        console.log('   node test-linkedin-api.js test');
        
      } else {
        console.log('❌ ERROR:', response.error || 'Unknown error');
        console.log('📄 Details:', response.error_description || data);
        
        if (response.error === 'invalid_request') {
          console.log('\n💡 Common issues:');
          console.log('- Authorization code already used (codes are single-use)');
          console.log('- Incorrect redirect_uri (must match exactly)');
          console.log('- Code expired (valid for only a few minutes)');
        }
      }
      
    } catch (error) {
      console.log('❌ Failed to parse response:', error.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.write(postData);
req.end();