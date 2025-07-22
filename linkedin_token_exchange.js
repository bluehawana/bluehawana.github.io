#!/usr/bin/env node

/**
 * LinkedIn OAuth Token Exchange Script
 * 
 * This script helps you get a LinkedIn access token by:
 * 1. Generating the authorization URL
 * 2. Exchanging authorization code for access token
 * 3. Testing the token with LinkedIn API
 * 
 * Usage:
 *   node linkedin-token-exchange.js
 */

const https = require('https');
const { URL, URLSearchParams } = require('url');
const readline = require('readline');

// LinkedIn OAuth Configuration
const CONFIG = {
    CLIENT_ID: '77duha47hcbh8o',
    CLIENT_SECRET: 'WPL_AP1.KCsCGIG1HHXfY8LV.1OEJWQ==',
    REDIRECT_URI: 'https://oauth.pstmn.io/v1/callback',
    SCOPE: 'r_liteprofile r_emailaddress w_member_social'
};

// Colors for terminal output
const colors = {
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

// Helper function to make HTTPS requests
function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (error) => reject(error));
        
        if (postData) {
            req.write(postData);
        }
        
        req.end();
    });
}

// Generate state parameter for security
function generateState() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Generate LinkedIn authorization URL
function generateAuthURL() {
    const state = generateState();
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: CONFIG.CLIENT_ID,
        redirect_uri: CONFIG.REDIRECT_URI,
        scope: CONFIG.SCOPE,
        state: state
    });

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
    
    console.log(`${colors.cyan}=================================================`);
    console.log(`🔗 LinkedIn OAuth Authorization`);
    console.log(`=================================================`);
    console.log(`${colors.yellow}1. Open this URL in your browser:`);
    console.log(`${colors.blue}${authUrl}`);
    console.log(`${colors.yellow}2. Authorize the application`);
    console.log(`${colors.yellow}3. Copy the 'code' parameter from the callback URL${colors.reset}`);
    console.log();
    
    return { authUrl, state };
}

// Exchange authorization code for access token
async function exchangeCodeForToken(authCode) {
    console.log(`${colors.cyan}🔄 Exchanging authorization code for access token...${colors.reset}`);
    
    const postData = new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        client_id: CONFIG.CLIENT_ID,
        client_secret: CONFIG.CLIENT_SECRET,
        redirect_uri: CONFIG.REDIRECT_URI
    }).toString();

    const options = {
        hostname: 'www.linkedin.com',
        path: '/oauth/v2/accessToken',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    try {
        const response = await makeRequest(options, postData);
        
        if (response.status === 200) {
            console.log(`${colors.green}✅ Success! Access token retrieved${colors.reset}`);
            console.log(`${colors.cyan}=================================================`);
            console.log(`Access Token Response:`);
            console.log(`=================================================`);
            console.log(JSON.stringify(response.data, null, 2));
            console.log(`${colors.cyan}=================================================`);
            console.log(`${colors.yellow}💾 Store this access token securely!${colors.reset}`);
            console.log();
            
            return response.data.access_token;
        } else {
            console.error(`${colors.red}❌ Error: ${response.status}${colors.reset}`);
            console.error(response.data);
            return null;
        }
    } catch (error) {
        console.error(`${colors.red}❌ Request failed:${colors.reset}`, error.message);
        return null;
    }
}

// Test access token with LinkedIn API
async function testAccessToken(accessToken) {
    console.log(`${colors.cyan}🧪 Testing access token with LinkedIn API...${colors.reset}`);
    
    const options = {
        hostname: 'api.linkedin.com',
        path: '/v2/people/~',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
        }
    };

    try {
        const response = await makeRequest(options);
        
        if (response.status === 200) {
            console.log(`${colors.green}✅ Token test successful!${colors.reset}`);
            console.log(`${colors.cyan}=================================================`);
            console.log(`Profile Information:`);
            console.log(`=================================================`);
            console.log(JSON.stringify(response.data, null, 2));
            console.log(`${colors.cyan}=================================================${colors.reset}`);
        } else {
            console.error(`${colors.red}❌ Token test failed: ${response.status}${colors.reset}`);
            console.error(response.data);
        }
    } catch (error) {
        console.error(`${colors.red}❌ Test request failed:${colors.reset}`, error.message);
    }
}

// Create readline interface for user input
function createReadlineInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

// Main function
async function main() {
    console.log(`${colors.green}🚀 LinkedIn OAuth Access Token Generator${colors.reset}`);
    console.log();
    
    // Step 1: Generate authorization URL
    const { authUrl, state } = generateAuthURL();
    
    // Step 2: Get authorization code from user
    const rl = createReadlineInterface();
    
    const authCode = await new Promise((resolve) => {
        rl.question(`${colors.yellow}Enter the authorization code: ${colors.reset}`, (answer) => {
            resolve(answer.trim());
        });
    });
    
    if (!authCode) {
        console.log(`${colors.red}❌ No authorization code provided. Exiting.${colors.reset}`);
        rl.close();
        return;
    }
    
    // Step 3: Exchange code for token
    const accessToken = await exchangeCodeForToken(authCode);
    
    if (accessToken) {
        // Step 4: Test the token
        const testToken = await new Promise((resolve) => {
            rl.question(`${colors.yellow}Test the access token? (y/n): ${colors.reset}`, (answer) => {
                resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
            });
        });
        
        if (testToken) {
            await testAccessToken(accessToken);
        }
        
        console.log();
        console.log(`${colors.green}🎉 Token generation complete!${colors.reset}`);
        console.log(`${colors.yellow}💡 You can now use this access token in your LinkedIn API calls.${colors.reset}`);
        console.log(`${colors.yellow}📝 Add it to your environment variables or configuration file.${colors.reset}`);
    }
    
    rl.close();
}

// Handle command line execution
if (require.main === module) {
    main().catch((error) => {
        console.error(`${colors.red}❌ Unexpected error:${colors.reset}`, error);
        process.exit(1);
    });
}

module.exports = {
    generateAuthURL,
    exchangeCodeForToken,
    testAccessToken,
    CONFIG
};