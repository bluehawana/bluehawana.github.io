#!/usr/bin/env node

/**
 * Test Posts Endpoints
 * Try different LinkedIn API endpoints to find posts
 */

const https = require('https');

const ACCESS_TOKEN = 'AQXAaMANteu-XQoVzKWDcARMLIkUOV6n92tstpvl9noU6niFW0PWud7eD6r5uUnGDHIIdiPMN4SNk3tVbmK-pQewkWkO5BZqd3KJUxVGMxav-qgivdROWMV-z_V97d1bgDI-PScFAsGk8Pun6XasiEhxARRhLbvuDvF92mea89aZgHrx-Vc-q8bOL-_8GgNbzkUeFX3sJQrmbKWbjhaZA2I0QYVeePmbIkJclfVD53GXIoTdkEbH19FSYu5Q2BM3AyIHhFLnpoIi_3xncAUDkFZtLwieDJ9cqaQJYVXD0b2Sk9Hm92aILKJDaS24yymZyvsnJfniVCAApYMk_Px8U96cYFEfmg';
const MEMBER_ID = 'IMcvTu6zhf'; // From userinfo endpoint

function makeRequest(path, description) {
    return new Promise((resolve, reject) => {
        console.log(`\n🔍 Testing: ${description}`);
        console.log(`📡 Endpoint: ${path}`);
        
        const options = {
            hostname: 'api.linkedin.com',
            path: path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`📊 Status: ${res.statusCode}`);
                
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const jsonData = JSON.parse(data);
                        console.log('✅ Success!');
                        console.log('📄 Response keys:', Object.keys(jsonData));
                        if (jsonData.elements) {
                            console.log(`📊 Found ${jsonData.elements.length} items`);
                        }
                        resolve(jsonData);
                    } catch (error) {
                        console.log('✅ Success (non-JSON)');
                        resolve(data);
                    }
                } else {
                    console.log('❌ Failed');
                    console.log('📄 Error:', data.substring(0, 200));
                    reject(new Error(`${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function testPostsEndpoints() {
    console.log('🧪 Testing LinkedIn Posts Endpoints');
    console.log(`👤 Member ID: ${MEMBER_ID}\n`);
    
    const endpoints = [
        // Social Media Posts (w_member_social scope)
        {
            path: '/v2/posts',
            description: 'All Posts'
        },
        {
            path: `/v2/posts?author=urn:li:person:${MEMBER_ID}`,
            description: 'Posts by Author URN'
        },
        {
            path: `/v2/posts?q=author&author=urn:li:person:${MEMBER_ID}`,
            description: 'Posts Query by Author'
        },
        
        // UGC Posts (User Generated Content)
        {
            path: '/v2/ugcPosts',
            description: 'UGC Posts'
        },
        {
            path: `/v2/ugcPosts?q=authors&authors=urn:li:person:${MEMBER_ID}`,
            description: 'UGC Posts by Author'
        },
        
        // Activities
        {
            path: '/v2/activities',
            description: 'Activities'
        },
        {
            path: `/v2/activities?q=actor&actor=urn:li:person:${MEMBER_ID}`,
            description: 'Activities by Actor'
        },
        
        // Social Actions
        {
            path: '/v2/socialActions',
            description: 'Social Actions'
        },
        {
            path: `/v2/socialActions?q=actor&actor=urn:li:person:${MEMBER_ID}`,
            description: 'Social Actions by Actor'
        },
        
        // Events (r_events scope)
        {
            path: '/v2/events',
            description: 'Events'
        },
        
        // Try REST API endpoints
        {
            path: '/rest/posts',
            description: 'REST Posts'
        },
        {
            path: `/rest/posts?author=urn:li:person:${MEMBER_ID}`,
            description: 'REST Posts by Author'
        }
    ];
    
    let successCount = 0;
    const workingEndpoints = [];
    
    for (const endpoint of endpoints) {
        try {
            const result = await makeRequest(endpoint.path, endpoint.description);
            successCount++;
            workingEndpoints.push({
                ...endpoint,
                result: result
            });
        } catch (error) {
            // Continue with next test
        }
        
        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n📊 Test Summary:`);
    console.log(`✅ Successful: ${successCount}/${endpoints.length}`);
    console.log(`❌ Failed: ${endpoints.length - successCount}/${endpoints.length}`);
    
    if (workingEndpoints.length > 0) {
        console.log('\n🎉 Working endpoints found:');
        workingEndpoints.forEach(ep => {
            console.log(`✅ ${ep.description}: ${ep.path}`);
        });
    } else {
        console.log('\n⚠️ No working post endpoints found with current scopes.');
        console.log('💡 Your token may need additional scopes for accessing posts.');
    }
}

testPostsEndpoints().catch(console.error);