#!/usr/bin/env node

/**
 * Test LinkedIn API based on official documentation
 * Testing endpoints that should work with w_member_social scope
 */

const https = require('https');

const ACCESS_TOKEN = 'AQXAaMANteu-XQoVzKWDcARMLIkUOV6n92tstpvl9noU6niFW0PWud7eD6r5uUnGDHIIdiPMN4SNk3tVbmK-pQewkWkO5BZqd3KJUxVGMxav-qgivdROWMV-z_V97d1bgDI-PScFAsGk8Pun6XasiEhxARRhLbvuDvF92mea89aZgHrx-Vc-q8bOL-_8GgNbzkUeFX3sJQrmbKWbjhaZA2I0QYVeePmbIkJclfVD53GXIoTdkEbH19FSYu5Q2BM3AyIHhFLnpoIi_3xncAUDkFZtLwieDJ9cqaQJYVXD0b2Sk9Hm92aILKJDaS24yymZyvsnJfniVCAApYMk_Px8U96cYFEfmg';
const MEMBER_ID = 'IMcvTu6zhf';

function makeRequest(path, description, headers = {}) {
    return new Promise((resolve, reject) => {
        console.log(`\n🔍 Testing: ${description}`);
        console.log(`📡 Endpoint: ${path}`);
        
        const defaultHeaders = {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
        };
        
        const options = {
            hostname: 'api.linkedin.com',
            path: path,
            method: 'GET',
            headers: { ...defaultHeaders, ...headers }
        };

        console.log('📋 Headers:', JSON.stringify(options.headers, null, 2));

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`📊 Status: ${res.statusCode}`);
                
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const jsonData = JSON.parse(data);
                        console.log('✅ Success!');
                        console.log('📄 Response structure:', JSON.stringify(jsonData, null, 2).substring(0, 500) + '...');
                        resolve(jsonData);
                    } catch (error) {
                        console.log('✅ Success (non-JSON)');
                        console.log('📄 Response:', data.substring(0, 300));
                        resolve(data);
                    }
                } else {
                    console.log('❌ Failed');
                    console.log('📄 Error:', data);
                    reject(new Error(`${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function testLinkedInAPIDocs() {
    console.log('🧪 Testing LinkedIn API based on official documentation');
    console.log(`👤 Member ID: ${MEMBER_ID}`);
    console.log('🔑 Scopes: openid, profile, r_events, w_member_social, email, rw_events\n');
    
    const tests = [
        // Test 1: UGC Posts (User Generated Content) - This is the modern way
        {
            path: '/v2/ugcPosts?q=authors&authors=List(urn:li:person:' + MEMBER_ID + ')&sortBy=CREATED_TIME&count=10',
            description: 'UGC Posts by Author (Modern API)',
            headers: {}
        },
        
        // Test 2: Shares API (Legacy but might still work)
        {
            path: '/v2/shares?q=owners&owners=List(urn:li:person:' + MEMBER_ID + ')&sortBy=CREATED_TIME&count=10',
            description: 'Shares by Owner (Legacy API)',
            headers: {}
        },
        
        // Test 3: REST API with LinkedIn-Version header
        {
            path: '/rest/posts?author=urn:li:person:' + MEMBER_ID + '&count=10',
            description: 'REST Posts API (Latest)',
            headers: { 'LinkedIn-Version': '202405' }
        },
        
        // Test 4: REST UGC Posts
        {
            path: '/rest/ugcPosts?authors=List(urn:li:person:' + MEMBER_ID + ')&count=10',
            description: 'REST UGC Posts API',
            headers: { 'LinkedIn-Version': '202405' }
        },
        
        // Test 5: Social Actions (for engagement data)
        {
            path: '/v2/socialActions?q=actor&actor=urn:li:person:' + MEMBER_ID + '&count=10',
            description: 'Social Actions by Actor',
            headers: {}
        },
        
        // Test 6: Activities
        {
            path: '/v2/activities?q=actor&actor=urn:li:person:' + MEMBER_ID + '&count=10',
            description: 'Activities by Actor',
            headers: {}
        },
        
        // Test 7: Try without List() wrapper
        {
            path: '/v2/ugcPosts?q=authors&authors=urn:li:person:' + MEMBER_ID + '&count=10',
            description: 'UGC Posts (without List wrapper)',
            headers: {}
        },
        
        // Test 8: Try with different version
        {
            path: '/rest/posts?author=urn:li:person:' + MEMBER_ID,
            description: 'REST Posts (v202309)',
            headers: { 'LinkedIn-Version': '202309' }
        }
    ];
    
    let successCount = 0;
    const workingEndpoints = [];
    
    for (const test of tests) {
        try {
            const result = await makeRequest(test.path, test.description, test.headers);
            successCount++;
            workingEndpoints.push({
                ...test,
                result: result
            });
        } catch (error) {
            // Continue with next test
        }
        
        // Wait between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n📊 Final Results:`);
    console.log(`✅ Successful: ${successCount}/${tests.length}`);
    
    if (workingEndpoints.length > 0) {
        console.log('\n🎉 Working endpoints found:');
        workingEndpoints.forEach((ep, index) => {
            console.log(`\n${index + 1}. ✅ ${ep.description}`);
            console.log(`   📡 ${ep.path}`);
            if (ep.headers && Object.keys(ep.headers).length > 0) {
                console.log(`   📋 Headers: ${JSON.stringify(ep.headers)}`);
            }
            if (ep.result && ep.result.elements) {
                console.log(`   📊 Found ${ep.result.elements.length} items`);
            }
        });
        
        console.log('\n🚀 Ready to update automation script with working endpoint!');
    } else {
        console.log('\n⚠️ No working endpoints found.');
        console.log('💡 Possible issues:');
        console.log('   - Token may need refresh');
        console.log('   - Scopes may not include post access');
        console.log('   - API endpoints may have changed');
        console.log('   - Member may not have any posts');
    }
}

testLinkedInAPIDocs().catch(console.error);