#!/usr/bin/env node

/**
 * Update Engagement Stats for Old Posts
 * Fetches current engagement stats from LinkedIn API and updates old blog posts
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '82ecb2468bmsh3c25b2ce3d4fd9bp153400jsn56283a8d38c6';
const PROFILE_URN = 'urn:li:fsd_profile:ACoAAAnSTvABXgay-z5smZQ1OOq0MblgiB2GRLI';
const POSTS_DIR = path.join(__dirname, '_posts');

console.log('\n📊 Updating Engagement Stats for Old Posts\n');
console.log('━'.repeat(50));

async function fetchLinkedInPosts() {
  return new Promise((resolve, reject) => {
    const encodedUrn = encodeURIComponent(PROFILE_URN);

    const options = {
      hostname: 'linkedinscraper.p.rapidapi.com',
      path: `/profile-posts?urn=${encodedUrn}`,
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'linkedinscraper.p.rapidapi.com',
        'x-rapidapi-key': RAPIDAPI_KEY
      },
      timeout: 60000
    };

    console.log('Fetching latest posts from LinkedIn...');

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const jsonData = JSON.parse(data);
            console.log(`✅ Fetched ${jsonData.data?.length || 0} posts\n`);
            resolve(jsonData);
          } else {
            reject(new Error(`API returned status ${res.statusCode}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

function extractActivityId(linkedinUrl) {
  const match = linkedinUrl.match(/activity-(\d+)/);
  return match ? match[1] : null;
}

async function main() {
  try {
    // Fetch current stats from LinkedIn
    const apiResponse = await fetchLinkedInPosts();
    const posts = apiResponse.data || [];

    // Create a map of activityId -> engagement stats
    const statsMap = new Map();

    posts.forEach(post => {
      const activityId = post.activityId?.split(':').pop();
      if (activityId && post.activity) {
        statsMap.set(activityId, {
          likes: post.activity.numLikes || 0,
          comments: post.activity.numComments || 0,
          shares: post.activity.numShares || 0
        });
      }
    });

    console.log(`📋 Stats map created with ${statsMap.size} entries\n`);

    // Read all LinkedIn post files
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.includes('linkedin') && f.endsWith('.md'));

    console.log(`📁 Found ${files.length} LinkedIn post files\n`);

    let updated = 0;
    let skipped = 0;

    for (const file of files) {
      const filepath = path.join(POSTS_DIR, file);
      let content = fs.readFileSync(filepath, 'utf8');

      // Extract LinkedIn URL from frontmatter
      const urlMatch = content.match(/linkedin_url:\s*"([^"]+)"/);
      if (!urlMatch) {
        skipped++;
        continue;
      }

      const linkedinUrl = urlMatch[1];
      const activityId = extractActivityId(linkedinUrl);

      if (!activityId || !statsMap.has(activityId)) {
        console.log(`⏭️  ${file}: No stats available`);
        skipped++;
        continue;
      }

      const stats = statsMap.get(activityId);

      // Check if stats are already non-zero
      const currentStatsMatch = content.match(/linkedin_stats:\s*\n\s*likes:\s*(\d+)\s*\n\s*comments:\s*(\d+)\s*\n\s*shares:\s*(\d+)/);

      if (currentStatsMatch) {
        const currentLikes = parseInt(currentStatsMatch[1]);
        const currentComments = parseInt(currentStatsMatch[2]);
        const currentShares = parseInt(currentStatsMatch[3]);

        // Only update if current stats are all zeros or lower than new stats
        if (currentLikes === 0 && currentComments === 0 && currentShares === 0) {
          // Update the stats in frontmatter
          content = content.replace(
            /linkedin_stats:\s*\n\s*likes:\s*\d+\s*\n\s*comments:\s*\d+\s*\n\s*shares:\s*\d+/,
            `linkedin_stats:\n  likes: ${stats.likes}\n  comments: ${stats.comments}\n  shares: ${stats.shares}`
          );

          // Update the engagement line at the bottom
          content = content.replace(
            /\*\*Engagement:\*\* 👍 \d+ likes • 💬 \d+ comments • 🔄 \d+ shares/,
            `**Engagement:** 👍 ${stats.likes} likes • 💬 ${stats.comments} comments • 🔄 ${stats.shares} shares`
          );

          fs.writeFileSync(filepath, content);
          console.log(`✅ ${file}: Updated (${stats.likes} likes, ${stats.comments} comments, ${stats.shares} shares)`);
          updated++;
        } else {
          console.log(`⏭️  ${file}: Already has stats`);
          skipped++;
        }
      }
    }

    console.log('\n━'.repeat(50));
    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Updated: ${updated} posts`);
    console.log(`   ⏭️  Skipped: ${skipped} posts`);
    console.log(`   📝 Total: ${files.length} posts\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
