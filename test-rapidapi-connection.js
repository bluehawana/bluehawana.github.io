#!/usr/bin/env node

/**
 * Test RapidAPI and ScrapingDog API connection
 * This verifies your API keys are working before running the full sync
 */

const https = require('https');

// Load environment variables
function loadEnvFile(filepath) {
  const fs = require('fs');
  const path = require('path');
  if (fs.existsSync(filepath)) {
    const envContent = fs.readFileSync(filepath, 'utf8');
    envContent.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').replace(/^["'](.*)["']$/, '$1');
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

const path = require('path');
loadEnvFile(path.join(__dirname, '.env'));
loadEnvFile(path.join(__dirname, '.env.local'));

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const SCRAPINGDOG_API_KEY = process.env.SCRAPINGDOG_API_KEY;

console.log('\n🔍 Testing RapidAPI & ScrapingDog Connection\n');
console.log('━'.repeat(50));

// Check if keys are set
console.log('\n📋 Step 1: Checking API Keys...\n');

if (!RAPIDAPI_KEY) {
  console.log('❌ RAPIDAPI_KEY is missing');
  console.log('   Set it with: export RAPIDAPI_KEY="your_key_here"');
  process.exit(1);
} else {
  console.log('✅ RAPIDAPI_KEY is set:', RAPIDAPI_KEY.substring(0, 10) + '...');
}

if (!SCRAPINGDOG_API_KEY) {
  console.log('❌ SCRAPINGDOG_API_KEY is missing');
  console.log('   Set it with: export SCRAPINGDOG_API_KEY="your_key_here"');
  process.exit(1);
} else {
  console.log('✅ SCRAPINGDOG_API_KEY is set:', SCRAPINGDOG_API_KEY.substring(0, 10) + '...');
}

// Test the API connection
console.log('\n📡 Step 2: Testing API Connection...\n');

const testUrl = encodeURIComponent('https://www.linkedin.com/in/harvad');

const options = {
  hostname: 'scrapingdog.p.rapidapi.com',
  path: `/scrape?url=${testUrl}&api_key=${SCRAPINGDOG_API_KEY}&dynamic=false`,
  method: 'GET',
  headers: {
    'x-rapidapi-host': 'scrapingdog.p.rapidapi.com',
    'x-rapidapi-key': RAPIDAPI_KEY,
    'User-Agent': 'Mozilla/5.0 LinkedIn-Sync-Test/1.0'
  },
  timeout: 30000
};

console.log('🌐 Making test request to RapidAPI...');
console.log(`   Host: ${options.hostname}`);
console.log(`   Testing with profile: linkedin.com/in/harvad`);

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n📊 Response Details:\n');
    console.log(`   Status Code: ${res.statusCode}`);
    console.log(`   Status Message: ${res.statusMessage}`);

    if (res.statusCode === 200) {
      console.log('\n✅ SUCCESS! API connection is working!\n');
      console.log('📝 Response preview (first 500 chars):');
      console.log('━'.repeat(50));
      console.log(data.substring(0, 500) + '...');
      console.log('━'.repeat(50));
      console.log('\n🎉 Your API keys are configured correctly!');
      console.log('   You can now run the full sync script.\n');
    } else if (res.statusCode === 401) {
      console.log('\n❌ AUTHENTICATION FAILED!');
      console.log('   One or both API keys are invalid.');
      console.log('\n📝 Check:');
      console.log('   1. RAPIDAPI_KEY is correct from RapidAPI dashboard');
      console.log('   2. SCRAPINGDOG_API_KEY is correct from ScrapingDog');
      console.log('   3. Both keys are active and not expired\n');
    } else if (res.statusCode === 403) {
      console.log('\n❌ ACCESS FORBIDDEN!');
      console.log('   Your API key may not have access to ScrapingDog API.');
      console.log('\n📝 Check:');
      console.log('   1. You subscribed to ScrapingDog on RapidAPI');
      console.log('   2. Your subscription is active');
      console.log('   3. You have remaining API credits\n');
    } else if (res.statusCode === 429) {
      console.log('\n⚠️  RATE LIMIT EXCEEDED!');
      console.log('   You have exceeded your API quota.');
      console.log('   Wait a bit or upgrade your plan.\n');
    } else {
      console.log('\n❌ Unexpected response:');
      console.log(data.substring(0, 500));
      console.log('\n');
    }
  });
});

req.on('error', (error) => {
  console.log('\n❌ REQUEST FAILED!');
  console.log(`   Error: ${error.message}\n`);
});

req.on('timeout', () => {
  req.destroy();
  console.log('\n⏱️  REQUEST TIMEOUT!');
  console.log('   The API did not respond within 30 seconds.\n');
});

req.end();
