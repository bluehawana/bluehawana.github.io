#!/usr/bin/env node

/**
 * Test w_member_social scope specifically
 * This scope allows access to posts and content creation
 */

const https = require('https');

const ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN || 'AQXaVmzjEmCown_3bbfd9y8K5bvw7R6jNPZ6c-7etLwLQci7Dy4G7GeJIJXJ4q9kIPUfOn9Cnj-hegdcVS6b-vNh9erGyYgNW3xydvA7jTg0EuDJWZzBjls8srw6HrZjWOYf0oNOgngJ3Xh43HDbibdI6wpL2psi-jxpaLD1IdFSX6Lw0inPXK4BY0e1r_fplXSvslzhUGg3IfcGjo24BMrmHghx7OS9oPnDrd_xjEiyoCnat2SdpebmqFt-mpabq-VDn0bura_RHV0MDv5PrWFkgeXLqW7QNVWOsIRce9pDhf682i6HV0g_PD4rFfF3G5f08XpmrEstneopmA_VHEbY0Y8TzA';

async function makeLinkedInRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: 'api.linkedin.com',
      path: endpoint,
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202401',
        ...options.headers
      }
    };

    console.log(`🔄 ${reqOptions.method} https://api.linkedin.com${endpoint}`);

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const result = {
          status: res.statusCode,
          headers: res.headers,
          data: data
        };
        
        try {
          result.data = JSON.parse(data);
        } catch (error) {
          // Keep as string if not JSON
        }
        
        resolve(result);
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testWMemberSocialScope() {
  console.log('🚀 Testing w_member_social Scope');
  console.log('='.repeat(50));
  console.log(`Access Token: ${ACCESS_TOKEN.substring(0, 20)}...`);
  console.log('='.repeat(50));

  // First, let's get basic user info to establish the profile ID
  console.log('\n1️⃣ Getting User Profile Info');
  try {
    const userInfo = await makeLinkedInRequest('/v2/userinfo');
    if (userInfo.status === 200) {
      console.log('✅ User Info:', userInfo.data);
      console.log(`👤 LinkedIn ID: ${userInfo.data.sub}`);
    }
  } catch (error) {
    console.error('❌ User info failed:', error.message);
  }

  // Test different approaches to get posts
  const testCases = [
    {
      name: 'Test 1: Direct Posts API with person URN',
      endpoint: '/v2/posts?author=urn:li:person:IMcvTu6zhf&count=5'
    },
    {
      name: 'Test 2: Posts with query parameter',
      endpoint: '/v2/posts?q=authors&authors=urn:li:person:IMcvTu6zhf&count=5'
    },
    {
      name: 'Test 3: UGC Posts API',
      endpoint: '/v2/ugcPosts?q=authors&authors=urn:li:person:IMcvTu6zhf&count=5'
    },
    {
      name: 'Test 4: Shares API (Legacy)',
      endpoint: '/v2/shares?q=owners&owners=urn:li:person:IMcvTu6zhf&count=5'
    },
    {
      name: 'Test 5: Posts API with different syntax',
      endpoint: '/v2/posts?q=author&author=urn:li:person:IMcvTu6zhf'
    },
    {
      name: 'Test 6: Social Actions API',
      endpoint: '/v2/socialActions/urn:li:person:IMcvTu6zhf'
    }
  ];

  for (const test of testCases) {
    console.log(`\n${test.name}`);
    console.log('-'.repeat(40));
    
    try {
      const result = await makeLinkedInRequest(test.endpoint);
      
      console.log(`📊 Status: ${result.status}`);
      
      if (result.status === 200) {
        console.log('✅ SUCCESS!');
        
        if (typeof result.data === 'object' && result.data.elements) {
          console.log(`📄 Found ${result.data.elements.length} items`);
          
          if (result.data.elements.length > 0) {
            const firstItem = result.data.elements[0];
            console.log('📝 First item preview:');
            console.log(JSON.stringify(firstItem, null, 2).substring(0, 500) + '...');
          }
        } else {
          console.log('📄 Response:', typeof result.data === 'string' ? 
            result.data.substring(0, 200) + '...' : 
            JSON.stringify(result.data, null, 2).substring(0, 500) + '...'
          );
        }
      } else if (result.status === 401) {
        console.log('❌ UNAUTHORIZED - Token expired or invalid');
      } else if (result.status === 403) {
        console.log('🔒 FORBIDDEN - Missing w_member_social scope or insufficient permissions');
      } else if (result.status === 400) {
        console.log('⚠️ BAD REQUEST - Invalid parameters');
        if (result.data && result.data.message) {
          console.log(`   Error: ${result.data.message}`);
        }
      } else {
        console.log(`⚠️ HTTP ${result.status}`);
        if (result.data) {
          console.log('📄 Error:', typeof result.data === 'string' ? 
            result.data.substring(0, 200) : 
            JSON.stringify(result.data, null, 2)
          );
        }
      }
    } catch (error) {
      console.log(`💥 ERROR: ${error.message}`);
    }
  }

  console.log('\n🎯 Summary & Recommendations');
  console.log('='.repeat(50));
  console.log('If any of the above tests returned status 200 with posts data,');
  console.log('then your w_member_social scope is working correctly!');
  console.log('\nNext steps:');
  console.log('1. Use the working endpoint format in your sync script');
  console.log('2. Set up automated syncing with the successful API call');
  console.log('3. Add error handling and retry logic');
}

if (require.main === module) {
  testWMemberSocialScope().catch(console.error);
}

module.exports = { testWMemberSocialScope, makeLinkedInRequest };