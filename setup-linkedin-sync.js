#!/usr/bin/env node

/**
 * LinkedIn API Setup and Sync Repair Tool
 * 
 * This script helps diagnose and fix LinkedIn API sync issues
 * Run with: node setup-linkedin-sync.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 LinkedIn API Setup and Diagnostic Tool');
console.log('==========================================\n');

// Check if we're in the right directory
const currentDir = process.cwd();
const isCorrectDir = fs.existsSync(path.join(currentDir, 'netlify.toml'));

if (!isCorrectDir) {
    console.error('❌ Please run this script from your project root directory (where netlify.toml is located)');
    process.exit(1);
}

console.log('✅ Project directory detected');

// 1. Check configuration files
console.log('\n📋 CHECKING CONFIGURATION FILES');
console.log('================================');

const configFile = path.join(currentDir, 'linkedin-config.js');
const templateFile = path.join(currentDir, 'linkedin_config.js');
const netlifyConfig = path.join(currentDir, 'netlify.toml');

if (fs.existsSync(configFile)) {
    console.log('✅ linkedin-config.js exists');
} else if (fs.existsSync(templateFile)) {
    console.log('⚠️  Found template file, but need actual config');
} else {
    console.log('❌ No LinkedIn configuration file found');
}

if (fs.existsSync(netlifyConfig)) {
    console.log('✅ netlify.toml exists');
    
    // Check Netlify configuration
    const netlifyContent = fs.readFileSync(netlifyConfig, 'utf8');
    const hasClientId = netlifyContent.includes('LINKEDIN_CLIENT_ID');
    console.log(hasClientId ? '✅ Client ID configured in netlify.toml' : '❌ Client ID missing from netlify.toml');
} else {
    console.log('❌ netlify.toml not found');
}

// 2. Check data files
console.log('\n📊 CHECKING DATA FILES');
console.log('======================');

const dataDir = path.join(currentDir, 'data');
const syncInfoFile = path.join(dataDir, 'linkedin-sync-info.json');
const postsFile = path.join(dataDir, 'linkedin-posts.json');

if (fs.existsSync(syncInfoFile)) {
    console.log('✅ linkedin-sync-info.json exists');
    
    const syncInfo = JSON.parse(fs.readFileSync(syncInfoFile, 'utf8'));
    const lastSync = new Date(syncInfo.lastManualSync);
    const now = new Date();
    const daysSince = Math.floor((now - lastSync) / (24 * 60 * 60 * 1000));
    
    console.log(`📅 Last sync: ${lastSync.toLocaleDateString()} (${daysSince} days ago)`);
    console.log(`🔄 Automation: ${syncInfo.automationEnabled ? 'Enabled' : 'Disabled'}`);
    
    if (daysSince > 30) {
        console.log('⚠️  Sync is overdue (>30 days)');
    }
} else {
    console.log('❌ linkedin-sync-info.json not found');
}

if (fs.existsSync(postsFile)) {
    console.log('✅ linkedin-posts.json exists');
    
    const posts = JSON.parse(fs.readFileSync(postsFile, 'utf8'));
    console.log(`📝 Current posts: ${posts.length}`);
    
    if (posts.length > 0) {
        const latestPost = new Date(posts[0].publishedAt);
        const now = new Date(); // Define now variable here
        const daysSince = Math.floor((now - latestPost) / (24 * 60 * 60 * 1000));
        console.log(`📅 Latest post: ${latestPost.toLocaleDateString()} (${daysSince} days ago)`);
    }
} else {
    console.log('❌ linkedin-posts.json not found');
}

// 3. Environment Variables Guide
console.log('\n🔑 ENVIRONMENT VARIABLES STATUS');
console.log('===============================');

console.log('Required environment variables for Netlify:');
console.log('');
console.log('1. LINKEDIN_CLIENT_SECRET');
console.log('   Status: ❓ Must be set in Netlify UI');
console.log('   Purpose: Secure OAuth token exchange');
console.log('');
console.log('2. LINKEDIN_ACCESS_TOKEN'); 
console.log('   Status: ❓ Must be set in Netlify UI');
console.log('   Purpose: API authentication token');
console.log('');
console.log('3. GITHUB_TOKEN');
console.log('   Status: ❓ Must be set in Netlify UI');
console.log('   Purpose: Automated repository updates');
console.log('');

// 4. Provide setup instructions
console.log('\n🚀 SETUP INSTRUCTIONS');
console.log('=====================');
console.log('');
console.log('To fix your LinkedIn sync, follow these steps:');
console.log('');
console.log('STEP 1: Set Environment Variables in Netlify');
console.log('--------------------------------------------');
console.log('1. Go to https://app.netlify.com/sites/[your-site]/settings/deploys#environment-variables');
console.log('2. Add these environment variables:');
console.log('');
console.log('   LINKEDIN_CLIENT_SECRET=your_client_secret_here');
console.log('   LINKEDIN_ACCESS_TOKEN=your_access_token_here');
console.log('   GITHUB_TOKEN=your_github_token_here');
console.log('');
console.log('STEP 2: Get Fresh LinkedIn Access Token');
console.log('---------------------------------------');
console.log('1. Visit: https://bluehawana.com/pages/linkedin_debug.html');
console.log('2. Click "Authenticate with LinkedIn"');
console.log('3. Copy the access token from the debug page');
console.log('4. Add it to Netlify environment variables');
console.log('');
console.log('STEP 3: Test the Sync');
console.log('--------------------');
console.log('1. Visit: https://bluehawana.com/pages/linkedin_auto_sync.html');
console.log('2. Click "Manual Sync" to test');
console.log('3. Check your blog page for updated posts');
console.log('');
console.log('STEP 4: Enable Automation');
console.log('-------------------------');
console.log('1. Visit: https://bluehawana.com/automation-dashboard');
console.log('2. Verify automation is enabled');
console.log('3. Posts will sync every 30 minutes automatically');
console.log('');

// 5. Generate diagnostic report
const diagnosticReport = {
    timestamp: new Date().toISOString(),
    projectDir: currentDir,
    configFiles: {
        linkedinConfig: fs.existsSync(configFile),
        netlifyToml: fs.existsSync(netlifyConfig)
    },
    dataFiles: {
        syncInfo: fs.existsSync(syncInfoFile),
        posts: fs.existsSync(postsFile)
    },
    lastSync: fs.existsSync(syncInfoFile) ? JSON.parse(fs.readFileSync(syncInfoFile, 'utf8')).lastManualSync : null,
    postCount: fs.existsSync(postsFile) ? JSON.parse(fs.readFileSync(postsFile, 'utf8')).length : 0
};

// Save diagnostic report
const reportFile = path.join(currentDir, 'linkedin-diagnostic-report.json');
fs.writeFileSync(reportFile, JSON.stringify(diagnosticReport, null, 2));

console.log(`📋 Diagnostic report saved to: ${reportFile}`);
console.log('');
console.log('🏁 Setup tool completed successfully!');
console.log('   Next: Follow the setup instructions above to restore LinkedIn sync.');