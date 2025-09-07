#!/usr/bin/env node

/**
 * LinkedIn Hybrid Sync System
 * Combines API access with manual post management for complete LinkedIn-to-blog integration
 * 
 * Since LinkedIn's w_member_social scope has limited read access in 2024+,
 * this system provides multiple sync methods:
 * 1. OAuth-authenticated user info (working)
 * 2. Manual post URL submission (working)
 * 3. Third-party API integration (optional)
 * 4. Automated monitoring and sync triggers
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

const ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN || 'AQXaVmzjEmCown_3bbfd9y8K5bvw7R6jNPZ6c-7etLwLQci7Dy4G7GeJIJXJ4q9kIPUfOn9Cnj-hegdcVS6b-vNh9erGyYgNW3xydvA7jTg0EuDJWZzBjls8srw6HrZjWOYf0oNOgngJ3Xh43HDbibdI6wpL2psi-jxpaLD1IdFSX6Lw0inPXK4BY0e1r_fplXSvslzhUGg3IfcGjo24BMrmHghx7OS9oPnDrd_xjEiyoCnat2SdpebmqFt-mpabq-VDn0bura_RHV0MDv5PrWFkgeXLqW7QNVWOsIRce9pDhf682i6HV0g_PD4rFfF3G5f08XpmrEstneopmA_VHEbY0Y8TzA';

const POSTS_DIR = path.join(__dirname, '_posts');
const DATA_DIR = path.join(__dirname, '_data');
const LINKEDIN_DATA_FILE = path.join(DATA_DIR, 'linkedin-posts.json');

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
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

async function getUserProfile() {
  console.log('👤 Fetching LinkedIn profile...');
  try {
    const result = await makeLinkedInRequest('/v2/userinfo');
    if (result.status === 200) {
      console.log(`✅ Profile: ${result.data.name} (${result.data.email})`);
      return result.data;
    } else {
      throw new Error(`Profile fetch failed: ${result.status}`);
    }
  } catch (error) {
    console.error('❌ Profile fetch failed:', error.message);
    return null;
  }
}

async function loadLinkedInPostsData() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const data = await fs.readFile(LINKEDIN_DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {
      userProfile: null,
      posts: [],
      lastSync: null,
      syncMethod: 'hybrid',
      manualPosts: [],
      pendingUrls: []
    };
  }
}

async function saveLinkedInPostsData(data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(LINKEDIN_DATA_FILE, JSON.stringify(data, null, 2));
}

function generateSlug(text, maxLength = 50) {
  return text
    .toLowerCase()
    .substring(0, maxLength)
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function createBlogPost(postData) {
  const { title, content, date, linkedInUrl, linkedInId, source } = postData;
  
  const dateStr = date || new Date().toISOString().split('T')[0];
  const slug = generateSlug(title);
  const filename = `${dateStr}-linkedin-${slug}.md`;
  
  const frontMatter = `---
layout: post
title: "${title.replace(/"/g, '\\"')}"
date: ${dateStr}
categories: [linkedin, social]
tags: [linkedin-post, social-media, professional]
linkedin_url: "${linkedInUrl}"
linkedin_id: "${linkedInId || 'manual'}"
source: "${source || 'Manual Entry'}"
author: Harvad Li
---

`;

  const blogContent = `${content}

---

*Originally posted on [LinkedIn](${linkedInUrl})*

<!-- LinkedIn Post Details -->
<!-- Post ID: ${linkedInId || 'manual'} -->
<!-- Source: ${source || 'Manual Entry'} -->
<!-- Sync Date: ${new Date().toISOString()} -->
`;

  await fs.mkdir(POSTS_DIR, { recursive: true });
  const filepath = path.join(POSTS_DIR, filename);
  
  try {
    await fs.access(filepath);
    console.log(`📄 Post already exists: ${filename}`);
    return { created: false, filename, filepath };
  } catch (error) {
    await fs.writeFile(filepath, frontMatter + blogContent);
    console.log(`✅ Created: ${filename}`);
    return { created: true, filename, filepath };
  }
}

async function addManualPost(linkedInUrl, title = null, content = null) {
  console.log(`📝 Adding manual LinkedIn post: ${linkedInUrl}`);
  
  const linkedInData = await loadLinkedInPostsData();
  
  // Extract post ID from URL if possible
  let linkedInId = null;
  const idMatch = linkedInUrl.match(/activity[:\-](\d{19})/);
  if (idMatch) {
    linkedInId = idMatch[1];
  }
  
  // Generate title and content if not provided
  if (!title || !content) {
    title = title || `LinkedIn Post ${linkedInId ? linkedInId.substring(-8) : Date.now()}`;
    content = content || `This is a LinkedIn post that was manually added to the blog.

Please update this content with the actual post text.

LinkedIn URL: ${linkedInUrl}`;
  }
  
  const postData = {
    title,
    content,
    linkedInUrl,
    linkedInId,
    source: 'Manual Entry',
    addedAt: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0]
  };
  
  // Create blog post
  const result = await createBlogPost(postData);
  
  // Save to data file
  linkedInData.manualPosts.push({
    ...postData,
    filename: result.filename,
    created: result.created
  });
  
  linkedInData.lastSync = new Date().toISOString();
  await saveLinkedInPostsData(linkedInData);
  
  return result;
}

async function syncWithLinkedInApi() {
  console.log('🔄 Attempting LinkedIn API sync...');
  
  const linkedInData = await loadLinkedInPostsData();
  
  // Get user profile (this works with current token)
  const userProfile = await getUserProfile();
  if (userProfile) {
    linkedInData.userProfile = userProfile;
    linkedInData.lastSync = new Date().toISOString();
    await saveLinkedInPostsData(linkedInData);
  }
  
  // Note: Post fetching is not currently working due to LinkedIn API limitations
  console.log('ℹ️  LinkedIn API post fetching is limited with current scope');
  console.log('💡 Use manual post addition or web scraping alternatives');
  
  return { 
    success: true, 
    userProfile,
    message: 'Profile synced successfully. Post sync requires alternative methods.'
  };
}

async function generateLinkedInManagementPage() {
  const linkedInData = await loadLinkedInPostsData();
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LinkedIn Post Manager - Bluehawana</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5;
        }
        .header { 
            background: linear-gradient(135deg, #0077b5, #00a0dc); color: white;
            padding: 30px; border-radius: 10px; margin-bottom: 30px; text-align: center;
        }
        .card { 
            background: white; padding: 25px; border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px;
        }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: 600; }
        .form-group input, .form-group textarea { 
            width: 100%; padding: 12px; border: 2px solid #e1e5e9; 
            border-radius: 6px; font-size: 14px;
        }
        .form-group textarea { min-height: 120px; resize: vertical; }
        .btn { 
            background: #0077b5; color: white; padding: 12px 25px; 
            border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;
        }
        .btn:hover { background: #005582; }
        .btn-secondary { background: #6c757d; }
        .btn-secondary:hover { background: #545b62; }
        .status { 
            padding: 15px; border-radius: 6px; margin: 15px 0;
            display: none;
        }
        .status.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .status.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .posts-list { margin-top: 30px; }
        .post-item { 
            background: #f8f9fa; padding: 20px; border-radius: 8px; 
            margin-bottom: 15px; border-left: 4px solid #0077b5;
        }
        .post-meta { font-size: 12px; color: #6c757d; margin-bottom: 10px; }
        .post-content { line-height: 1.6; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { 
            background: white; padding: 20px; border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;
        }
        .stat-number { font-size: 32px; font-weight: bold; color: #0077b5; }
        .stat-label { color: #6c757d; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔗 LinkedIn Post Manager</h1>
        <p>Sync your LinkedIn posts to your blog</p>
        ${linkedInData.userProfile ? `<p>Connected as: <strong>${linkedInData.userProfile.name}</strong></p>` : ''}
    </div>

    <div class="stats">
        <div class="stat-card">
            <div class="stat-number">${linkedInData.manualPosts?.length || 0}</div>
            <div class="stat-label">Posts Synced</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${linkedInData.userProfile ? '✅' : '❌'}</div>
            <div class="stat-label">API Connected</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${linkedInData.lastSync ? new Date(linkedInData.lastSync).toLocaleDateString() : 'Never'}</div>
            <div class="stat-label">Last Sync</div>
        </div>
    </div>

    <div class="card">
        <h2>Add LinkedIn Post</h2>
        <form id="addPostForm">
            <div class="form-group">
                <label for="linkedInUrl">LinkedIn Post URL *</label>
                <input type="url" id="linkedInUrl" name="linkedInUrl" required 
                       placeholder="https://www.linkedin.com/feed/update/urn:li:activity:1234567890/">
            </div>
            
            <div class="form-group">
                <label for="postTitle">Post Title (optional)</label>
                <input type="text" id="postTitle" name="postTitle" 
                       placeholder="Leave empty to auto-generate">
            </div>
            
            <div class="form-group">
                <label for="postContent">Post Content (optional)</label>
                <textarea id="postContent" name="postContent" 
                          placeholder="Leave empty to add placeholder content that you can edit later"></textarea>
            </div>
            
            <button type="submit" class="btn">Add Post to Blog</button>
            <button type="button" class="btn btn-secondary" onclick="syncApi()">Sync Profile</button>
        </form>
        
        <div id="status" class="status"></div>
    </div>

    ${linkedInData.manualPosts?.length > 0 ? `
    <div class="card posts-list">
        <h2>Recent Posts (${linkedInData.manualPosts.length})</h2>
        ${linkedInData.manualPosts.slice(-10).reverse().map(post => `
            <div class="post-item">
                <div class="post-meta">
                    ${post.addedAt ? new Date(post.addedAt).toLocaleString() : 'Unknown date'} • 
                    ${post.source || 'Manual Entry'} • 
                    <a href="${post.linkedInUrl}" target="_blank">View on LinkedIn</a>
                    ${post.filename ? ` • <a href="/_posts/${post.filename}" target="_blank">View Blog Post</a>` : ''}
                </div>
                <div class="post-content">
                    <strong>${post.title}</strong><br>
                    ${post.content.substring(0, 200)}${post.content.length > 200 ? '...' : ''}
                </div>
            </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="card">
        <h2>Usage Instructions</h2>
        <ol>
            <li><strong>Find your LinkedIn post:</strong> Go to your LinkedIn profile and find the post you want to sync</li>
            <li><strong>Copy the URL:</strong> Click on the post date/time to get the full URL</li>
            <li><strong>Paste and submit:</strong> Use the form above to add the post to your blog</li>
            <li><strong>Edit if needed:</strong> The blog post will be created in the <code>_posts</code> directory</li>
        </ol>
        
        <h3>API Status</h3>
        <p>LinkedIn's API has restrictions on reading user posts. This tool uses manual URL submission as the primary method.</p>
        <p>Last sync: ${linkedInData.lastSync ? new Date(linkedInData.lastSync).toLocaleString() : 'Never'}</p>
    </div>

    <script>
        function showStatus(message, type) {
            const status = document.getElementById('status');
            status.textContent = message;
            status.className = \`status \${type}\`;
            status.style.display = 'block';
            setTimeout(() => { status.style.display = 'none'; }, 5000);
        }

        async function syncApi() {
            showStatus('Syncing LinkedIn profile...', 'success');
            try {
                const response = await fetch('/.netlify/functions/linkedin-posts-sync', {
                    method: 'POST'
                });
                const result = await response.json();
                if (result.success) {
                    showStatus(\`Profile synced: \${result.userProfile?.name || 'Success'}\`, 'success');
                    setTimeout(() => location.reload(), 2000);
                } else {
                    showStatus(\`Sync failed: \${result.message || 'Unknown error'}\`, 'error');
                }
            } catch (error) {
                showStatus(\`Sync failed: \${error.message}\`, 'error');
            }
        }

        document.getElementById('addPostForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            
            if (!data.linkedInUrl) {
                showStatus('LinkedIn URL is required', 'error');
                return;
            }
            
            showStatus('Adding post to blog...', 'success');
            
            try {
                const response = await fetch('/.netlify/functions/extract-linkedin-post', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    showStatus(\`Post added successfully: \${result.filename || 'Blog post created'}\`, 'success');
                    e.target.reset();
                    setTimeout(() => location.reload(), 2000);
                } else {
                    showStatus(\`Failed to add post: \${result.error || 'Unknown error'}\`, 'error');
                }
            } catch (error) {
                showStatus(\`Error: \${error.message}\`, 'error');
            }
        });
    </script>
</body>
</html>`;

  const outputPath = path.join(__dirname, 'pages', 'linkedin-manager.html');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, html);
  console.log(`✅ LinkedIn manager page created: ${outputPath}`);
  
  return outputPath;
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'sync':
      const syncResult = await syncWithLinkedInApi();
      console.log('Sync result:', syncResult);
      break;
      
    case 'add':
      const url = args[1];
      if (!url) {
        console.error('Usage: node linkedin-hybrid-sync.js add <linkedin-url>');
        process.exit(1);
      }
      const addResult = await addManualPost(url);
      console.log('Add result:', addResult);
      break;
      
    case 'manager':
      const managerPage = await generateLinkedInManagementPage();
      console.log(`LinkedIn manager page created: ${managerPage}`);
      break;
      
    case 'status':
      const data = await loadLinkedInPostsData();
      console.log('📊 LinkedIn Sync Status:');
      console.log(`   Profile: ${data.userProfile?.name || 'Not connected'}`);
      console.log(`   Manual posts: ${data.manualPosts?.length || 0}`);
      console.log(`   Last sync: ${data.lastSync || 'Never'}`);
      break;
      
    default:
      console.log(`
LinkedIn Hybrid Sync System

Commands:
  sync        Sync with LinkedIn API (profile only)
  add <url>   Add a LinkedIn post manually by URL
  manager     Generate LinkedIn management web interface
  status      Show current sync status

Examples:
  node linkedin-hybrid-sync.js sync
  node linkedin-hybrid-sync.js add "https://www.linkedin.com/feed/update/urn:li:activity:1234567890/"
  node linkedin-hybrid-sync.js manager
`);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

module.exports = {
  getUserProfile,
  syncWithLinkedInApi,
  addManualPost,
  generateLinkedInManagementPage,
  loadLinkedInPostsData,
  saveLinkedInPostsData
};