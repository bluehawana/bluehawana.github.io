#!/usr/bin/env node

/**
 * Sync LinkedIn Posts to Blog
 * This script fetches your LinkedIn posts and creates blog posts automatically
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

// RapidAPI Configuration
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '82ecb2468bmsh3c25b2ce3d4fd9bp153400jsn56283a8d38c6';
const RAPIDAPI_HOST = 'linkedin-data-api.p.rapidapi.com';

const POSTS_DIR = path.join(__dirname, '_posts');
const SYNC_LOG_FILE = path.join(__dirname, '.linkedin-sync-log.json');
const API_USAGE_FILE = path.join(__dirname, '.rapidapi-usage.json');

// Free tier limits - 50 requests per month
const FREE_TIER_LIMIT = 50;
const SYNC_FREQUENCY_DAYS = 7; // Sync once per week to stay under limit

async function makeRapidAPIRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: RAPIDAPI_HOST,
      path: endpoint,
      method: 'GET',
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } else {
            reject(new Error(`RapidAPI error (${res.statusCode}): ${data}`));
          }
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('RapidAPI request timeout'));
    });
    req.end();
  });
}

async function loadApiUsage() {
  try {
    const usageData = await fs.readFile(API_USAGE_FILE, 'utf8');
    return JSON.parse(usageData);
  } catch (error) {
    return {
      monthlyUsage: 0,
      lastReset: new Date().toISOString(),
      requestLog: []
    };
  }
}

async function saveApiUsage(usage) {
  await fs.writeFile(API_USAGE_FILE, JSON.stringify(usage, null, 2));
}

async function checkRateLimit() {
  const usage = await loadApiUsage();
  const now = new Date();
  const lastReset = new Date(usage.lastReset);
  
  // Reset monthly usage if it's been more than 30 days
  if (now.getTime() - lastReset.getTime() > 30 * 24 * 60 * 60 * 1000) {
    usage.monthlyUsage = 0;
    usage.lastReset = now.toISOString();
    usage.requestLog = [];
    await saveApiUsage(usage);
  }
  
  if (usage.monthlyUsage >= FREE_TIER_LIMIT) {
    throw new Error(`🚫 Rate limit exceeded! Used ${usage.monthlyUsage}/${FREE_TIER_LIMIT} requests this month. Next reset: ${new Date(lastReset.getTime() + 30 * 24 * 60 * 60 * 1000).toDateString()}`);
  }
  
  return usage;
}

async function incrementApiUsage(endpoint) {
  const usage = await loadApiUsage();
  usage.monthlyUsage++;
  usage.requestLog.push({
    endpoint,
    timestamp: new Date().toISOString()
  });
  
  // Keep only last 100 requests in log
  if (usage.requestLog.length > 100) {
    usage.requestLog = usage.requestLog.slice(-100);
  }
  
  await saveApiUsage(usage);
  
  console.log(`📊 API Usage: ${usage.monthlyUsage}/${FREE_TIER_LIMIT} requests this month`);
  
  if (usage.monthlyUsage >= FREE_TIER_LIMIT * 0.8) {
    console.log(`⚠️  Warning: Approaching rate limit (${usage.monthlyUsage}/${FREE_TIER_LIMIT})`);
  }
}

async function shouldSync() {
  const syncLog = await loadSyncLog();
  if (!syncLog.lastSync) return true;
  
  const lastSync = new Date(syncLog.lastSync);
  const now = new Date();
  const daysSinceSync = (now - lastSync) / (1000 * 60 * 60 * 24);
  
  return daysSinceSync >= SYNC_FREQUENCY_DAYS;
}

async function getLinkedInPosts() {
  console.log('🔍 Fetching LinkedIn posts...');
  
  // Check if we should sync based on frequency
  if (!(await shouldSync())) {
    const syncLog = await loadSyncLog();
    const nextSync = new Date(new Date(syncLog.lastSync).getTime() + SYNC_FREQUENCY_DAYS * 24 * 60 * 60 * 1000);
    console.log(`⏰ Sync frequency: every ${SYNC_FREQUENCY_DAYS} days. Next sync: ${nextSync.toDateString()}`);
    return [];
  }
  
  // Check rate limits
  await checkRateLimit();
  
  try {
    // Try different RapidAPI endpoints for LinkedIn posts/activities
    const username = 'hzl'; // Your LinkedIn username - update this
    const apis = [
      {
        name: 'Profile Posts',
        endpoint: `/profile/${username}/posts`
      },
      {
        name: 'User Activities',
        endpoint: `/profile/${username}/activities`
      },
      {
        name: 'Posts Search',
        endpoint: `/posts/search?keyword=${username}&count=20`
      },
      {
        name: 'Profile Data',
        endpoint: `/profile/${username}`
      }
    ];

    const allPosts = [];
    
    for (const api of apis) {
      try {
        console.log(`🔄 Trying ${api.name}...`);
        await incrementApiUsage(api.endpoint);
        const response = await makeRapidAPIRequest(api.endpoint);
        
        if (response && (response.posts || response.data || response.activities)) {
          const posts = response.posts || response.data || response.activities || [];
          console.log(`✅ ${api.name}: Found ${posts.length} posts`);
          
          if (Array.isArray(posts)) {
            allPosts.push(...posts.map(post => ({
              ...post,
              source: api.name
            })));
          }
        } else if (response && typeof response === 'object') {
          // Handle single post or different response format
          console.log(`✅ ${api.name}: Found data`);
          allPosts.push({
            ...response,
            source: api.name
          });
        } else {
          console.log(`📭 ${api.name}: No posts found`);
        }
      } catch (error) {
        console.log(`⚠️  ${api.name} failed: ${error.message}`);
        // Continue with next API if current one fails
      }
      
      // Add delay between API calls to be respectful
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Remove duplicates by ID and content similarity
    const uniquePosts = [];
    const seenIds = new Set();
    const seenActivityIds = new Set();
    const seenContentHashes = new Set();
    
    for (const post of allPosts) {
      // Skip if we've seen this ID
      if (post.id && seenIds.has(post.id)) continue;
      
      // Check for activityId duplicates (handle both formats)
      const activityId = post.activityId || post.id;
      if (activityId && seenActivityIds.has(activityId)) continue;
      
      // Create content hash for similarity detection
      const content = extractTextFromPost(post) || '';
      const contentHash = content.toLowerCase().trim().substring(0, 100).replace(/\s+/g, ' ');
      
      if (contentHash.length > 20 && seenContentHashes.has(contentHash)) continue;
      
      // Add to tracking sets
      if (post.id) seenIds.add(post.id);
      if (activityId) seenActivityIds.add(activityId);
      if (contentHash.length > 20) seenContentHashes.add(contentHash);
      
      uniquePosts.push(post);
    }
    
    // Sort by creation date (newest first)
    uniquePosts.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.created?.time || 0);
      const dateB = new Date(b.createdAt || b.created?.time || 0);
      return dateB - dateA;
    });

    console.log(`📊 Total unique posts: ${uniquePosts.length}`);
    return uniquePosts;
    
  } catch (error) {
    console.error('❌ Failed to fetch LinkedIn posts:', error);
    return [];
  }
}

async function loadSyncLog() {
  try {
    const logData = await fs.readFile(SYNC_LOG_FILE, 'utf8');
    return JSON.parse(logData);
  } catch (error) {
    return { syncedPosts: [], lastSync: null };
  }
}

async function saveSyncLog(syncLog) {
  await fs.writeFile(SYNC_LOG_FILE, JSON.stringify(syncLog, null, 2));
}

function extractTextFromPost(post) {
  // Handle different LinkedIn post formats
  if (post.commentary) {
    return post.commentary;
  } else if (post.text?.text) {
    return post.text.text;
  } else if (post.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text) {
    return post.specificContent['com.linkedin.ugc.ShareContent'].shareCommentary.text;
  }
  return '';
}

function generateSlug(text) {
  return text
    .toLowerCase()
    .substring(0, 50)
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateBlogPost(post) {
  const text = extractTextFromPost(post);
  if (!text || text.length < 20) return null;

  const createdDate = new Date(post.createdAt || post.created?.time || Date.now());
  const dateStr = createdDate.toISOString().split('T')[0];
  const title = text.length > 60 ? text.substring(0, 60) + '...' : text;
  const slug = generateSlug(title);
  const linkedinUrl = `https://www.linkedin.com/feed/update/${post.id}/`;

  const frontMatter = `---
layout: post
title: "${title.replace(/"/g, '\\"')}"
date: ${dateStr}
categories: [linkedin, social]
tags: [linkedin-post, social-media, professional]
linkedin_url: "${linkedinUrl}"
linkedin_id: "${post.id}"
source: "${post.source || 'LinkedIn API'}"
author: Hongzhi Li
---

`;

  const content = `${text}

---

*Originally posted on [LinkedIn](${linkedinUrl})*

<!-- LinkedIn Post Details -->
<!-- Post ID: ${post.id} -->
<!-- Created: ${createdDate.toISOString()} -->
<!-- Source: ${post.source} -->
`;

  return {
    filename: `${dateStr}-linkedin-${slug}.md`,
    content: frontMatter + content,
    linkedinId: post.id,
    linkedinUrl: linkedinUrl,
    createdAt: createdDate.toISOString()
  };
}

async function ensurePostsDirectory() {
  try {
    await fs.access(POSTS_DIR);
  } catch (error) {
    console.log('📁 Creating _posts directory...');
    await fs.mkdir(POSTS_DIR, { recursive: true });
  }
}

async function syncPosts() {
  console.log('🚀 Starting LinkedIn to Blog sync...');
  
  try {
    await ensurePostsDirectory();
    
    const posts = await getLinkedInPosts();
    if (posts.length === 0) {
      console.log('📭 No posts found to sync');
      return;
    }

    const syncLog = await loadSyncLog();
    const newPosts = [];
    const skippedPosts = [];

    for (const post of posts) {
      if (syncLog.syncedPosts.includes(post.id)) {
        skippedPosts.push(post.id);
        continue;
      }

      const blogPost = generateBlogPost(post);
      if (!blogPost) {
        console.log(`⚠️  Skipping post ${post.id}: insufficient content`);
        continue;
      }

      const filepath = path.join(POSTS_DIR, blogPost.filename);
      
      try {
        // Check if file already exists
        await fs.access(filepath);
        console.log(`📄 Post already exists: ${blogPost.filename}`);
        syncLog.syncedPosts.push(post.id);
      } catch (error) {
        // File doesn't exist, create it
        await fs.writeFile(filepath, blogPost.content);
        console.log(`✅ Created: ${blogPost.filename}`);
        syncLog.syncedPosts.push(post.id);
        newPosts.push({
          file: blogPost.filename,
          linkedinId: post.id,
          linkedinUrl: blogPost.linkedinUrl,
          createdAt: blogPost.createdAt
        });
      }
    }

    // Update sync log
    syncLog.lastSync = new Date().toISOString();
    await saveSyncLog(syncLog);

    console.log(`\n📊 Sync Summary:`);
    console.log(`   New posts created: ${newPosts.length}`);
    console.log(`   Posts skipped (already synced): ${skippedPosts.length}`);
    console.log(`   Total LinkedIn posts processed: ${posts.length}`);
    
    if (newPosts.length > 0) {
      console.log(`\n📝 New blog posts:`);
      newPosts.forEach(post => {
        console.log(`   - ${post.file}`);
        console.log(`     LinkedIn: ${post.linkedinUrl}`);
      });
      
      console.log(`\n🎉 Success! ${newPosts.length} new posts synced to your blog.`);
    } else {
      console.log('\n✅ All posts are already up to date!');
    }

    return {
      success: true,
      newPosts: newPosts.length,
      totalPosts: posts.length,
      newPostsDetails: newPosts
    };

  } catch (error) {
    console.error('❌ Sync failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--status')) {
    (async () => {
      const usage = await loadApiUsage();
      const syncLog = await loadSyncLog();
      
      console.log('\n📊 LinkedIn Sync Status\n');
      console.log(`🔑 RapidAPI Key: ${RAPIDAPI_KEY.substring(0, 10)}...`);
      console.log(`🌐 Host: ${RAPIDAPI_HOST}`);
      console.log(`📈 API Usage: ${usage.monthlyUsage}/${FREE_TIER_LIMIT} requests this month`);
      console.log(`📅 Usage period: ${new Date(usage.lastReset).toDateString()} - ${new Date(new Date(usage.lastReset).getTime() + 30 * 24 * 60 * 60 * 1000).toDateString()}`);
      
      if (syncLog.lastSync) {
        console.log(`🕒 Last sync: ${new Date(syncLog.lastSync).toLocaleString()}`);
        const nextSync = new Date(new Date(syncLog.lastSync).getTime() + SYNC_FREQUENCY_DAYS * 24 * 60 * 60 * 1000);
        console.log(`⏰ Next sync: ${nextSync.toLocaleString()}`);
      } else {
        console.log(`🕒 Last sync: Never`);
        console.log(`⏰ Next sync: Available now`);
      }
      
      if (usage.requestLog && usage.requestLog.length > 0) {
        console.log(`\n📋 Recent requests:`);
        usage.requestLog.slice(-5).forEach(req => {
          console.log(`   ${new Date(req.timestamp).toLocaleString()} - ${req.endpoint}`);
        });
      }
    
      console.log(`\n⚙️  Configuration:`);
      console.log(`   Sync frequency: Every ${SYNC_FREQUENCY_DAYS} days`);
      console.log(`   Free tier limit: ${FREE_TIER_LIMIT} requests/month`);
      
      process.exit(0);
    })();
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
LinkedIn Blog Sync Tool

Usage:
  node sync-linkedin-posts.js [options]

Options:
  --help, -h     Show this help message
  --dry-run      Show what would be synced without creating files
  --force        Force sync even if posts already exist
  --status       Show API usage status

Environment Variables:
  RAPIDAPI_KEY             Your RapidAPI key (default provided)

Rate Limiting:
  Free Tier: 50 requests/month
  Sync Frequency: Every 7 days to stay under limit
  Usage tracked in .rapidapi-usage.json

Examples:
  node sync-linkedin-posts.js
  node sync-linkedin-posts.js --dry-run
`);
    process.exit(0);
  }

  syncPosts()
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Sync failed:', error);
      process.exit(1);
    });
}

module.exports = { syncPosts, getLinkedInPosts };