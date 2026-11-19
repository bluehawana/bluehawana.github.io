#!/usr/bin/env node

/**
 * Test New Post Detection
 * Simulates finding your new LinkedIn post and syncing it
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');

const ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;

async function getLinkedInProfile() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.linkedin.com',
            path: '/v2/userinfo',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Profile API failed: ${res.statusCode}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function simulateNewPostDetection() {
    console.log('🔍 Simulating detection of your new LinkedIn post...\n');
    
    try {
        // Get your profile via OAuth
        console.log('1️⃣ Authenticating with LinkedIn OAuth...');
        const profile = await getLinkedInProfile();
        console.log(`✅ Authenticated as: ${profile.name}`);
        console.log(`📧 Email: ${profile.email}`);
        console.log(`🖼️ Profile picture: ${profile.picture ? 'Available' : 'Not available'}\n`);
        
        // Simulate finding a new post (since API doesn't allow reading posts)
        console.log('2️⃣ Simulating new post detection...');
        const now = new Date();
        const newPost = {
            id: `post-${now.getTime()}`,
            content: `🚀 Just tested my LinkedIn OAuth integration! 

The system successfully:
✅ Authenticated with LinkedIn API using OAuth 2.0
✅ Retrieved my profile information
✅ Detected this new post (simulated)
✅ Created a blog post automatically

This demonstrates that the OAuth token is working correctly for profile access. For post content, we can use alternative methods like RSS feeds or manual input.

#LinkedIn #OAuth #Automation #TechTest`,
            date: now.toISOString().split('T')[0],
            timestamp: now.getTime(),
            url: 'https://www.linkedin.com/in/hzl',
            author: profile,
            tags: ['LinkedIn', 'OAuth', 'Automation', 'TechTest'],
            engagement: {
                likes: 0,
                comments: 0,
                shares: 0
            }
        };
        
        console.log('✅ New post detected!');
        console.log(`📝 Content preview: ${newPost.content.substring(0, 100)}...`);
        console.log(`🏷️ Tags: ${newPost.tags.join(', ')}\n`);
        
        // Create blog post
        console.log('3️⃣ Creating blog post...');
        const blogCreated = await createBlogPost(newPost);
        
        // Save to data file
        console.log('4️⃣ Saving to data files...');
        const dataSaved = await savePostData(newPost);
        
        // Summary
        console.log('\n🎉 New Post Detection Test Complete!');
        console.log('📊 Results:');
        console.log(`   ✅ OAuth Authentication: Working`);
        console.log(`   ✅ Profile Data: ${profile.name}`);
        console.log(`   ✅ New Post Detection: Simulated`);
        console.log(`   ${blogCreated ? '✅' : '❌'} Blog Post Creation: ${blogCreated ? 'Success' : 'Failed'}`);
        console.log(`   ${dataSaved ? '✅' : '❌'} Data Storage: ${dataSaved ? 'Success' : 'Failed'}`);
        
        console.log('\n💡 Next Steps:');
        console.log('   1. Share your actual LinkedIn post URL');
        console.log('   2. We can manually add it to test real post sync');
        console.log('   3. Set up RSS/scraping fallbacks for automatic detection');
        
        return true;
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

async function createBlogPost(post) {
    try {
        const postsDir = path.join(__dirname, '_posts');
        await fs.mkdir(postsDir, { recursive: true });
        
        const filename = `${post.date}-linkedin-oauth-new-post-test.md`;
        const filepath = path.join(postsDir, filename);
        
        const frontMatter = `---
layout: post
title: "New LinkedIn Post Detected - ${post.date}"
date: ${post.date}
categories: [linkedin, oauth, automation]
tags: [${post.tags.join(', ')}]
linkedin_url: ${post.url}
linkedin_id: ${post.id}
author: ${post.author.name}
oauth_authenticated: true
---

`;
        
        const content = `${frontMatter}${post.content}

---

**🔗 LinkedIn Integration Details:**
- **Author:** ${post.author.name} (${post.author.email})
- **LinkedIn Profile:** [${post.author.name}](${post.url})
- **Sync Method:** OAuth 2.0 + Simulation
- **Detected:** ${new Date().toISOString()}

**📊 Engagement:**
- 👍 ${post.engagement.likes} likes
- 💬 ${post.engagement.comments} comments
- 🔄 ${post.engagement.shares} shares

*This post demonstrates successful OAuth authentication and automated blog post creation from LinkedIn content.*
`;
        
        await fs.writeFile(filepath, content, 'utf8');
        console.log(`✅ Blog post created: ${filename}`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to create blog post:`, error.message);
        return false;
    }
}

async function savePostData(post) {
    try {
        const dataDir = path.join(__dirname, 'data');
        await fs.mkdir(dataDir, { recursive: true });
        
        const postsFile = path.join(dataDir, 'linkedin-posts.json');
        
        // Load existing posts
        let existingPosts = [];
        try {
            const data = await fs.readFile(postsFile, 'utf8');
            existingPosts = JSON.parse(data);
        } catch (error) {
            // File doesn't exist yet
        }
        
        // Add new post
        const updatedPosts = [post, ...existingPosts].slice(0, 50); // Keep last 50
        
        // Save
        await fs.writeFile(postsFile, JSON.stringify(updatedPosts, null, 2), 'utf8');
        
        // Save sync log
        const syncLog = {
            lastSync: new Date().toISOString(),
            totalSyncs: 1,
            lastPostId: post.id,
            oauthWorking: true,
            profileName: post.author.name
        };
        
        const logFile = path.join(dataDir, 'linkedin-sync-log.json');
        await fs.writeFile(logFile, JSON.stringify(syncLog, null, 2), 'utf8');
        
        console.log(`✅ Data saved: ${updatedPosts.length} posts total`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to save data:`, error.message);
        return false;
    }
}

// Run the test
simulateNewPostDetection().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
});