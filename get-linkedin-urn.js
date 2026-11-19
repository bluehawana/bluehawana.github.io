#!/usr/bin/env node

/**
 * Get LinkedIn Profile URN from username
 */

const https = require('https');

const RAPIDAPI_KEY = process.argv[2] || process.env.RAPIDAPI_KEY || process.env.RAPIDAPI_KEY;
const PROFILE_USERNAME = process.argv[3] || 'hzl';

console.log('\n🔍 Finding LinkedIn Profile URN\n');
console.log(`Profile: https://www.linkedin.com/in/${PROFILE_USERNAME}/\n`);

const options = {
  hostname: 'linkedinscraper.p.rapidapi.com',
  path: `/profile?username=${PROFILE_USERNAME}`,
  method: 'GET',
  headers: {
    'x-rapidapi-host': 'linkedinscraper.p.rapidapi.com',
    'x-rapidapi-key': RAPIDAPI_KEY
  },
  timeout: 30000
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      if (res.statusCode === 200) {
        const profile = JSON.parse(data);
        console.log('✅ Profile Found!\n');
        console.log('Name:', profile.firstName, profile.lastName);
        console.log('Headline:', profile.headline);
        console.log('\n📝 Profile URN:', profile.urn);
        console.log('\nℹ️  Use this URN in automated-linkedin-sync-linkedinscraper.js\n');
        console.log(`PROFILE_URN: '${profile.urn}'`);
      } else {
        console.log(`❌ Error: HTTP ${res.statusCode}`);
        console.log(data.substring(0, 500));
      }
    } catch (error) {
      console.log('❌ Error parsing response:', error.message);
      console.log(data.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Request error:', error.message);
});

req.on('timeout', () => {
  req.destroy();
  console.log('❌ Request timeout');
});

req.end();
