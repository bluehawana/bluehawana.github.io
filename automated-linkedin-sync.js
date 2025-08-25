#!/usr/bin/env node

/**
 * Automated LinkedIn Sync Script for Harvad Li
 * This script can be run on a schedule (cron job, GitHub Actions, etc.)
 * to automatically sync new LinkedIn posts to the blog
 * 
 * Usage:
 * - Run manually: node automated-linkedin-sync.js
 * - Run with cron: 0 *\/6 * * * /path/to/node automated-linkedin-sync.js  (every 6 hours)
 * - GitHub Actions: scheduled workflow
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  SCRAPINGDOG_API_KEY: process.env.SCRAPINGDOG_API_KEY,
  PROFILE_ID: 'hzl',
  LINKEDIN_API_URL: 'https://api.scrapingdog.com/linkedin',
  MAX_POSTS_TO_SYNC: 10, // Limit to avoid quota issues
  OUTPUT_DIR: path.join(__dirname, '_data'),
  POSTS_DIR: path.join(__dirname, '_posts'),
  DATA_FILE: path.join(__dirname, '_data', 'linkedin-posts.json'),
  WEB_DATA_FILE: path.join(__dirname, 'data', 'linkedin-posts.json'), // For website display
  SYNC_LOG_FILE: path.join(__dirname, 'sync.log')
};

// Ensure directories exist
[CONFIG.OUTPUT_DIR, CONFIG.POSTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${level}: ${message}`;
  console.log(logMessage);
  
  // Append to log file
  fs.appendFileSync(CONFIG.SYNC_LOG_FILE, logMessage + '\n');
}

async function makeHttpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 LinkedIn-Sync-Bot/1.0',
        ...options.headers
      },
      timeout: 60000
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, raw: data });
        } catch (error) {
          resolve({ status: res.statusCode, data: data, raw: data });
        }
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

async function fetchLinkedInProfile() {
  const profileUrl = `https://api.scrapingdog.com/linkedin/?api_key=${CONFIG.SCRAPINGDOG_API_KEY}&type=profile&linkId=${CONFIG.PROFILE_ID}`;
  
  try {
    log('Fetching LinkedIn profile data...');
    const response = await makeHttpRequest(profileUrl);
    
    if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
      log('Profile data fetched successfully');
      return response.data[0];
    }
    
    throw new Error(`API returned status ${response.status}`);
  } catch (error) {
    log(`Error fetching profile: ${error.message}`, 'ERROR');
    return null;
  }
}

function loadExistingPosts() {
  if (!fs.existsSync(CONFIG.DATA_FILE)) {
    log('No existing posts file found, starting fresh');
    return { posts: [] };
  }
  
  try {
    const data = fs.readFileSync(CONFIG.DATA_FILE, 'utf8');
    const postsData = JSON.parse(data);
    log(`Loaded ${postsData.posts ? postsData.posts.length : 0} existing posts`);
    return postsData;
  } catch (error) {
    log(`Error loading existing posts: ${error.message}`, 'ERROR');
    return { posts: [] };
  }
}

function extractNewPosts(profile, existingPosts) {
  log('Extracting new posts from profile...');
  
  const existingLinks = new Set((existingPosts.posts || []).map(p => p.link));
  const newPosts = [];
  const currentDate = new Date().toISOString();
  
  // Extract from activities (his posts)
  if (profile.activities && Array.isArray(profile.activities)) {
    profile.activities.forEach((activity, index) => {
      // Skip if we already have this post
      if (existingLinks.has(activity.link)) {
        return;
      }
      
      // Only include his own shared posts or original posts
      const isOwnPost = activity.activity && 
        (activity.activity.toLowerCase().includes('shared by harvad li') ||
         !activity.activity.toLowerCase().includes('liked by'));
      
      if (isOwnPost && activity.title && activity.title.trim() !== '') {
        const post = {
          id: `activity-${Date.now()}-${index}`,
          platform: 'linkedin',
          author: profile.fullName || 'Harvad Li',
          author_profile: `https://www.linkedin.com/in/${profile.public_identifier}`,
          title: activity.title,
          content: activity.title,
          activity_type: activity.activity && activity.activity.toLowerCase().includes('shared') ? 'shared' : 'original',
          link: activity.link || '',
          image: activity.image || '',
          extracted_at: currentDate,
          source: 'scrapingdog-api',
          is_own_post: true
        };
        
        newPosts.push(post);
      }
    });
  }
  
  // Extract from articles (his published articles)
  if (profile.articles && Array.isArray(profile.articles)) {
    profile.articles.forEach((article, index) => {
      if (existingLinks.has(article.link)) {
        return;
      }
      
      const post = {
        id: `article-${Date.now()}-${index}`,
        platform: 'linkedin',
        author: profile.fullName || 'Harvad Li',
        author_profile: `https://www.linkedin.com/in/${profile.public_identifier}`,
        title: article.title || '',
        content: article.title || '',
        activity_type: 'article',
        link: article.link || '',
        image: article.image || '',
        published_date: article.published_date || '',
        extracted_at: currentDate,
        source: 'scrapingdog-api',
        is_own_post: true
      };
      
      newPosts.push(post);
    });
  }
  
  log(`Found ${newPosts.length} new posts to sync`);
  return newPosts.slice(0, CONFIG.MAX_POSTS_TO_SYNC); // Limit number of posts
}

function createBlogPost(post) {
  // Generate safe filename
  const titleSlug = post.title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
  
  const date = new Date().toISOString().split('T')[0];
  const filename = `${date}-linkedin-${titleSlug}.md`;
  const filepath = path.join(CONFIG.POSTS_DIR, filename);
  
  // Avoid duplicate files
  if (fs.existsSync(filepath)) {
    const timestamp = Date.now();
    const newFilename = `${date}-linkedin-${titleSlug}-${timestamp}.md`;
    return path.join(CONFIG.POSTS_DIR, newFilename);
  }
  
  // Create Jekyll blog post content
  const blogContent = `---
layout: post
title: "${post.title.replace(/"/g, '\\"')}"
date: ${date}
categories: linkedin
tags: [linkedin, social-media, automation]
linkedin_url: "${post.link}"
author: "Harvad Li"
extract_method: "scrapingdog-api"
activity_type: "${post.activity_type}"
sync_date: "${new Date().toISOString()}"
---

${post.content}

${post.image ? `\n![Post Image](${post.image})\n` : ''}

---

*This post was automatically extracted from LinkedIn using the ScrapingDog API and synchronized on ${new Date().toLocaleDateString()}.*

**Original LinkedIn Post:** [View on LinkedIn](${post.link})
`;
  
  // Write blog post file
  fs.writeFileSync(filepath, blogContent);
  log(`Created blog post: ${filename}`);
  
  return filepath;
}

function updatePostsData(existingData, newPosts, profile) {
  const updatedData = {
    profile: {
      name: profile.fullName || "Harvad Li",
      linkedin_url: "https://www.linkedin.com/in/hzl/",
      public_identifier: profile.public_identifier || "hzl",
      last_sync: new Date().toISOString()
    },
    extraction: {
      date: new Date().toISOString(),
      method: "scrapingdog-api",
      api_key_used: CONFIG.SCRAPINGDOG_API_KEY.substring(0, 8) + "...",
      total_posts_found: (existingData.posts || []).length + newPosts.length,
      new_posts_this_sync: newPosts.length
    },
    posts: [...(existingData.posts || []), ...newPosts]
  };
  
  fs.writeFileSync(CONFIG.DATA_FILE, JSON.stringify(updatedData, null, 2));
  log(`Updated posts data file with ${newPosts.length} new posts`);
  
  // Also update the web data file for the blog page
  const webData = updatedData.posts.map(post => ({
    id: post.id,
    content: post.content || post.title,
    url: post.link,
    tags: post.tags || [],
    publishedAt: post.extracted_at || new Date().toISOString(),
    activityId: post.id.replace('activity-', '').split('-')[0]
  }));
  
  // Ensure data directory exists
  const dataDir = path.dirname(CONFIG.WEB_DATA_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(CONFIG.WEB_DATA_FILE, JSON.stringify(webData, null, 2));
  log(`Updated web data file for blog display`);
  
  return updatedData;
}

function generateSyncReport(newPosts, totalPosts, profile) {
  const report = {
    sync_timestamp: new Date().toISOString(),
    profile_name: profile.fullName || 'Harvad Li',
    new_posts_synced: newPosts.length,
    total_posts_in_system: totalPosts,
    api_status: 'working',
    next_sync_recommended: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours later
    new_posts: newPosts.map(post => ({
      title: post.title.substring(0, 100) + (post.title.length > 100 ? '...' : ''),
      type: post.activity_type,
      link: post.link,
      sync_date: post.extracted_at
    }))
  };
  
  // Save report
  const reportPath = path.join(CONFIG.OUTPUT_DIR, 'last-sync-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  return report;
}

async function main() {
  log('Starting automated LinkedIn sync for Harvad Li', 'INFO');
  
  // Check API key is available
  if (!CONFIG.SCRAPINGDOG_API_KEY) {
    log('ERROR: SCRAPINGDOG_API_KEY environment variable is required', 'ERROR');
    log('Please set: export SCRAPINGDOG_API_KEY="your_api_key_here"', 'ERROR');
    return { success: false, error: 'Missing API key' };
  }
  
  try {
    // Step 1: Fetch current LinkedIn profile
    const profile = await fetchLinkedInProfile();
    if (!profile) {
      log('Failed to fetch profile, aborting sync', 'ERROR');
      process.exit(1);
    }
    
    // Step 2: Load existing posts
    const existingData = loadExistingPosts();
    
    // Step 3: Extract new posts
    const newPosts = extractNewPosts(profile, existingData);
    
    if (newPosts.length === 0) {
      log('No new posts found, sync complete');
      
      // Still update web data file to ensure it's in sync
      const webData = (existingData.posts || []).map(post => ({
        id: post.id,
        content: post.content || post.title,
        url: post.link,
        tags: post.tags || [],
        publishedAt: post.extracted_at || new Date().toISOString(),
        activityId: post.id.replace('activity-', '').split('-')[0]
      }));
      
      // Ensure data directory exists
      const dataDir = path.dirname(CONFIG.WEB_DATA_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      fs.writeFileSync(CONFIG.WEB_DATA_FILE, JSON.stringify(webData, null, 2));
      log('Updated web data file for blog display');
      
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
    const updatedData = updatePostsData(existingData, newPosts, profile);
    
    // Step 6: Generate sync report
    const report = generateSyncReport(newPosts, updatedData.posts.length, profile);
    
    // Step 7: Log success
    log(`Sync completed successfully! ${newPosts.length} new posts synchronized`);
    log(`Created ${createdFiles.length} blog post files`);
    log(`Total posts in system: ${updatedData.posts.length}`);
    
    return {
      success: true,
      new_posts: newPosts.length,
      created_files: createdFiles.length,
      total_posts: updatedData.posts.length,
      report: report
    };
    
  } catch (error) {
    log(`Fatal error during sync: ${error.message}`, 'ERROR');
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
  fetchLinkedInProfile,
  extractNewPosts,
  createBlogPost,
  CONFIG
};

// Run if called directly
if (require.main === module) {
  main()
    .then(result => {
      if (result.success) {
        log(`SYNC COMPLETE: ${result.new_posts} new posts processed`);
        process.exit(0);
      } else {
        log(`SYNC FAILED: ${result.error}`, 'ERROR');
        process.exit(1);
      }
    })
    .catch(error => {
      log(`FATAL ERROR: ${error.message}`, 'ERROR');
      process.exit(1);
    });
}