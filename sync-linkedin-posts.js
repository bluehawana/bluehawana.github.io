#!/usr/bin/env node

/**
 * Sync LinkedIn Posts to Blog
 * This script fetches your LinkedIn posts and creates blog posts automatically
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

// Updated OAuth 2.0 Access Token with proper scopes
const ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN || 'AQXAaMANteu-XQoVzKWDcARMLIkUOV6n92tstpvl9noU6niFW0PWud7eD6r5uUnGDHIIdiPMN4SNk3tVbmK-pQewkWkO5BZqd3KJUxVGMxav-qgivdROWMV-z_V97d1bgDI-PScFAsGk8Pun6XasiEhxARRhLbvuDvF92mea89aZgHrx-Vc-q8bOL-_8GgNbzkUeFX3sJQrmbKWbjhaZA2I0QYVeePmbIkJclfVD53GXIoTdkEbH19FSYu5Q2BM3AyIHhFLnpoIi_3xncAUDkFZtLwieDJ9cqaQJYVXD0b2Sk9Hm92aILKJDaS24yymZyvsnJfniVCAApYMk_Px8U96cYFEfmg';

const POSTS_DIR = path.join(__dirname, '_posts');
const SYNC_LOG_FILE = path.join(__dirname, '.linkedin-sync-log.json');

async function makeLinkedInRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.linkedin.com',
      path: endpoint,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve(jsonData);
          } else {
            reject(new Error(`LinkedIn API error (${res.statusCode}): ${jsonData.message || data}`));
          }
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('LinkedIn API request timeout'));
    });
    req.end();
  });
}

async function getLinkedInPosts() {
  console.log('🔍 Fetching LinkedIn posts...');
  
  try {
    // First get user profile for ID
    const profile = await makeLinkedInRequest('/v2/people/(id:~)');
    console.log(`👤 Profile: ${profile.localizedFirstName} ${profile.localizedLastName}`);
    
    const profileId = profile.id;
    const apis = [
      {
        name: 'Posts API',
        endpoint: `/v2/posts?q=author&author=urn:li:person:${profileId}&count=20&sortBy=CREATED`
      },
      {
        name: 'UGC Posts API', 
        endpoint: `/v2/ugcPosts?q=authors&authors=List(urn:li:person:${profileId})&count=20&sortBy=CREATED`
      }
    ];

    const allPosts = [];
    
    for (const api of apis) {
      try {
        console.log(`🔄 Trying ${api.name}...`);
        const response = await makeLinkedInRequest(api.endpoint);
        
        if (response.elements && response.elements.length > 0) {
          console.log(`✅ ${api.name}: Found ${response.elements.length} posts`);
          allPosts.push(...response.elements.map(post => ({
            ...post,
            source: api.name,
            profileId: profileId
          })));
        } else {
          console.log(`📭 ${api.name}: No posts found`);
        }
      } catch (error) {
        console.log(`⚠️  ${api.name} failed: ${error.message}`);
      }
    }

    // Remove duplicates and sort by creation date
    const uniquePosts = allPosts
      .filter((post, index, self) => index === self.findIndex(p => p.id === post.id))
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created?.time || 0);
        const dateB = new Date(b.createdAt || b.created?.time || 0);
        return dateB - dateA; // Newest first
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
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
LinkedIn Blog Sync Tool

Usage:
  node sync-linkedin-posts.js [options]

Options:
  --help, -h     Show this help message
  --dry-run      Show what would be synced without creating files
  --force        Force sync even if posts already exist

Environment Variables:
  LINKEDIN_ACCESS_TOKEN    Your LinkedIn API access token

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