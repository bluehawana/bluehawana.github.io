#!/usr/bin/env node

/**
 * Simple LinkedIn RapidAPI Sync Script
 * Fetches posts from LinkedIn and creates blog posts
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#') && line.includes('=')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=');
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

// Load environment variables
loadEnvFile();

const CONFIG = {
  RAPIDAPI_KEY: process.env.RAPIDAPI_KEY || process.env.LINKEDIN_RAPIDAPI_KEY,
  PROFILE_URN: process.env.LINKEDIN_PROFILE_URN || 'urn:li:fsd_profile:ACoAAAnSTvABXgay-z5smZQ1OOq0MblgiB2GRLI',
  POSTS_DIR: path.join(__dirname, '_posts'),
  DATA_FILE: path.join(__dirname, 'data', 'linkedin-posts.json'),
  MAX_POSTS_TO_SYNC: parseInt(process.env.MAX_POSTS_TO_SYNC) || 10
};

// Ensure directories exist
if (!fs.existsSync(CONFIG.POSTS_DIR)) {
  fs.mkdirSync(CONFIG.POSTS_DIR, { recursive: true });
}
if (!fs.existsSync(path.dirname(CONFIG.DATA_FILE))) {
  fs.mkdirSync(path.dirname(CONFIG.DATA_FILE), { recursive: true });
}

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// Validate configuration
if (!CONFIG.RAPIDAPI_KEY) {
  log('❌ ERROR: RAPIDAPI_KEY not found in environment variables');
  log('   Please set RAPIDAPI_KEY in .env file or environment');
  process.exit(1);
}

async function fetchLinkedInPosts() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'linkedinscraper.p.rapidapi.com',
      path: `/profile-posts?urn=${encodeURIComponent(CONFIG.PROFILE_URN)}`,
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': CONFIG.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'linkedinscraper.p.rapidapi.com'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData.data || []);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function loadExistingPosts() {
  if (!fs.existsSync(CONFIG.DATA_FILE)) {
    return [];
  }
  
  try {
    const data = fs.readFileSync(CONFIG.DATA_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return parsed.posts || parsed || [];
  } catch (error) {
    return [];
  }
}

function extractTitle(commentary) {
  if (!commentary) return 'LinkedIn Post';
  
  const lines = commentary.split('\n').filter(line => line.trim().length > 0);
  if (lines.length === 0) return 'LinkedIn Post';
  
  let title = lines[0].trim();
  title = title.replace(/#\w+/g, '').replace(/https?:\/\/[^\s]+/g, '');
  title = title.trim().substring(0, 80);
  
  return title || 'LinkedIn Post';
}

function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)
    .replace(/^-|-$/g, '');
}

function createBlogPost(post) {
  const title = extractTitle(post.commentary);
  const slug = createSlug(title);
  const postDate = new Date(post.createdAt);
  const dateString = postDate.toISOString().split('T')[0];
  
  let filename = `${dateString}-linkedin-${slug}.md`;
  let filepath = path.join(CONFIG.POSTS_DIR, filename);
  
  // Avoid duplicates
  if (fs.existsSync(filepath)) {
    filename = `${dateString}-linkedin-${slug}-${Date.now()}.md`;
    filepath = path.join(CONFIG.POSTS_DIR, filename);
  }
  
  let content = post.commentary || '';
  
  // Add images
  if (post.content && post.content.images) {
    post.content.images.forEach((image, index) => {
      content += `\n\n![LinkedIn Post Image ${index + 1}](${image.url})`;
    });
  }
  
  // Add article
  if (post.content && post.content.article) {
    content += `\n\n**Article:** [${post.content.article.title}](${post.content.article.url})`;
  }
  
  const blogContent = `---
layout: post
title: "${title.replace(/"/g, '\\"')}"
date: ${dateString}
categories: [linkedin, social-media]
tags: [linkedin, automation]
linkedin_url: "${post.shareUrl}"
author: "Harvad Li"
linkedin_stats:
  likes: ${post.activity?.numLikes || 0}
  comments: ${post.activity?.numComments || 0}
  shares: ${post.activity?.numShares || 0}
---

${content}

---

**Engagement:** 👍 ${post.activity?.numLikes || 0} likes • 💬 ${post.activity?.numComments || 0} comments • 🔄 ${post.activity?.numShares || 0} shares

*Automatically synced from [LinkedIn](${post.shareUrl}) on ${new Date().toLocaleDateString()}*
`;
  
  fs.writeFileSync(filepath, blogContent);
  log(`✅ Created: ${filename}`);
  
  return { filename, filepath, title };
}

async function main() {
  try {
    log('🚀 Starting LinkedIn sync...');
    
    // Fetch posts from LinkedIn
    const posts = await fetchLinkedInPosts();
    log(`📥 Fetched ${posts.length} posts from LinkedIn`);
    
    if (posts.length === 0) {
      log('⚠️  No posts found');
      return;
    }
    
    // Load existing posts
    const existingPosts = loadExistingPosts();
    const existingActivityIds = new Set(existingPosts.map(p => p.activityId));
    
    // Filter new posts
    const newPosts = posts.filter(post => !existingActivityIds.has(post.activityId));
    log(`🆕 Found ${newPosts.length} new posts`);
    
    if (newPosts.length === 0) {
      log('✅ No new posts to sync');
      return;
    }
    
    // Sync latest 10 posts
    const postsToSync = newPosts.slice(0, 10);
    const syncedPosts = [];
    
    for (const post of postsToSync) {
      try {
        const result = createBlogPost(post);
        syncedPosts.push({
          activityId: post.activityId,
          title: result.title,
          filename: result.filename,
          created_at: post.createdAt,
          synced_at: new Date().toISOString()
        });
      } catch (error) {
        log(`❌ Error processing post: ${error.message}`);
      }
    }
    
    // Update data file
    const allPosts = [...existingPosts, ...syncedPosts];
    const dataToSave = {
      profile: {
        name: "Harvad Li",
        linkedin_url: "https://www.linkedin.com/in/hzl/"
      },
      last_sync: new Date().toISOString(),
      total_posts: allPosts.length,
      posts: allPosts
    };
    
    fs.writeFileSync(CONFIG.DATA_FILE, JSON.stringify(dataToSave, null, 2));
    
    log(`🎉 Sync complete! Created ${syncedPosts.length} blog posts`);
    log(`📊 Total posts in system: ${allPosts.length}`);
    
  } catch (error) {
    log(`💥 Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}