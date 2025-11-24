#!/usr/bin/env node

/**
 * LinkedIn Sync Script - RapidAPI Edition
 * Uses ScrapingDog via RapidAPI for LinkedIn profile scraping
 * Downloads posts and images automatically
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
  SCRAPINGDOG_API_KEY: process.env.SCRAPINGDOG_API_KEY,
  PROFILE_ID: 'hzl',
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
 * Fetch LinkedIn profile using RapidAPI's ScrapingDog
 */
async function fetchLinkedInProfile() {
  return new Promise((resolve, reject) => {
    // Try the activity/posts URL first for better results
    const linkedinUrl = encodeURIComponent(`https://www.linkedin.com/in/${CONFIG.PROFILE_ID}/recent-activity/all/`);

    const options = {
      hostname: 'scrapingdog.p.rapidapi.com',
      path: `/scrape?url=${linkedinUrl}&api_key=${CONFIG.SCRAPINGDOG_API_KEY}&dynamic=true&wait=5000`,
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'scrapingdog.p.rapidapi.com',
        'x-rapidapi-key': CONFIG.RAPIDAPI_KEY,
        'User-Agent': 'Mozilla/5.0 LinkedIn-Sync-Bot/1.0'
      },
      timeout: 120000
    };

    log('Fetching LinkedIn recent activity via RapidAPI...');
    log(`URL: https://www.linkedin.com/in/${CONFIG.PROFILE_ID}/recent-activity/all/`);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          log(`API Response Status: ${res.statusCode}`);
          log(`Response size: ${data.length} bytes`);

          if (res.statusCode === 200) {
            // Save HTML response for debugging
            const debugHtmlPath = path.join(CONFIG.OUTPUT_DIR, 'last-response.html');
            fs.writeFileSync(debugHtmlPath, data);
            log(`Saved HTML response to ${debugHtmlPath} for debugging`);

            // Parse the HTML response and extract profile data
            const profile = parseLinkedInHTML(data);
            log('Profile data fetched successfully');
            resolve(profile);
          } else {
            log(`API returned status ${res.statusCode}: ${data.substring(0, 200)}`, 'ERROR');
            reject(new Error(`API returned status ${res.statusCode}`));
          }
        } catch (error) {
          log(`Error parsing response: ${error.message}`, 'ERROR');
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

/**
 * Extract text content from HTML, removing tags
 */
function stripHtmlTags(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse LinkedIn HTML to extract profile data
 * This is an improved parser that extracts actual post content
 */
function parseLinkedInHTML(html) {
  const profile = {
    fullName: 'Harvad Li',
    public_identifier: 'hzl',
    activities: [],
    articles: []
  };

  // Extract activity posts from HTML
  // Look for activity URNs in the HTML
  const activityPattern = /urn:li:activity:(\d+)/g;
  const activityMatches = [...html.matchAll(activityPattern)];

  // Get unique activity IDs
  const uniqueActivityIds = [...new Set(activityMatches.map(m => m[1]))];

  log(`Found ${uniqueActivityIds.length} unique activities in HTML`);

  uniqueActivityIds.slice(0, 20).forEach((activityId, index) => {
    // Try to find the post content near this activity ID
    const activityUrn = `urn:li:activity:${activityId}`;
    const activityIndex = html.indexOf(activityUrn);

    if (activityIndex === -1) return;

    // Extract a chunk of HTML around this activity (5000 chars before and after)
    const startIndex = Math.max(0, activityIndex - 5000);
    const endIndex = Math.min(html.length, activityIndex + 5000);
    const chunk = html.substring(startIndex, endIndex);

    // Try to extract post text content
    // Look for common LinkedIn post content patterns
    let title = '';
    let image = '';

    // Try to find post text in various containers
    const textPatterns = [
      /<div[^>]*class="[^"]*feed-shared-update-v2__description[^"]*"[^>]*>([\s\S]{0,2000}?)<\/div>/i,
      /<span[^>]*class="[^"]*break-words[^"]*"[^>]*>([\s\S]{0,2000}?)<\/span>/i,
      /<div[^>]*class="[^"]*attributed-text-segment-list__content[^"]*"[^>]*>([\s\S]{0,2000}?)<\/div>/i,
      /<p[^>]*class="[^"]*attributed-text[^"]*"[^>]*>([\s\S]{0,2000}?)<\/p>/i
    ];

    for (const pattern of textPatterns) {
      const match = chunk.match(pattern);
      if (match && match[1]) {
        const extracted = stripHtmlTags(match[1]);
        if (extracted.length > 20 && extracted.length < 1000) {
          title = extracted;
          break;
        }
      }
    }

    // Try to find images
    const imagePattern = /<img[^>]*src="([^"]*)"[^>]*>/gi;
    const imageMatches = [...chunk.matchAll(imagePattern)];
    if (imageMatches.length > 0) {
      // Get the first image that looks like a post image (not profile pic)
      for (const imgMatch of imageMatches) {
        const imgUrl = imgMatch[1];
        if (imgUrl && !imgUrl.includes('profile') && !imgUrl.includes('icon')) {
          image = imgUrl;
          break;
        }
      }
    }

    // If we couldn't extract a good title, create a placeholder
    if (!title || title.length < 10) {
      title = `LinkedIn Activity ${activityId.substring(0, 10)}...`;
      log(`Could not extract text for activity ${activityId}, using placeholder`, 'WARN');
    } else {
      // Truncate title if too long
      if (title.length > 200) {
        title = title.substring(0, 197) + '...';
      }
      log(`Extracted post: "${title.substring(0, 50)}..."`);
    }

    profile.activities.push({
      link: `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`,
      title: title,
      activity: 'shared by Harvad Li',
      image: image
    });
  });

  log(`Parsed ${profile.activities.length} activities with content from HTML`);
  return profile;
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
  log(`Found ${existingLinks.size} existing posts in database`);

  const newPosts = [];
  const skippedDuplicates = [];
  const currentDate = new Date().toISOString();

  if (profile.activities && Array.isArray(profile.activities)) {
    log(`Processing ${profile.activities.length} activities from profile`);

    for (const [index, activity] of profile.activities.entries()) {
      log(`Activity ${index + 1}: ${activity.link}`);

      if (existingLinks.has(activity.link)) {
        log(`  ⏭️  Skipping duplicate: ${activity.title.substring(0, 50)}...`);
        skippedDuplicates.push(activity.link);
        continue;
      }

      const isOwnPost = activity.activity &&
        (activity.activity.toLowerCase().includes('shared by harvad li') ||
         !activity.activity.toLowerCase().includes('liked by'));

      if (isOwnPost && activity.title && activity.title.trim() !== '') {
        log(`  ✅ New post found: ${activity.title.substring(0, 50)}...`);
        const postId = `activity-${Date.now()}-${index}`;

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
          source: 'rapidapi-scrapingdog',
          is_own_post: true
        };

        newPosts.push(post);
      } else {
        log(`  ⏭️  Skipping: not own post or empty title`);
      }
    }
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
extract_method: "rapidapi-scrapingdog"
activity_type: "${post.activity_type}"
sync_date: "${new Date().toISOString()}"
${post.local_image ? `featured_image: "${post.local_image}"` : ''}
---

${post.content}

${imageMarkdown}

---

*This post was automatically synced from LinkedIn on ${new Date().toLocaleDateString()}.*

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
      method: "rapidapi-scrapingdog",
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
    api_method: 'rapidapi-scrapingdog',
    next_sync_recommended: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
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
  log('Starting LinkedIn sync via RapidAPI', 'INFO');

  if (!CONFIG.RAPIDAPI_KEY) {
    log('ERROR: RAPIDAPI_KEY environment variable is required', 'ERROR');
    return { success: false, error: 'Missing RAPIDAPI_KEY' };
  }

  if (!CONFIG.SCRAPINGDOG_API_KEY) {
    log('ERROR: SCRAPINGDOG_API_KEY environment variable is required', 'ERROR');
    return { success: false, error: 'Missing SCRAPINGDOG_API_KEY' };
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
        log(`Error creating blog post: ${error.message}`, 'ERROR');
      }
    }

    const updatedData = updatePostsData(existingData, newPosts, profile);
    const report = generateSyncReport(newPosts, updatedData.posts.length, profile);

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
