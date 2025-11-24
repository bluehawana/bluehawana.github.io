/**
 * Netlify Function: Extract LinkedIn Post
 * Uses multiple methods to extract LinkedIn post content
 */

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { url } = JSON.parse(event.body || '{}');
    
    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'URL is required' })
      };
    }

    // Extract activity ID from URL
    const activityIdMatch = url.match(/activity[:\-](\d+)/);
    if (!activityIdMatch) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid LinkedIn URL' })
      };
    }

    const activityId = activityIdMatch[1];
    
    // Method 1: Try using a third-party service
    let postData = null;
    
    try {
      // You can integrate with services like:
      // - Proxycurl LinkedIn API
      // - ScraperAPI
      // - Bright Data LinkedIn API
      // - RapidAPI LinkedIn scrapers
      
      // Example with a generic scraping approach:
      const scraperResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BlogBot/1.0)'
        }
      });
      
      const html = await scraperResponse.text();
      
      // Extract content from meta tags
      const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
      const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
      
      if (titleMatch || descMatch) {
        const content = descMatch ? descMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&') : '';
        const title = titleMatch ? titleMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&') : 'LinkedIn Post';
        
        postData = {
          activityId,
          title: title.replace(' on LinkedIn', '').trim(),
          content: content,
          url: `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`,
          tags: (content.match(/#\w+/g) || []).map(tag => tag.substring(1).toLowerCase())
        };
      }
    } catch (error) {
      console.log('Scraping failed:', error.message);
    }

    // Method 2: Manual content with activity ID
    if (!postData) {
      postData = {
        activityId,
        title: `LinkedIn Post ${activityId}`,
        content: `Please update this content manually. Activity ID: ${activityId}`,
        url: `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`,
        tags: []
      };
    }

    // Add to posts
    const fs = require('fs').promises;
    const path = require('path');
    
    const postsPath = path.join(__dirname, '../../data/linkedin-posts.json');
    let posts = [];
    
    try {
      const data = await fs.readFile(postsPath, 'utf8');
      posts = JSON.parse(data);
    } catch (e) {
      // File doesn't exist yet
    }

    // Check if post already exists
    const existingIndex = posts.findIndex(p => p.activityId === activityId);
    
    const newPost = {
      id: `linkedin-${activityId}`,
      title: postData.title,
      text: postData.content,
      publishedAt: new Date().toISOString(),
      url: postData.url,
      linkedinUrl: postData.url,
      platform: 'linkedin',
      type: 'linkedin_post',
      tags: postData.tags,
      activityId: activityId,
      author: {
        name: "Hongzhi (Harvad) Li",
        profileUrl: "https://linkedin.com/in/hzl"
      },
      source: 'quick_add'
    };

    if (existingIndex >= 0) {
      posts[existingIndex] = newPost;
    } else {
      posts.unshift(newPost);
    }

    // Keep only latest 20 posts
    posts = posts.slice(0, 20);

    await fs.writeFile(postsPath, JSON.stringify(posts, null, 2));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        post: newPost,
        message: 'Post added successfully'
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};