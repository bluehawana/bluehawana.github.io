#!/usr/bin/env node

/**
 * LinkedIn Post Extractor
 * Automatically extracts post content from LinkedIn URLs
 */

const https = require('https');
const fs = require('fs');

/**
 * Extract LinkedIn post content from URL
 */
async function extractLinkedInPost(url) {
  return new Promise((resolve, reject) => {
    // Extract activity ID from URL
    const activityIdMatch = url.match(/activity[:\-](\d+)/);
    if (!activityIdMatch) {
      reject(new Error('Invalid LinkedIn URL - no activity ID found'));
      return;
    }
    
    const activityId = activityIdMatch[1];
    console.log(`🔍 Extracting post: ${activityId}`);

    // Make request to LinkedIn URL
    const options = {
      hostname: 'www.linkedin.com',
      path: `/feed/update/urn:li:activity:${activityId}/`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          // Extract post content from HTML
          const postContent = extractPostFromHTML(data, activityId);
          resolve(postContent);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Extract post information from LinkedIn HTML
 */
function extractPostFromHTML(html, activityId) {
  console.log('🔄 Parsing HTML content...');
  
  // Try multiple extraction methods
  let content = '';
  let title = '';
  
  // Method 1: Look for JSON-LD structured data
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  if (jsonLdMatch) {
    try {
      const jsonData = JSON.parse(jsonLdMatch[1]);
      if (jsonData.text) {
        content = jsonData.text;
      }
    } catch (e) {
      // Continue to next method
    }
  }
  
  // Method 2: Look for meta description
  const metaDescMatch = html.match(/<meta name="description" content="(.*?)"/);
  if (metaDescMatch && !content) {
    content = metaDescMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  }
  
  // Method 3: Look for Open Graph description
  const ogDescMatch = html.match(/<meta property="og:description" content="(.*?)"/);
  if (ogDescMatch && !content) {
    content = ogDescMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  }
  
  // Method 4: Look for title
  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  if (titleMatch) {
    const rawTitle = titleMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    // Clean up LinkedIn's title format
    title = rawTitle.replace(' | LinkedIn', '').replace(/.*?on LinkedIn: /, '').trim();
    if (!content && title) {
      content = title;
    }
  }
  
  // Generate a meaningful title from content
  if (content && !title) {
    title = content.split('\n')[0].substring(0, 50) + (content.length > 50 ? '...' : '');
  }
  
  // Extract hashtags for tags
  const hashtags = (content.match(/#\w+/g) || []).map(tag => tag.substring(1).toLowerCase());
  
  return {
    activityId: activityId,
    title: title || `LinkedIn Post ${activityId}`,
    content: content || 'Content extraction failed',
    publishedAt: new Date().toISOString(),
    url: `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`,
    tags: hashtags,
    extractedAt: new Date().toISOString(),
    method: 'html_extraction'
  };
}

/**
 * Add extracted post to the LinkedIn posts file
 */
function addPostToFile(post) {
  const postsFile = './data/linkedin-posts.json';
  
  let posts = [];
  try {
    const existingData = fs.readFileSync(postsFile, 'utf8');
    posts = JSON.parse(existingData);
  } catch (error) {
    console.log('Creating new posts file...');
  }
  
  // Check if post already exists
  const existingPost = posts.find(p => p.activityId === post.activityId);
  if (existingPost) {
    console.log('⚠️  Post already exists, updating...');
    Object.assign(existingPost, post);
  } else {
    // Add to beginning (newest first)
    posts.unshift({
      id: `linkedin-${post.activityId}`,
      title: post.title,
      text: post.content,
      publishedAt: post.publishedAt,
      url: post.url,
      linkedinUrl: post.url,
      platform: 'linkedin',
      type: 'linkedin_post',
      tags: post.tags,
      activityId: post.activityId,
      author: {
        name: "Hongzhi (Harvad) Li",
        profileUrl: "https://linkedin.com/in/hzl"
      },
      source: 'auto_extraction'
    });
  }
  
  // Keep only latest 20 posts
  posts = posts.slice(0, 20);
  
  // Save updated file
  fs.writeFileSync(postsFile, JSON.stringify(posts, null, 2));
  console.log(`✅ Added post to ${postsFile}`);
  
  return posts;
}

/**
 * Main function
 */
async function main() {
  const url = process.argv[2];
  
  if (!url) {
    console.log('LinkedIn Post Extractor');
    console.log('');
    console.log('Usage: node linkedin-post-extractor.js <linkedin-url>');
    console.log('');
    console.log('Examples:');
    console.log('  node linkedin-post-extractor.js "https://www.linkedin.com/feed/update/urn:li:activity:7364309907770126337/"');
    console.log('  node linkedin-post-extractor.js "https://www.linkedin.com/posts/activity-7364309907770126337"');
    process.exit(1);
  }
  
  try {
    console.log('🚀 LinkedIn Post Extractor');
    console.log(`📋 URL: ${url}`);
    
    const post = await extractLinkedInPost(url);
    console.log('✅ Post extracted successfully!');
    console.log(`📝 Title: ${post.title}`);
    console.log(`📄 Content: ${post.content.substring(0, 100)}...`);
    console.log(`🏷️  Tags: ${post.tags.join(', ')}`);
    
    const posts = addPostToFile(post);
    
    console.log('');
    console.log('🎉 Post added to your blog!');
    console.log(`📊 Total posts: ${posts.length}`);
    console.log('🌐 Your blog will update automatically');
    
  } catch (error) {
    console.error('❌ Extraction failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { extractLinkedInPost, addPostToFile };