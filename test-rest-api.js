#!/usr/bin/env node

/**
 * Test LinkedIn REST API with proper headers
 */

const https = require('https');

const ACCESS_TOKEN = 'REMOVED_SECRET';
const MEMBER_ID = 'IMcvTu6zhf';

function makeRestRequest(path, description, version = '202405') {
    return new Promise((resolve, reject) => {
        console.log(`\n🔍 Testing: ${description}`);
        console.log(`📡 Endpoint: ${path}`);
        console.log(`📋 Version: ${version}`);
        
        const options = {
            hostname: 'api.linkedin.com',
            path: path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'LinkedIn-Version': version,
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
                                console.log('📄 First item keys:', Object.keys(jsonData.elements[0]));
                            }
                        }
                        resolve(jsonData);
                    } catch (error) {
                        console.log('✅ Success (non-JSON)');
                        console.log('📄 Response:', data.substring(0, 300));
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

async function testRestAPI() {
    console.log('🧪 Testing LinkedIn REST API with proper headers');
    console.log(`👤 Member ID: ${MEMBER_ID}\n`);
    
    const versions = ['202405', '202309', '202212', '202208'];
    const endpoints = [
        '/rest/posts',
        `/rest/posts?author=urn:li:person:${MEMBER_ID}`,
        '/rest/ugcPosts',
        `/rest/ugcPosts?authors=List(urn:li:person:${MEMBER_ID})`,
        '/rest/shares',
        `/rest/shares?owners=List(urn:li:person:${MEMBER_ID})`,
        '/rest/socialActions',
        '/rest/activities'
    ];
    
    let successCount = 0;
    const workingEndpoints = [];
    
    // Test each endpoint with different versions
    for (const endpoint of endpoints) {
        for (const version of versions) {
            try {
                const result = await makeRestRequest(endpoint, `${endpoint} (v${version})`, version);
                successCount++;
                workingEndpoints.push({
                    endpoint,
                    version,
                    result
                });
                break; // If one version works, move to next endpoint
            } catch (error) {
                // Try next version
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    console.log(`\n📊 Test Summary:`);
    console.log(`✅ Successful: ${successCount}/${endpoints.length}`);
    
    if (workingEndpoints.length > 0) {
        console.log('\n🎉 Working REST endpoints found:');
        workingEndpoints.forEach(ep => {
            console.log(`✅ ${ep.endpoint} (v${ep.version})`);
        });
    } else {
        console.log('\n⚠️ No working REST endpoints found.');
        console.log('💡 This suggests the scopes may not include post access.');
        console.log('📋 Available scopes: openid, profile, r_events, w_member_social, email, rw_events');
        console.log('🔍 The w_member_social scope should allow post access, but may need different endpoints.');
    }
}

testRestAPI().catch(console.error);