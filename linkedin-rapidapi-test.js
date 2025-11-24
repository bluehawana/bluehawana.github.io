#!/usr/bin/env node

/**
 * LinkedIn RapidAPI Test
 * Test the RapidAPI LinkedIn service to see if it can access posts
 */

const https = require('https');

const RAPIDAPI_KEY = '82ecb2468bmsh3c25b2ce3d4fd9bp153400jsn56283a8d38c6';
const RAPIDAPI_HOST = 'linkedin-jobs-data-api.p.rapidapi.com';

class LinkedInRapidAPITest {
    constructor() {
        this.apiKey = RAPIDAPI_KEY;
        this.host = RAPIDAPI_HOST;
    }

    /**
     * Make RapidAPI request
     */
    async makeRapidAPIRequest(endpoint, description) {
        return new Promise((resolve, reject) => {
            console.log(`\n🔍 Testing: ${description}`);
            console.log(`📡 Endpoint: ${endpoint}`);
            
            const options = {
                hostname: this.host,
                path: endpoint,
                method: 'GET',
                headers: {
                    'x-rapidapi-host': this.host,
                    'x-rapidapi-key': this.apiKey,
                    'Content-Type': 'application/json'
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
                            if (jsonData.data) {
                                console.log(`📊 Data items: ${Array.isArray(jsonData.data) ? jsonData.data.length : 'Not array'}`);
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

            req.on('error', (error) => {
                console.log(`❌ Request failed: ${error.message}`);
                reject(error);
            });

            req.setTimeout(15000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    /**
     * Test different LinkedIn API endpoints
     */
    async testLinkedInEndpoints() {
        console.log('🧪 Testing LinkedIn RapidAPI Service');
        console.log(`🔑 API Key: ${this.apiKey.substring(0, 10)}...`);
        console.log(`🌐 Host: ${this.host}\n`);
        
        const endpoints = [
            // Test the companies endpoint first (we know this works)
            {
                path: '/companies/search?keyword=software&page_number=1',
                description: 'Companies Search (Test Endpoint)'
            },
            
            // Try to find profile/posts endpoints
            {
                path: '/profiles/search?keyword=hzl&page_number=1',
                description: 'Profile Search'
            },
            {
                path: '/profiles/hzl',
                description: 'Direct Profile Access'
            },
            {
                path: '/posts/search?keyword=hzl&page_number=1',
                description: 'Posts Search'
            },
            {
                path: '/posts/user/hzl',
                description: 'User Posts'
            },
            {
                path: '/activities/hzl',
                description: 'User Activities'
            },
            {
                path: '/feed/hzl',
                description: 'User Feed'
            },
            
            // Try different variations
            {
                path: '/users/hzl/posts',
                description: 'User Posts Alternative'
            },
            {
                path: '/profile/hzl/activities',
                description: 'Profile Activities'
            },
            {
                path: '/social/posts?user=hzl',
                description: 'Social Posts'
            }
        ];
        
        let successCount = 0;
        const workingEndpoints = [];
        
        for (const endpoint of endpoints) {
            try {
                const result = await this.makeRapidAPIRequest(endpoint.path, endpoint.description);
                successCount++;
                workingEndpoints.push({
                    ...endpoint,
                    result: result
                });
            } catch (error) {
                // Continue with next test
            }
            
            // Wait between requests to be respectful
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log(`\n📊 Test Summary:`);
        console.log(`✅ Successful: ${successCount}/${endpoints.length}`);
        console.log(`❌ Failed: ${endpoints.length - successCount}/${endpoints.length}`);
        
        if (workingEndpoints.length > 0) {
            console.log('\n🎉 Working endpoints:');
            workingEndpoints.forEach(ep => {
                console.log(`✅ ${ep.description}: ${ep.path}`);
                if (ep.result && ep.result.data && Array.isArray(ep.result.data)) {
                    console.log(`   📊 Contains ${ep.result.data.length} items`);
                    if (ep.result.data.length > 0) {
                        console.log(`   📝 First item keys:`, Object.keys(ep.result.data[0]));
                    }
                }
            });
            
            return workingEndpoints;
        } else {
            console.log('\n⚠️ No working endpoints found for posts/profiles.');
            console.log('💡 This API might be focused on jobs/companies only.');
            return [];
        }
    }

    /**
     * Test alternative RapidAPI LinkedIn services
     */
    async testAlternativeServices() {
        console.log('\n🔍 Testing Alternative RapidAPI Hosts...');
        
        const alternativeHosts = [
            'linkedin-data-api.p.rapidapi.com',
            'linkedin-profile-data.p.rapidapi.com',
            'linkedin-scraper.p.rapidapi.com',
            'linkedin-posts-api.p.rapidapi.com',
            'social-media-scraper.p.rapidapi.com'
        ];
        
        for (const host of alternativeHosts) {
            try {
                console.log(`\n🌐 Testing host: ${host}`);
                
                const result = await new Promise((resolve, reject) => {
                    const options = {
                        hostname: host,
                        path: '/profile/hzl',
                        method: 'GET',
                        headers: {
                            'x-rapidapi-host': host,
                            'x-rapidapi-key': this.apiKey,
                            'Content-Type': 'application/json'
                        }
                    };

                    const req = https.request(options, (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            if (res.statusCode < 500) {
                                console.log(`✅ ${host} responded (${res.statusCode})`);
                                resolve({ host, status: res.statusCode, data });
                            } else {
                                reject(new Error(`${res.statusCode}`));
                            }
                        });
                    });

                    req.on('error', reject);
                    req.setTimeout(10000, () => {
                        req.destroy();
                        reject(new Error('Timeout'));
                    });
                    req.end();
                });
                
            } catch (error) {
                console.log(`❌ ${host} failed: ${error.message}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

// Run the test
const tester = new LinkedInRapidAPITest();
tester.testLinkedInEndpoints().then(async (workingEndpoints) => {
    if (workingEndpoints.length === 0) {
        await tester.testAlternativeServices();
    }
    
    console.log('\n🎯 Conclusion:');
    if (workingEndpoints.length > 0) {
        console.log('✅ Found working LinkedIn API endpoints!');
        console.log('🚀 We can build automated post detection with this service.');
    } else {
        console.log('⚠️ This RapidAPI service appears to be jobs/companies focused.');
        console.log('💡 We may need to find a different LinkedIn posts API service.');
    }
}).catch(console.error);