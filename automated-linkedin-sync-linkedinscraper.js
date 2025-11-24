#!/usr/bin/env node

/**
 * LinkedIn Sync Script - LinkedIn Scraper API Edition
 * Uses linkedinscraper.p.rapidapi.com for reliable LinkedIn data
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
  RAPIDAPI_KEY: process.env.RAPIDAPI_KEY,
  PROFILE_URN: process.env.LINKEDIN_PROFILE_URN || 'urn:li:fsd_profile:ACoAAAnSTvABXgay-z5smZQ1OOq0MblgiB2GRLI', // Harvad Li
  PROFILE_ID: 'hzl',
  MAX_POSTS_TO_SYNC: 20,
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
 * Download image from URL
 */
async function downloadImage(imageUrl, postId) {
  return new Promise((resolve, reject) => {
    if (!imageUrl || imageUrl.trim() === '') {
      resolve(null);
      return;
    }

    try {
      const hash = crypto.createHash('md5').update(imageUrl).digest('hex');
      const ext = imageUrl.match(/\.(jpg|jpeg|png|gif|webp)/i)?.[1] || 'jpg';
      const filename = `${postId}-${hash}.${ext}`;
      const filepath = path.join(CONFIG.IMAGES_DIR, filename);

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

/**
 * Fetch LinkedIn profile posts using LinkedIn Scraper API
 */
async function fetchLinkedInPosts() {
  return new Promise((resolve, reject) => {
    const encodedUrn = encodeURIComponent(CONFIG.PROFILE_URN);

    const options = {
      hostname: 'linkedinscraper.p.rapidapi.com',
      path: `/profile-posts?urn=${encodedUrn}`,
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'linkedinscraper.p.rapidapi.com',
        'x-rapidapi-key': CONFIG.RAPIDAPI_KEY
      },
      timeout: 60000
    };

    log('Fetching LinkedIn posts via LinkedIn Scraper API...');
    log(`Profile URN: ${CONFIG.PROFILE_URN}`);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          log(`API Response Status: ${res.statusCode}`);
          log(`Response size: ${data.length} bytes`);

          if (res.statusCode === 200) {
            const jsonData = JSON.parse(data);

            // Save raw response for debugging
            const debugPath = path.join(CONFIG.OUTPUT_DIR, 'last-api-response.json');
            fs.writeFileSync(debugPath, JSON.stringify(jsonData, null, 2));
            log(`Saved API response to ${debugPath}`);

            log(`Posts fetched successfully: ${jsonData.data?.length || 0} posts`);
            resolve(jsonData);
          } else {
            log(`API returned status ${res.statusCode}: ${data.substring(0, 500)}`, 'ERROR');
            reject(new Error(`API returned status ${res.statusCode}`));
          }
        } catch (error) {
          log(`Error parsing response: ${error.message}`, 'ERROR');
          log(`Response data: ${data.substring(0, 500)}`, 'ERROR');
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      log(`Request error: ${error.message}`, 'ERROR');
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      log('Request timeout', 'ERROR');
      reject(new Error('Request timeout'));
    });

    req.end();
  });
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

async function extractNewPosts(apiResponse, existingPosts) {
  log('Extracting new posts from API response...');

  const existingLinks = new Set((existingPosts.posts || []).map(p => p.link));
  log(`Found ${existingLinks.size} existing posts in database`);

  const newPosts = [];
  const skippedDuplicates = [];
  const currentDate = new Date().toISOString();

  // The API should return posts in data array
  const posts = apiResponse.data || apiResponse.posts || [];

  if (!Array.isArray(posts)) {
    log('API response does not contain posts array', 'ERROR');
    log(`Response structure: ${JSON.stringify(Object.keys(apiResponse))}`, 'ERROR');
    return [];
  }

  log(`Processing ${posts.length} posts from API`);

  for (const [index, post] of posts.entries()) {
    // Build the post URL
    const postUrl = post.shareUrl || post.url || post.postUrl || post.link || '';

    log(`Post ${index + 1}: ${postUrl || 'No URL'}`);

    if (existingLinks.has(postUrl)) {
      log(`  ⏭️  Skipping duplicate`);
      skippedDuplicates.push(postUrl);
      continue;
    }

    // Extract text from commentary field
    const text = post.commentary || post.text || post.content?.text || '';

    if (!text || (typeof text === 'string' && text.trim().length < 10)) {
      log(`  ⏭️  Skipping: empty or too short`);
      continue;
    }

    log(`  ✅ New post found: ${text.substring(0, 50)}...`);

    const postId = `linkedin-${Date.now()}-${index}`;

    // Extract image - get first image from content.images array
    let localImagePath = null;
    const imageUrl = post.content?.images?.[0]?.url || post.image || post.imageUrl;

    if (imageUrl) {
      localImagePath = await downloadImage(imageUrl, postId);
    }

    // Extract engagement stats from activity object
    const likes = post.activity?.numLikes || 0;
    const comments = post.activity?.numComments || 0;
    const shares = post.activity?.numShares || 0;

    const newPost = {
      id: postId,
      platform: 'linkedin',
      author: 'Harvad Li',
      author_profile: `https://www.linkedin.com/in/${CONFIG.PROFILE_ID}`,
      title: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      content: text,
      link: postUrl,
      image: imageUrl || '',
      local_image: localImagePath || '',
      extracted_at: currentDate,
      source: 'linkedinscraper-rapidapi',
      engagement: {
        likes: likes,
        comments: comments,
        shares: shares
      },
      posted_at: post.postedAt || post.createdAt || currentDate
    };

    newPosts.push(newPost);
  }

  log(`Summary: ${newPosts.length} new posts, ${skippedDuplicates.length} duplicates skipped`);
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
extract_method: "linkedinscraper-rapidapi"
sync_date: "${new Date().toISOString()}"
${post.local_image ? `featured_image: "${post.local_image}"` : ''}
linkedin_stats:
  likes: ${post.engagement.likes}
  comments: ${post.engagement.comments}
  shares: ${post.engagement.shares}
---

${post.content}

${imageMarkdown}

---

**Engagement:** 👍 ${post.engagement.likes} likes • 💬 ${post.engagement.comments} comments • 🔄 ${post.engagement.shares} shares

*This post was automatically synced from LinkedIn on ${new Date().toLocaleDateString()}.*

**Original LinkedIn Post:** [View on LinkedIn](${post.link})
`;

  fs.writeFileSync(filepath, blogContent);
  log(`Created blog post: ${filename}`);

  return filepath;
}

function updatePostsData(existingData, newPosts) {
  const updatedData = {
    profile: {
      name: "Harvad Li",
      linkedin_url: "https://www.linkedin.com/in/hzl/",
      public_identifier: "hzl",
      last_sync: new Date().toISOString()
    },
    extraction: {
      date: new Date().toISOString(),
      method: "linkedinscraper-rapidapi",
      total_posts_found: (existingData.posts || []).length + newPosts.length,
      new_posts_this_sync: newPosts.length,
      images_downloaded: newPosts.filter(p => p.local_image).length
    },
    posts: [...(existingData.posts || []), ...newPosts]
  };

  fs.writeFileSync(CONFIG.DATA_FILE, JSON.stringify(updatedData, null, 2));
  log(`Updated posts data file with ${newPosts.length} new posts`);

  const webData = updatedData.posts.map(post => ({
    id: post.id,
    content: post.content || post.title,
    url: post.link,
    image: post.local_image || post.image || '',
    tags: post.tags || [],
    publishedAt: post.posted_at || post.extracted_at,
    engagement: post.engagement || { likes: 0, comments: 0, shares: 0 }
  }));

  const dataDir = path.dirname(CONFIG.WEB_DATA_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(CONFIG.WEB_DATA_FILE, JSON.stringify(webData, null, 2));
  log(`Updated web data file for blog display`);

  return updatedData;
}

function generateSyncReport(newPosts, totalPosts) {
  const report = {
    sync_timestamp: new Date().toISOString(),
    profile_name: 'Harvad Li',
    new_posts_synced: newPosts.length,
    images_downloaded: newPosts.filter(p => p.local_image).length,
    total_posts_in_system: totalPosts,
    api_status: 'working',
    api_method: 'linkedinscraper-rapidapi',
    next_sync_recommended: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    new_posts: newPosts.map(post => ({
      title: post.title,
      link: post.link,
      has_image: !!post.local_image,
      engagement: post.engagement,
      sync_date: post.extracted_at
    }))
  };

  const reportPath = path.join(CONFIG.OUTPUT_DIR, 'last-sync-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return report;
}

async function main() {
  log('Starting LinkedIn sync via LinkedIn Scraper API', 'INFO');

  if (!CONFIG.RAPIDAPI_KEY) {
    log('ERROR: RAPIDAPI_KEY environment variable is required', 'ERROR');
    return { success: false, error: 'Missing RAPIDAPI_KEY' };
  }

  try {
    const apiResponse = await fetchLinkedInPosts();

    const existingData = loadExistingPosts();
    const newPosts = await extractNewPosts(apiResponse, existingData);

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
        log(`Error creating blog post: ${error.message}`, 'ERROR');
      }
    }

    const updatedData = updatePostsData(existingData, newPosts);
    const report = generateSyncReport(newPosts, updatedData.posts.length);

    log(`Sync completed! ${newPosts.length} new posts, ${newPosts.filter(p => p.local_image).length} images`);

    return {
      success: true,
      new_posts: newPosts.length,
      images_downloaded: newPosts.filter(p => p.local_image).length,
      created_files: createdFiles.length,
      total_posts: updatedData.posts.length,
      report: report
    };

  } catch (error) {
    log(`Fatal error: ${error.message}`, 'ERROR');
    log(error.stack, 'ERROR');

    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { main };

if (require.main === module) {
  main()
    .then(result => {
      if (result.success) {
        log(`SUCCESS: ${result.new_posts} posts, ${result.images_downloaded || 0} images`);
        process.exit(0);
      } else {
        log(`FAILED: ${result.error}`, 'ERROR');
        process.exit(1);
      }
    })
    .catch(error => {
      log(`FATAL: ${error.message}`, 'ERROR');
      process.exit(1);
    });
}
