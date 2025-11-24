#!/usr/bin/env node

/**
 * Test the new LinkedIn tokens
 */

const https = require('https');

const ACCESS_TOKEN = 'REMOVED_SECRET';
const REFRESH_TOKEN = 'REMOVED_SECRET';

async function makeLinkedInRequest(endpoint, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.linkedin.com',
      path: endpoint,
      method: method,
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    };

    console.log(`🔄 Testing: ${method} https://api.linkedin.com${endpoint}`);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
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

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

async function runTokenTests() {
  console.log('🚀 Testing LinkedIn Access Token');
  console.log('=' * 50);
  console.log(`Access Token: ${ACCESS_TOKEN.substring(0, 20)}...`);
  console.log(`Refresh Token: ${REFRESH_TOKEN.substring(0, 20)}...`);
  console.log('=' * 50);

  const tests = [
    { name: 'User Info', endpoint: '/v2/userinfo' },
    { name: 'Profile (Me)', endpoint: '/v2/people/(id:~)' },
    { name: 'Email Addresses', endpoint: '/v2/emailAddress?q=members&projection=(elements*(handle~))' },
    { name: 'Posts (by Author)', endpoint: '/v2/posts?q=author&author=urn:li:person:~&count=10' },
    { name: 'UGC Posts', endpoint: '/v2/ugcPosts?q=authors&authors=List(urn:li:person:~)&count=10' },
    { name: 'Shares (Legacy)', endpoint: '/v2/shares?q=owners&owners=urn:li:person:~&count=10' }
  ];

  let userProfileId = null;

  for (const test of tests) {
    console.log(`\n🧪 Testing: ${test.name}`);
    
    try {
      const result = await makeLinkedInRequest(test.endpoint);
      
      console.log(`📊 Status: ${result.status}`);
      
      if (result.status === 200) {
        console.log('✅ SUCCESS');
        
        // Save profile ID for other tests
        if (test.name === 'Profile (Me)' && result.data.id) {
          userProfileId = result.data.id;
          console.log(`👤 Profile ID: ${userProfileId}`);
        }
        
        if (result.data.elements && Array.isArray(result.data.elements)) {
          console.log(`📄 Found ${result.data.elements.length} items`);
          
          // Show first item details for posts
          if (result.data.elements.length > 0 && (test.name.includes('Posts') || test.name.includes('Shares'))) {
            const firstPost = result.data.elements[0];
            console.log('📝 First post preview:');
            
            if (firstPost.commentary) {
              console.log(`   Content: ${firstPost.commentary.substring(0, 100)}...`);
            } else if (firstPost.text && firstPost.text.text) {
              console.log(`   Content: ${firstPost.text.text.substring(0, 100)}...`);
            } else if (firstPost.specificContent) {
              console.log(`   Content: [Complex post with media/links]`);
            }
            
            if (firstPost.createdAt) {
              console.log(`   Created: ${new Date(firstPost.createdAt).toLocaleString()}`);
            }
            
            if (firstPost.id) {
              console.log(`   Post ID: ${firstPost.id}`);
              console.log(`   LinkedIn URL: https://www.linkedin.com/feed/update/${firstPost.id}/`);
            }
          }
        } else {
          console.log(`📄 Response:`, JSON.stringify(result.data, null, 2));
        }
      } else if (result.status === 401) {
        console.log('❌ UNAUTHORIZED - Token may be expired');
      } else if (result.status === 403) {
        console.log('🔒 FORBIDDEN - Insufficient permissions');
        console.log('   Required scope: w_member_social');
      } else {
        console.log(`⚠️  HTTP ${result.status}`);
        console.log(`📄 Error:`, result.data);
      }
    } catch (error) {
      console.log(`💥 ERROR: ${error.message}`);
    }
    
    console.log('-' * 40);
  }

  // Test specific post fetching with profile ID
  if (userProfileId) {
    console.log(`\n🎯 Testing with specific Profile ID: ${userProfileId}`);
    
    const specificTests = [
      { 
        name: 'Posts with Profile ID', 
        endpoint: `/v2/posts?q=author&author=urn:li:person:${userProfileId}&count=5` 
      }
    ];

    for (const test of specificTests) {
      try {
        console.log(`\n🧪 ${test.name}`);
        const result = await makeLinkedInRequest(test.endpoint);
        
        if (result.status === 200 && result.data.elements) {
          console.log(`✅ Found ${result.data.elements.length} posts with specific profile ID`);
        } else {
          console.log(`❌ Status ${result.status}:`, result.data);
        }
      } catch (error) {
        console.log(`💥 ERROR: ${error.message}`);
      }
    }
  }

  console.log('\n🎉 Token testing completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Set LINKEDIN_ACCESS_TOKEN in Netlify environment variables');
  console.log('2. Set LINKEDIN_REFRESH_TOKEN in Netlify environment variables');
  console.log('3. Test the sync function: curl https://bluehawana.netlify.app/.netlify/functions/linkedin-posts-sync');
}

// Run the tests
if (require.main === module) {
  runTokenTests().catch(console.error);
}

module.exports = { ACCESS_TOKEN, REFRESH_TOKEN, makeLinkedInRequest };