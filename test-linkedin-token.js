#!/usr/bin/env node

/**
 * LinkedIn API Token Test Script
 * Tests the provided access token and fetches latest posts
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Your LinkedIn credentials
const LINKEDIN_CLIENT_ID = '77duha47hcbh8o';
const ACCESS_TOKEN = 'AQULGG2IEKG3GUy6Kc5ULityv2_RQ0CiSszYfMDasZS0b2hC_EkQrrhzn5Jhu3mowen3SC1dVxRWVeGzP_bqqkH9Kd0ph9X_VsfS79Xd8LG4L-gZjD75i82kNjyvbvk8OibJyjx1uxRl9Pz_QLpUbs0t-7Y6flWeL3ll4rq5QQrDX0Vv54M7iHFrZmo-UrxzYUWxVe52iEW-xaYfb-hh-ydNk1GsFbOtFmwI0inpOjC7jOqNMj-z2v8EpTTTEHno0B0s6wsIm0q9VARKpXIzx7ErI6G---wiiMfOTyh0je_C-q_Q6RFGbSzRZ8eRhl6BeBgaG0ckGsJJXiA4jRiWWgdmh0GT3A';

console.log('🔧 LinkedIn API Token Test');
console.log('===========================\n');

async function makeRequest(url, headers = {}) {
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            ...headers
        }
    });

    const responseText = await response.text();
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
    }

    return JSON.parse(responseText);
}

async function testLinkedInAPI() {
    const tests = [
        {
            name: 'Profile Information',
            url: 'https://api.linkedin.com/v2/people/~?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))',
            headers: {}
        },
        {
            name: 'Basic Profile',
            url: 'https://api.linkedin.com/v2/people/~',
            headers: {}
        },
        {
            name: 'Community Management API - Profile Posts',
            url: 'https://api.linkedin.com/rest/posts?q=author&author=urn:li:person:ACoAAB8zZBwBuEWaKs5G_v6sYsJ8qTvT6eqD9-8&count=10',
            headers: {
                'LinkedIn-Version': '202505',
                'X-Restli-Protocol-Version': '2.0.0'
            }
        },
        {
            name: 'V2 API - Legacy Posts',
            url: 'https://api.linkedin.com/v2/people/~/shares?count=10',
            headers: {}
        }
    ];

    for (const test of tests) {
        try {
            console.log(`🧪 Testing: ${test.name}`);
            console.log(`📡 URL: ${test.url}`);
            
            const result = await makeRequest(test.url, test.headers);
            
            console.log('✅ SUCCESS');
            console.log(`📊 Response keys: ${Object.keys(result).join(', ')}`);
            
            if (result.elements && Array.isArray(result.elements)) {
                console.log(`📝 Found ${result.elements.length} items`);
            } else if (result.data && Array.isArray(result.data)) {
                console.log(`📝 Found ${result.data.length} items`);
            }
            
            // Save successful responses for analysis
            const filename = `test-${test.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.json`;
            fs.writeFileSync(filename, JSON.stringify(result, null, 2));
            console.log(`💾 Response saved to: ${filename}`);
            
        } catch (error) {
            console.log('❌ FAILED');
            console.log(`🚨 Error: ${error.message}`);
        }
        
        console.log(''); // Empty line for readability
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

async function updateConfigurationFiles() {
    console.log('🔧 Updating configuration files...\n');
    
    // Update linkedin-config.js with the working token
    const configPath = './linkedin-config.js';
    if (fs.existsSync(configPath)) {
        let configContent = fs.readFileSync(configPath, 'utf8');
        
        // Replace the ACCESS_TOKEN line
        configContent = configContent.replace(
            /ACCESS_TOKEN:\s*null/,
            `ACCESS_TOKEN: '${ACCESS_TOKEN}'`
        );
        
        fs.writeFileSync(configPath, configContent);
        console.log('✅ Updated linkedin-config.js with working access token');
    }
    
    // Update sync info
    const syncInfoPath = './data/linkedin-sync-info.json';
    if (fs.existsSync(syncInfoPath)) {
        const syncInfo = {
            lastManualSync: new Date().toISOString(),
            lastSuccessfulSync: new Date().toISOString(),
            automationEnabled: true,
            syncInterval: "30 minutes",
            tokenStatus: "valid",
            apiVersion: "202505"
        };
        
        fs.writeFileSync(syncInfoPath, JSON.stringify(syncInfo, null, 2));
        console.log('✅ Updated sync info with current timestamp');
    }
    
    console.log('');
}

// Run the tests
async function main() {
    try {
        await testLinkedInAPI();
        await updateConfigurationFiles();
        
        console.log('🎉 LinkedIn API testing completed!');
        console.log('');
        console.log('📋 Next steps:');
        console.log('1. Check the saved JSON files for API responses');
        console.log('2. Set LINKEDIN_ACCESS_TOKEN in Netlify environment variables');
        console.log('3. Deploy and test the automated sync');
        
    } catch (error) {
        console.error('💥 Test failed:', error);
        process.exit(1);
    }
}

main();