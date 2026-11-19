#!/usr/bin/env node

/**
 * Enhanced LinkedIn Sync Script with Image Download
 * Downloads images from LinkedIn posts and saves them locally
 *
 * Usage: node automated-linkedin-sync-with-images.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables
function loadEnvFile(filepath) {
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

loadEnvFile(path.join(__dirname, '.env'));
loadEnvFile(path.join(__dirname, '.env.local'));

// Configuration
const CONFIG = {
  SCRAPINGDOG_API_KEY: process.env.SCRAPINGDOG_API_KEY,
  PROFILE_ID: 'hzl',
  LINKEDIN_API_URL: 'https://api.scrapingdog.com/linkedin',
  MAX_POSTS_TO_SYNC: 10,
  OUTPUT_DIR: path.join(__dirname, '_data'),
  POSTS_DIR: path.join(__dirname, '_posts'),
  IMAGES_DIR: path.join(__dirname, 'images', 'linkedin'),
  DATA_FILE: path.join(__dirname, '_data', 'linkedin-posts.json'),
  WEB_DATA_FILE: path.join(__dirname, 'data', 'linkedin-posts.json'),
  SYNC_LOG_FILE: path.join(__dirname, 'sync.log')
};

// Ensure directories exist
[CONFIG.OUTPUT_DIR, CONFIG.POSTS_DIR, CONFIG.IMAGES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${level}: ${message}`;
  console.log(logMessage);
  fs.appendFileSync(CONFIG.SYNC_LOG_FILE, logMessage + '\n');
}

/**
 * Download image from URL and save locally
 */
async function downloadImage(imageUrl, postId) {
  return new Promise((resolve, reject) => {
    if (!imageUrl || imageUrl.trim() === '') {
      resolve(null);
      return;
    }

    try {
      // Generate unique filename based on URL hash
      const hash = crypto.createHash('md5').update(imageUrl).digest('hex');
      const ext = imageUrl.match(/\.(jpg|jpeg|png|gif|webp)/i)?.[1] || 'jpg';
      const filename = `${postId}-${hash}.${ext}`;
      const filepath = path.join(CONFIG.IMAGES_DIR, filename);

      // Skip if already downloaded
      if (fs.existsSync(filepath)) {
        log(`Image already exists: ${filename}`);
        resolve(`/images/linkedin/${filename}`);
        return;
      }

      log(`Downloading image: ${imageUrl.substring(0, 100)}...`);

      const protocol = imageUrl.startsWith('https') ? https : http;
      const file = fs.createWriteStream(filepath);

      protocol.get(imageUrl, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            log(`Image saved: ${filename}`);
            resolve(`/images/linkedin/${filename}`);
          });
        } else if (response.statusCode === 301 || response.statusCode === 302) {
          // Handle redirects
          file.close();
          fs.unlinkSync(filepath);
          downloadImage(response.headers.location, postId)
            .then(resolve)
            .catch(reject);
        } else {
          file.close();
          fs.unlinkSync(filepath);
          log(`Failed to download image: HTTP ${response.statusCode}`, 'WARN');
          resolve(null);
        }
      }).on('error', (err) => {
        file.close();
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        log(`Error downloading image: ${err.message}`, 'ERROR');
        resolve(null);
      });
    } catch (error) {
      log(`Error in downloadImage: ${error.message}`, 'ERROR');
      resolve(null);
    }
  });
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

async function extractNewPosts(profile, existingPosts) {
  log('Extracting new posts from profile...');

  const existingLinks = new Set((existingPosts.posts || []).map(p => p.link));
  const newPosts = [];
  const currentDate = new Date().toISOString();

  // Extract from activities
  if (profile.activities && Array.isArray(profile.activities)) {
    for (const [index, activity] of profile.activities.entries()) {
      if (existingLinks.has(activity.link)) continue;

      const isOwnPost = activity.activity &&
        (activity.activity.toLowerCase().includes('shared by harvad li') ||
         !activity.activity.toLowerCase().includes('liked by'));

      if (isOwnPost && activity.title && activity.title.trim() !== '') {
        const postId = `activity-${Date.now()}-${index}`;

        // Download image if available
        let localImagePath = null;
        if (activity.image) {
          localImagePath = await downloadImage(activity.image, postId);
        }

        const post = {
          id: postId,
          platform: 'linkedin',
          author: profile.fullName || 'Harvad Li',
          author_profile: `https://www.linkedin.com/in/${profile.public_identifier}`,
          title: activity.title,
          content: activity.title,
          activity_type: activity.activity && activity.activity.toLowerCase().includes('shared') ? 'shared' : 'original',
          link: activity.link || '',
          image: activity.image || '',
          local_image: localImagePath || '',
          extracted_at: currentDate,
          source: 'scrapingdog-api',
          is_own_post: true
        };

        newPosts.push(post);
      }
    }
  }

  // Extract from articles
  if (profile.articles && Array.isArray(profile.articles)) {
    for (const [index, article] of profile.articles.entries()) {
      if (existingLinks.has(article.link)) continue;

      const postId = `article-${Date.now()}-${index}`;

      // Download image if available
      let localImagePath = null;
      if (article.image) {
        localImagePath = await downloadImage(article.image, postId);
      }

      const post = {
        id: postId,
        platform: 'linkedin',
        author: profile.fullName || 'Harvad Li',
        author_profile: `https://www.linkedin.com/in/${profile.public_identifier}`,
        title: article.title || '',
        content: article.title || '',
        activity_type: 'article',
        link: article.link || '',
        image: article.image || '',
        local_image: localImagePath || '',
        published_date: article.published_date || '',
        extracted_at: currentDate,
        source: 'scrapingdog-api',
        is_own_post: true
      };

      newPosts.push(post);
    }
  }

  log(`Found ${newPosts.length} new posts to sync (with ${newPosts.filter(p => p.local_image).length} images downloaded)`);
  return newPosts.slice(0, CONFIG.MAX_POSTS_TO_SYNC);
}

function createBlogPost(post) {
  const titleSlug = post.title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);

  const date = new Date().toISOString().split('T')[0];
  const filename = `${date}-linkedin-${titleSlug}.md`;
  const filepath = path.join(CONFIG.POSTS_DIR, filename);

  if (fs.existsSync(filepath)) {
    const timestamp = Date.now();
    return path.join(CONFIG.POSTS_DIR, `${date}-linkedin-${titleSlug}-${timestamp}.md`);
  }

  // Use local image if available, otherwise use external URL
  const imageMarkdown = post.local_image
    ? `\n![Post Image](${post.local_image})\n`
    : (post.image ? `\n![Post Image](${post.image})\n` : '');

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
${post.local_image ? `featured_image: "${post.local_image}"` : ''}
---

${post.content}

${imageMarkdown}

---

*This post was automatically extracted from LinkedIn and synchronized on ${new Date().toLocaleDateString()}.*

**Original LinkedIn Post:** [View on LinkedIn](${post.link})
`;

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
      method: "scrapingdog-api-with-images",
      api_key_used: CONFIG.SCRAPINGDOG_API_KEY.substring(0, 8) + "...",
      total_posts_found: (existingData.posts || []).length + newPosts.length,
      new_posts_this_sync: newPosts.length,
      images_downloaded: newPosts.filter(p => p.local_image).length
    },
    posts: [...(existingData.posts || []), ...newPosts]
  };

  fs.writeFileSync(CONFIG.DATA_FILE, JSON.stringify(updatedData, null, 2));
  log(`Updated posts data file with ${newPosts.length} new posts`);

  // Update web data file
  const webData = updatedData.posts.map(post => ({
    id: post.id,
    content: post.content || post.title,
    url: post.link,
    image: post.local_image || post.image || '',
    tags: post.tags || [],
    publishedAt: post.extracted_at || new Date().toISOString(),
    activityId: post.id.replace('activity-', '').split('-')[0]
  }));

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
    images_downloaded: newPosts.filter(p => p.local_image).length,
    total_posts_in_system: totalPosts,
    api_status: 'working',
    next_sync_recommended: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
    new_posts: newPosts.map(post => ({
      title: post.title.substring(0, 100) + (post.title.length > 100 ? '...' : ''),
      type: post.activity_type,
      link: post.link,
      has_image: !!post.local_image,
      sync_date: post.extracted_at
    }))
  };

  const reportPath = path.join(CONFIG.OUTPUT_DIR, 'last-sync-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return report;
}

async function main() {
  log('Starting automated LinkedIn sync with image download', 'INFO');

  if (!CONFIG.SCRAPINGDOG_API_KEY) {
    log('ERROR: SCRAPINGDOG_API_KEY environment variable is required', 'ERROR');
    return { success: false, error: 'Missing API key' };
  }

  try {
    const profile = await fetchLinkedInProfile();
    if (!profile) {
      log('Failed to fetch profile, aborting sync', 'ERROR');
      process.exit(1);
    }

    const existingData = loadExistingPosts();
    const newPosts = await extractNewPosts(profile, existingData);

    if (newPosts.length === 0) {
      log('No new posts found, sync complete');
      return { success: true, new_posts: 0, message: 'No new posts to sync' };
    }

    const createdFiles = [];
    for (const post of newPosts) {
      try {
        const filepath = createBlogPost(post);
        createdFiles.push(filepath);
      } catch (error) {
        log(`Error creating blog post for: ${post.title.substring(0, 50)}... - ${error.message}`, 'ERROR');
      }
    }

    const updatedData = updatePostsData(existingData, newPosts, profile);
    const report = generateSyncReport(newPosts, updatedData.posts.length, profile);

    log(`Sync completed successfully! ${newPosts.length} new posts synchronized`);
    log(`Downloaded ${newPosts.filter(p => p.local_image).length} images`);
    log(`Created ${createdFiles.length} blog post files`);
    log(`Total posts in system: ${updatedData.posts.length}`);

    return {
      success: true,
      new_posts: newPosts.length,
      images_downloaded: newPosts.filter(p => p.local_image).length,
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
module.exports = { main };

// Run if called directly
if (require.main === module) {
  main()
    .then(result => {
      if (result.success) {
        log(`SYNC COMPLETE: ${result.new_posts} new posts, ${result.images_downloaded || 0} images downloaded`);
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
