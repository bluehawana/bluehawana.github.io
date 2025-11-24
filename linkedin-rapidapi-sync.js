#!/usr/bin/env node

/**
 * Enhanced LinkedIn RapidAPI Sync Script for Harvad Li
 * Uses LinkedIn Scraper RapidAPI to fetch and sync posts every 6 hours
 * 
 * Features:
 * - Uses LinkedIn Scraper RapidAPI with profile URN
 * - Detects new posts automatically
 * - Creates Jekyll blog posts with proper front matter
 * - Tracks sync history and prevents duplicates
 * - Runs on 6-hour schedule
 * 
 * Usage:
 * - Manual: node linkedin-rapidapi-sync.js
 * - Cron: 0 star-slash-6 star star star cd /path/to/project && node linkedin-rapidapi-sync.js
 * - GitHub Actions: workflow with schedule
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  RAPIDAPI_KEY: process.env.RAPIDAPI_KEY || '82ecb2468bmsh3c25b2ce3d4fd9bp153400jsn56283a8d38c6',
  PROFILE_URN: 'urn:li:fsd_profile:ACoAAAnSTvABXgay-z5smZQ1OOq0MblgiB2GRLI',
  RAPIDAPI_HOST: 'linkedinscraper.p.rapidapi.com',
  API_ENDPOINT: '/profile-posts',
  MAX_POSTS_TO_SYNC: 10,
  OUTPUT_DIR: path.join(__dirname, '_data'),
  POSTS_DIR: path.join(__dirname, '_posts'),
  DATA_FILE: path.join(__dirname, '_data', 'linkedin-posts.json'),
  SYNC_LOG_FILE: path.join(__dirname, 'data', 'linkedin-sync-log.json'),
  LAST_SYNC_FILE: path.join(__dirname, '_data', 'last-sync-report.json')
};

// Ensure directories exist
[CONFIG.OUTPUT_DIR, CONFIG.POSTS_DIR, path.dirname(CONFIG.SYNC_LOG_FILE)].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${level}: ${message}`;
  console.log(logMessage);
  
  // Append to sync log
  const logEntry = {
    timestamp,
    level,
    message,
    source: 'linkedin-rapidapi-sync'
  };
  
  let logHistory = [];
  if (fs.existsSync(CONFIG.SYNC_LOG_FILE)) {
    try {
      const logData = fs.readFileSync(CONFIG.SYNC_LOG_FILE, 'utf8');
      logHistory = JSON.parse(logData);
    } catch (error) {
      // If log file is corrupted, start fresh
      logHistory = [];
    }
  }
  
  logHistory.push(logEntry);
  
  // Keep only last 100 log entries
  if (logHistory.length > 100) {
    logHistory = logHistory.slice(-100);
  }
  
  fs.writeFileSync(CONFIG.SYNC_LOG_FILE, JSON.stringify(logHistory, null, 2));
}

async function makeRapidAPIRequest(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    const options = {
      hostname: CONFIG.RAPIDAPI_HOST,
      path: url,
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': CONFIG.RAPIDAPI_KEY,
        'X-RapidAPI-Host': CONFIG.RAPIDAPI_HOST,
        'User-Agent': 'LinkedIn-Blog-Sync/1.0'
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, raw: data });
        } catch (error) {
          resolve({ status: res.statusCode, data: data, raw: data, parseError: error });
        }
      });
    });

    req.on('error', (error) => {
      log(`HTTP request error: ${error.message}`, 'ERROR');
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function fetchLinkedInPosts() {
  try {
    log('Fetching LinkedIn posts via RapidAPI...');
    
    const response = await makeRapidAPIRequest(CONFIG.API_ENDPOINT, {
      urn: CONFIG.PROFILE_URN
    });
    
    if (response.status === 200 && response.data && response.data.data) {
      log(`Successfully fetched ${response.data.data.length} posts from LinkedIn`);
      return response.data.data;
    }
    
    throw new Error(`API returned status ${response.status}: ${JSON.stringify(response.data)}`);
    
  } catch (error) {
    log(`Error fetching LinkedIn posts: ${error.message}`, 'ERROR');
    throw error;
  }
}

function loadExistingPosts() {
  if (!fs.existsSync(CONFIG.DATA_FILE)) {
    log('No existing posts file found, starting fresh');
    return { posts: [], lastSync: null };
  }
  
  try {
    const data = fs.readFileSync(CONFIG.DATA_FILE, 'utf8');
    const postsData = JSON.parse(data);
    log(`Loaded ${postsData.posts ? postsData.posts.length : 0} existing posts`);
    return postsData;
  } catch (error) {
    log(`Error loading existing posts: ${error.message}`, 'ERROR');
    return { posts: [], lastSync: null };
  }
}

function detectNewPosts(fetchedPosts, existingData) {
  log('Detecting new posts...');
  
  const existingActivityIds = new Set((existingData.posts || []).map(p => p.activityId));
  const newPosts = [];
  
  fetchedPosts.forEach((post, index) => {
    // Extract activity ID from the post
    const activityId = post.activityId || `unknown-${Date.now()}-${index}`;
    
    // Skip if we already have this post
    if (existingActivityIds.has(activityId)) {
      return;
    }
    
    // Process the LinkedIn post data
    const processedPost = {
      id: `rapidapi-${Date.now()}-${index}`,
      activityId: activityId,
      shareUrn: post.shareUrn || '',
      platform: 'linkedin',
      author: post.actor?.name || 'Harvad Li',
      authorDescription: post.actor?.description || '',
      title: extractTitle(post.commentary),
      content: post.commentary || '',
      shareUrl: post.shareUrl || '',
      createdAt: post.createdAt || new Date().toISOString(),
      activity: {
        likes: post.activity?.numLikes || 0,
        comments: post.activity?.numComments || 0,
        shares: post.activity?.numShares || 0,
        impressions: post.activity?.numImpressions || null,
        reactionCounts: post.activity?.reactionTypeCounts || []
      },
      content_data: {
        images: post.content?.images || [],
        article: post.content?.article || null
      },
      extracted_at: new Date().toISOString(),
      source: 'linkedin-rapidapi',
      is_own_post: true
    };
    
    newPosts.push(processedPost);
  });
  
  log(`Found ${newPosts.length} new posts to sync`);
  return newPosts.slice(0, CONFIG.MAX_POSTS_TO_SYNC);
}

function extractTitle(commentary) {
  if (!commentary) return 'LinkedIn Post';
  
  // Extract first meaningful line as title
  const lines = commentary.split('\n').filter(line => line.trim().length > 0);
  if (lines.length === 0) return 'LinkedIn Post';
  
  let title = lines[0].trim();
  
  // Remove hashtags and URLs from title
  title = title.replace(/#\w+/g, '').replace(/https?:\/\/[^\s]+/g, '');
  
  // Clean up and truncate
  title = title.trim().substring(0, 80);
  
  return title || 'LinkedIn Post';
}

function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50)
    .replace(/^-|-$/g, '');
}

function createBlogPost(post) {
  const title = post.title;
  const slug = createSlug(title);
  
  // Use the original LinkedIn creation date for the blog post
  const postDate = new Date(post.createdAt);
  const dateString = postDate.toISOString().split('T')[0];
  
  const filename = `${dateString}-linkedin-${slug}.md`;
  const filepath = path.join(CONFIG.POSTS_DIR, filename);
  
  // Avoid duplicate files
  if (fs.existsSync(filepath)) {
    const timestamp = Date.now();
    const newFilename = `${dateString}-linkedin-${slug}-${timestamp}.md`;
    const newFilepath = path.join(CONFIG.POSTS_DIR, newFilename);
    return createBlogPostFile(newFilepath, post, title, dateString);
  }
  
  return createBlogPostFile(filepath, post, title, dateString);
}

function createBlogPostFile(filepath, post, title, dateString) {
  // Format content for blog
  let content = post.content;
  
  // Add images if present
  if (post.content_data.images && post.content_data.images.length > 0) {
    content += '\n\n';
    post.content_data.images.forEach((image, index) => {
      content += `![LinkedIn Post Image ${index + 1}](${image.url})\n\n`;
    });
  }
  
  // Add article link if present
  if (post.content_data.article) {
    content += `\n\n**Article:** [${post.content_data.article.title}](${post.content_data.article.url})\n\n`;
  }
  
  // Create Jekyll front matter
  const blogContent = `---
layout: post
title: "${title.replace(/"/g, '\\"')}"
date: ${dateString}
categories: [linkedin, social-media]
tags: [linkedin, automation, social-content]
linkedin_url: "${post.shareUrl}"
linkedin_activity_id: "${post.activityId}"
author: "Harvad Li"
extract_method: "linkedin-rapidapi"
sync_date: "${new Date().toISOString()}"
activity_stats:
  likes: ${post.activity.likes}
  comments: ${post.activity.comments}
  shares: ${post.activity.shares}
  impressions: ${post.activity.impressions || 'null'}
---

${content}

---

**Post Engagement:**
- 👍 ${post.activity.likes} likes
- 💬 ${post.activity.comments} comments  
- 🔄 ${post.activity.shares} shares
${post.activity.impressions ? `- 👀 ${post.activity.impressions} impressions` : ''}

*This post was automatically synchronized from LinkedIn on ${new Date().toLocaleDateString()} using the LinkedIn Scraper RapidAPI.*

**[View Original Post on LinkedIn](${post.shareUrl})**
`;
  
  // Write blog post file
  fs.writeFileSync(filepath, blogContent);
  log(`Created blog post: ${path.basename(filepath)}`);
  
  return filepath;
}

function updatePostsData(existingData, newPosts) {
  const updatedData = {
    profile: {
      name: "Harvad Li", 
      linkedin_url: "https://www.linkedin.com/in/hzl/",
      profile_urn: CONFIG.PROFILE_URN,
      last_sync: new Date().toISOString()
    },
    extraction: {
      date: new Date().toISOString(),
      method: "linkedin-rapidapi",
      api_host: CONFIG.RAPIDAPI_HOST,
      total_posts_found: (existingData.posts || []).length + newPosts.length,
      new_posts_this_sync: newPosts.length
    },
    posts: [...(existingData.posts || []), ...newPosts]
  };
  
  fs.writeFileSync(CONFIG.DATA_FILE, JSON.stringify(updatedData, null, 2));
  log(`Updated posts data file with ${newPosts.length} new posts`);
  
  return updatedData;
}

function generateSyncReport(newPosts, totalPosts) {
  const report = {
    sync_timestamp: new Date().toISOString(),
    profile_name: 'Harvad Li',
    profile_urn: CONFIG.PROFILE_URN,
    new_posts_synced: newPosts.length,
    total_posts_in_system: totalPosts,
    api_status: 'working',
    api_method: 'linkedin-rapidapi',
    next_sync_recommended: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours later
    new_posts: newPosts.map(post => ({
      title: post.title.substring(0, 100) + (post.title.length > 100 ? '...' : ''),
      activity_id: post.activityId,
      created_at: post.createdAt,
      likes: post.activity.likes,
      comments: post.activity.comments,
      shares: post.activity.shares,
      link: post.shareUrl,
      sync_date: post.extracted_at
    })),
    performance: {
      sync_duration_ms: 0, // Will be calculated in main()
      posts_per_minute: 0
    }
  };
  
  // Save report
  fs.writeFileSync(CONFIG.LAST_SYNC_FILE, JSON.stringify(report, null, 2));
  
  return report;
}

async function main() {
  const startTime = Date.now();
  log('Starting LinkedIn RapidAPI sync for Harvad Li', 'INFO');
  
  try {
    // Step 1: Fetch LinkedIn posts from RapidAPI
    const fetchedPosts = await fetchLinkedInPosts();
    if (!fetchedPosts || fetchedPosts.length === 0) {
      log('No posts received from API', 'WARN');
      return { success: true, new_posts: 0, message: 'No posts available' };
    }
    
    // Step 2: Load existing posts data
    const existingData = loadExistingPosts();
    
    // Step 3: Detect new posts
    const newPosts = detectNewPosts(fetchedPosts, existingData);
    
    if (newPosts.length === 0) {
      log('No new posts found, sync complete');
      
      // Update sync report even if no new posts
      const report = generateSyncReport([], (existingData.posts || []).length);
      report.performance.sync_duration_ms = Date.now() - startTime;
      fs.writeFileSync(CONFIG.LAST_SYNC_FILE, JSON.stringify(report, null, 2));
      
      return {
        success: true,
        new_posts: 0,
        message: 'No new posts to sync'
      };
    }
    
    // Step 4: Create blog posts for new content
    const createdFiles = [];
    for (const post of newPosts) {
      try {
        const filepath = createBlogPost(post);
        createdFiles.push(filepath);
      } catch (error) {
        log(`Error creating blog post for: ${post.title.substring(0, 50)}... - ${error.message}`, 'ERROR');
      }
    }
    
    // Step 5: Update posts data
    const updatedData = updatePostsData(existingData, newPosts);
    
    // Step 6: Generate sync report
    const report = generateSyncReport(newPosts, updatedData.posts.length);
    report.performance.sync_duration_ms = Date.now() - startTime;
    report.performance.posts_per_minute = Math.round((newPosts.length / (report.performance.sync_duration_ms / 60000)) * 100) / 100;
    fs.writeFileSync(CONFIG.LAST_SYNC_FILE, JSON.stringify(report, null, 2));
    
    // Step 7: Log success
    log(`✅ Sync completed successfully! ${newPosts.length} new posts synchronized`);
    log(`📁 Created ${createdFiles.length} blog post files`);
    log(`📊 Total posts in system: ${updatedData.posts.length}`);
    log(`⏱️ Sync duration: ${report.performance.sync_duration_ms}ms`);
    
    return {
      success: true,
      new_posts: newPosts.length,
      created_files: createdFiles.length,
      total_posts: updatedData.posts.length,
      sync_duration: report.performance.sync_duration_ms,
      report: report
    };
    
  } catch (error) {
    log(`❌ Fatal error during sync: ${error.message}`, 'ERROR');
    log(error.stack, 'ERROR');
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Export for use as module
module.exports = {
  main,
  fetchLinkedInPosts,
  detectNewPosts,
  createBlogPost,
  CONFIG
};

// Run if called directly
if (require.main === module) {
  main()
    .then(result => {
      if (result.success) {
        log(`🎉 SYNC COMPLETE: ${result.new_posts} new posts processed`);
        process.exit(0);
      } else {
        log(`💥 SYNC FAILED: ${result.error}`, 'ERROR');
        process.exit(1);
      }
    })
    .catch(error => {
      log(`💀 FATAL ERROR: ${error.message}`, 'ERROR');
      process.exit(1);
    });
}