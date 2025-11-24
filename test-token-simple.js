#!/usr/bin/env node

/**
 * Simple OAuth Token Test
 * Tests basic LinkedIn API access with your OAuth token
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
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`📊 Status: ${res.statusCode}`);
                console.log(`📋 Headers:`, JSON.stringify(res.headers, null, 2));
                
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const jsonData = JSON.parse(data);
                        console.log('✅ Success!');
                        console.log('📄 Response:', JSON.stringify(jsonData, null, 2));
                        resolve(jsonData);
                    } catch (error) {
                        console.log('✅ Success (non-JSON response)');
                        console.log('📄 Response:', data);
                        resolve(data);
                    }
                } else {
                    console.log('❌ Failed');
                    console.log('📄 Error response:', data);
                    reject(new Error(`${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            console.log('❌ Request failed:', error.message);
            reject(error);
        });

        req.end();
    });
}

async function testEndpoints() {
    console.log('🧪 LinkedIn OAuth Token Test');
    console.log('🔑 Testing access token...\n');
    
    const tests = [
        {
            path: '/v2/userinfo',
            description: 'User Info (OpenID)'
        },
        {
            path: '/v2/people/~',
            description: 'Current User Profile'
        },
        {
            path: '/v2/people/~:(id,firstName,lastName)',
            description: 'User Profile with Fields'
        },
        {
            path: '/v2/shares?q=owners&owners=urn:li:person:~&count=5',
            description: 'User Shares (Method 1)'
        },
        {
            path: '/v2/people/~/shares?count=5',
            description: 'User Shares (Method 2)'
        }
    ];
    
    let successCount = 0;
    
    for (const test of tests) {
        try {
            await makeRequest(test.path, test.description);
            successCount++;
        } catch (error) {
            // Continue with next test
        }
        
        // Wait a bit between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n📊 Test Summary:`);
    console.log(`✅ Successful: ${successCount}/${tests.length}`);
    console.log(`❌ Failed: ${tests.length - successCount}/${tests.length}`);
    
    if (successCount > 0) {
        console.log('\n🎉 OAuth token is working! At least some endpoints are accessible.');
    } else {
        console.log('\n⚠️ OAuth token may have issues. All endpoints failed.');
    }
}

testEndpoints().catch(console.error);