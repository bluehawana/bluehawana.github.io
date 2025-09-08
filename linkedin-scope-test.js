#!/usr/bin/env node

/**
 * LinkedIn Scope and API Test
 * Test what your OAuth token can actually access
 */

const https = require('https');

const ACCESS_TOKEN = 'AQXAaMANteu-XQoVzKWDcARMLIkUOV6n92tstpvl9noU6niFW0PWud7eD6r5uUnGDHIIdiPMN4SNk3tVbmK-pQewkWkO5BZqd3KJUxVGMxav-qgivdROWMV-z_V97d1bgDI-PScFAsGk8Pun6XasiEhxARRhLbvuDvF92mea89aZgHrx-Vc-q8bOL-_8GgNbzkUeFX3sJQrmbKWbjhaZA2I0QYVeePmbIkJclfVD53GXIoTdkEbH19FSYu5Q2BM3AyIHhFLnpoIi_3xncAUDkFZtLwieDJ9cqaQJYVXD0b2Sk9Hm92aILKJDaS24yymZyvsnJfniVCAApYMk_Px8U96cYFEfmg';

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
                            if (jsonData.elements.length > 0) {
                                console.log('📝 First item keys:', Object.keys(jsonData.elements[0]));
                            }
                        }
                        resolve(jsonData);
                    } catch (error) {
                        console.log('✅ Success (non-JSON)');
                        console.log('📄 Response:', data.substring(0, 200));
                        resolve(data);
                    }
                } else {
                    console.log('❌ Failed');
                    console.log('📄 Error:', data.substring(0, 300));
                    reject(new Error(`${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function testLinkedInAPI() {
    console.log('🧪 Testing LinkedIn API Access and Scopes');
    console.log('🔑 Testing what your OAuth token can access...\n');
    
    const tests = [
        // Basic profile access
        {
            path: '/v2/userinfo',
            description: 'User Info (OAuth userinfo endpoint)'
        },
        {
            path: '/v2/people/~',
            description: 'Profile Info (people endpoint)'
        },
        
        // Try different post API formats
        {
            path: '/v2/posts',
            description: 'All Posts (no query)'
        },
        {
            path: '/v2/ugcPosts',
            description: 'UGC Posts (no query)'
        },
        {
            path: '/v2/shares',
            description: 'Shares (no query)'
        },
        
        // Try with different query formats
        {
            path: '/v2/posts?q=author&author=urn%3Ali%3Aperson%3AIMcvTu6zhf',
            description: 'Posts by Author (URL encoded)'
        },
        {
            path: '/v2/ugcPosts?q=authors&authors=List(urn%3Ali%3Aperson%3AIMcvTu6zhf)',
            description: 'UGC Posts by Authors (List format)'
        },
        
        // Try social actions
        {
            path: '/v2/socialActions',
            description: 'Social Actions'
        },
        {
            path: '/v2/socialActions?q=actor&actor=urn%3Ali%3Aperson%3AIMcvTu6zhf',
            description: 'Social Actions by Actor'
        },
        
        // Try organization endpoints (if you have company access)
        {
            path: '/v2/organizations',
            description: 'Organizations'
        },
        
        // Try newer REST API
        {
            path: '/rest/posts',
            description: 'REST API Posts'
        }
    ];
    
    let successCount = 0;
    const workingEndpoints = [];
    
    for (const test of tests) {
        try {
            const result = await makeRequest(test.path, test.description);
            successCount++;
            workingEndpoints.push({
                ...test,
                result: result
            });
        } catch (error) {
            // Continue with next test
        }
        
        // Wait between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    console.log(`\n📊 Test Summary:`);
    console.log(`✅ Successful: ${successCount}/${tests.length}`);
    console.log(`❌ Failed: ${tests.length - successCount}/${tests.length}`);
    
    if (workingEndpoints.length > 0) {
        console.log('\n🎉 Working endpoints:');
        workingEndpoints.forEach(ep => {
            console.log(`✅ ${ep.description}: ${ep.path}`);
            if (ep.result && ep.result.elements && ep.result.elements.length > 0) {
                console.log(`   📊 Contains ${ep.result.elements.length} items`);
            }
        });
        
        // Show detailed results for post endpoints
        const postEndpoints = workingEndpoints.filter(ep => 
            ep.path.includes('posts') || ep.path.includes('ugc') || ep.path.includes('shares')
        );
        
        if (postEndpoints.length > 0) {
            console.log('\n📝 Post Data Found:');
            postEndpoints.forEach(ep => {
                if (ep.result && ep.result.elements) {
                    console.log(`\n🔍 ${ep.description}:`);
                    ep.result.elements.forEach((item, index) => {
                        console.log(`   ${index + 1}. ID: ${item.id || 'No ID'}`);
                        if (item.text) console.log(`      Text: ${JSON.stringify(item.text).substring(0, 100)}...`);
                        if (item.commentary) console.log(`      Commentary: ${item.commentary.substring(0, 100)}...`);
                        if (item.created) console.log(`      Created: ${new Date(item.created.time).toISOString()}`);
                    });
                }
            });
        }
    } else {
        console.log('\n⚠️ No working post endpoints found.');
        console.log('💡 Your OAuth token has limited scopes for reading posts.');
        console.log('🔧 Possible solutions:');
        console.log('   1. Request additional scopes from LinkedIn app settings');
        console.log('   2. Use LinkedIn RSS feed as fallback');
        console.log('   3. Use manual post input for immediate sync');
    }
}

testLinkedInAPI().catch(console.error);