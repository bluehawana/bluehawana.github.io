#!/usr/bin/env node

/**
 * Extract real LinkedIn posts from direct response
 */

const https = require('https');
const fs = require('fs');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 30000
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, data: data });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }

    req.end();
  });
}

function extractLinkedInPosts(html) {
  console.log('🔍 Analyzing LinkedIn page content for posts...\n');

  // Look for activity IDs
  const activityPatterns = [
    /urn:li:activity:(\d{19})/g,
    /activity:(\d{19})/g,
    /"activityUrn":"urn:li:activity:(\d{19})"/g
  ];

  const activityIds = new Set();
  activityPatterns.forEach(pattern => {
    const matches = [...html.matchAll(pattern)];
    matches.forEach(match => {
      if (match[1]) activityIds.add(match[1]);
    });
  });

  console.log(`📊 Found ${activityIds.size} unique activity IDs:`, Array.from(activityIds).slice(0, 5));

  // Look for post content patterns
  const contentPatterns = [
    // Look for "dear firstname" specifically
    /dear\s+firstname[^<]{0,500}/gi,
    // JSON-like content
    /"text":"([^"]{50,500})"/g,
    // Post content in various structures
    /"commentary":"([^"]{50,500})"/g,
    // Activity text
    /"activityText":"([^"]{50,500})"/g
  ];

  const foundContent = [];
  
  contentPatterns.forEach((pattern, index) => {
    const matches = [...html.matchAll(pattern)];
    console.log(`\n🔍 Pattern ${index + 1} (${pattern.source.substring(0, 30)}...): ${matches.length} matches`);
    
    matches.forEach((match, i) => {
      if (i < 3) { // Show first 3 matches
        const content = match[1] || match[0];
        if (content && content.length > 30) {
          foundContent.push({
            pattern: index + 1,
            content: content.replace(/\\n/g, ' ').replace(/\\"/g, '"').trim()
          });
          console.log(`   Match ${i + 1}: "${content.substring(0, 100)}..."`);
        }
      }
    });
  });

  // Look specifically for "dear firstname"
  const dearFirstnameMatches = html.match(/dear\s+firstname[^<>]{0,500}/gi);
  if (dearFirstnameMatches) {
    console.log(`\n🎯 FOUND "DEAR FIRSTNAME" CONTENT:`);
    dearFirstnameMatches.forEach((match, i) => {
      console.log(`   ${i + 1}: "${match.substring(0, 200)}..."`);
    });
  }

  return { activityIds: Array.from(activityIds), content: foundContent };
}

async function getRealLinkedInPosts() {
  console.log('🚀 Getting real LinkedIn posts from your profile...\n');

  try {
    const response = await makeRequest('https://www.linkedin.com/in/hzl/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });

    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📄 Content Length: ${response.data.length} characters`);

    if (response.status === 200) {
      // Save full response for analysis
      fs.writeFileSync('linkedin-profile-full.html', response.data);
      console.log('💾 Saved full response to linkedin-profile-full.html\n');

      // Extract posts
      const extracted = extractLinkedInPosts(response.data);

      return extracted;
    } else {
      console.log('❌ Failed to get LinkedIn profile');
      return null;
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return null;
  }
}

if (require.main === module) {
  getRealLinkedInPosts().then(result => {
    if (result) {
      console.log('\n✅ Extraction complete! Check linkedin-profile-full.html for the raw data');
      console.log('Found activity IDs and content patterns - now we can build real posts from this data');
    }
  }).catch(console.error);
}