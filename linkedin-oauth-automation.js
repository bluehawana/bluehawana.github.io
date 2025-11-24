#!/usr/bin/env node

/**
 * LinkedIn OAuth Automation Script
 * Automatically syncs new LinkedIn posts to blog using OAuth 2.0 API
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');

// OAuth Configuration
const ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN || 'AQXAaMANteu-XQoVzKWDcARMLIkUOV6n92tstpvl9noU6niFW0PWud7eD6r5uUnGDHIIdiPMN4SNk3tVbmK-pQewkWkO5BZqd3KJUxVGMxav-qgivdROWMV-z_V97d1bgDI-PScFAsGk8Pun6XasiEhxARRhLbvuDvF92mea89aZgHrx-Vc-q8bOL-_8GgNbzkUeFX3sJQrmbKWbjhaZA2I0QYVeePmbIkJclfVD53GXIoTdkEbH19FSYu5Q2BM3AyIHhFLnpoIi_3xncAUDkFZtLwieDJ9cqaQJYVXD0b2Sk9Hm92aILKJDaS24yymZyvsnJfniVCAApYMk_Px8U96cYFEfmg';

const DATA_DIR = path.join(__dirname, 'data');
const POSTS_FILE = path.join(DATA_DIR, 'linkedin-posts.json');
const SYNC_LOG_FILE = path.join(DATA_DIR, 'linkedin-sync-log.json');
const BLOG_POSTS_DIR = path.join(__dirname, '_posts');

class LinkedInOAuthAutomation {
    constructor() {
        this.accessToken = ACCESS_TOKEN;
        this.memberId = null;
        this.lastSyncTime = null;
        this.newPostsFound = 0;
    }

    /**
     * Make authenticated request to LinkedIn API
     */
    async makeLinkedInRequest(endpoint) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.linkedin.com',
                path: endpoint,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Restli-Protocol-Version': '2.0.0'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(jsonData);
                        } else {
                            reject(new Error(`API Error ${res.statusCode}: ${jsonData.message || data}`));
                        }
                    } catch (error) {
                        reject(new Error(`Parse Error: ${error.message}`));
                    }
                });
            });

            req.on('error', reject);
            req.end();
        });
    }

    /**
     * Get member ID from LinkedIn API
     */
    async getMemberId() {
        if (this.memberId) return this.memberId;

        try {
            console.log('🔍 Getting member ID...');
            // Try the userinfo endpoint first (works with openid scope)
            try {
                const profile = await this.makeLinkedInRequest('/v2/userinfo');
                if (profile.sub) {
                    // Extract member ID from sub field (format: urn:li:person:MEMBER_ID)
                    const match = profile.sub.match(/urn:li:person:(.+)/);
                    if (match) {
                        this.memberId = match[1];
                        console.log('✅ Member ID retrieved from userinfo:', this.memberId);
                        return this.memberId;
                    }
                }
            } catch (error) {
                console.log('⚠️ Userinfo endpoint failed, trying people endpoint...');
            }
            
            // Fallback to people endpoint with correct syntax
            const profile = await this.makeLinkedInRequest('/v2/people/~');
            this.memberId = profile.id;
            console.log('✅ Member ID retrieved from people endpoint:', this.memberId);
            return this.memberId;
        } catch (error) {
            console.error('❌ Failed to get member ID:', error.message);
            throw error;
        }
    }

    /**
     * Fetch recent posts from LinkedIn API
     */
    async fetchRecentPosts() {
        try {
            await this.getMemberId();
            
            console.log('📱 Fetching recent LinkedIn posts...');
            
            // Try multiple endpoints to find posts
            let response = null;
            const endpoints = [
                `/v2/shares?q=owners&owners=urn:li:person:${this.memberId}&count=20`,
                `/v2/people/~/shares?count=20`,
                `/v2/shares?q=owners&owners=${this.memberId}&count=20`
            ];
            
            for (const endpoint of endpoints) {
                try {
                    console.log(`🔍 Trying endpoint: ${endpoint}`);
                    response = await this.makeLinkedInRequest(endpoint);
                    console.log(`✅ Successfully fetched from: ${endpoint}`);
                    break;
                } catch (error) {
                    console.log(`⚠️ Endpoint failed: ${endpoint} - ${error.message}`);
                    continue;
                }
            }
            
            if (!response) {
                throw new Error('All share endpoints failed');
            }
            
            const posts = this.parseLinkedInPosts(response.elements || []);
            console.log(`✅ Found ${posts.length} posts from LinkedIn API`);
            
            return posts;
        } catch (error) {
            console.error('❌ Failed to fetch posts:', error.message);
            return [];
        }
    }

    /**
     * Parse LinkedIn API response into standardized format
     */
    parseLinkedInPosts(shares) {
        return shares.map(share => {
            const text = share.text?.text || '';
            const created = new Date(share.created?.time || Date.now());
            
            return {
                id: share.id,
                content: text,
                date: created.toISOString().split('T')[0],
                timestamp: created.getTime(),
                url: `https://www.linkedin.com/feed/update/${share.id}`,
                type: 'linkedin_oauth',
                engagement: {
                    likes: share.totalSocialActivityCounts?.numLikes || 0,
                    comments: share.totalSocialActivityCounts?.numComments || 0,
                    shares: share.totalSocialActivityCounts?.numShares || 0
                },
                tags: this.extractTags(text),
                source: 'oauth_api'
            };
        }).filter(post => post.content.length > 10); // Filter out very short posts
    }

    /**
     * Extract hashtags and generate tags from content
     */
    extractTags(content) {
        if (!content) return ['LinkedIn'];
        
        // Extract hashtags
        const hashtags = content.match(/#\w+/g);
        if (hashtags && hashtags.length > 0) {
            return hashtags.map(tag => tag.substring(1));
        }
        
        // Generate tags based on keywords
        const keywords = {
            'development': ['development', 'dev', 'coding', 'programming'],
            'tech': ['technology', 'tech', 'software', 'digital'],
            'web': ['web', 'website', 'frontend', 'backend'],
            'career': ['career', 'job', 'work', 'professional'],
            'ai': ['ai', 'artificial intelligence', 'machine learning', 'ml'],
            'startup': ['startup', 'entrepreneur', 'business'],
            'learning': ['learning', 'education', 'course', 'tutorial']
        };
        
        const foundTags = [];
        const lowerContent = content.toLowerCase();
        
        for (const [tag, words] of Object.entries(keywords)) {
            if (words.some(word => lowerContent.includes(word))) {
                foundTags.push(tag);
            }
        }
        
        return foundTags.length > 0 ? foundTags : ['LinkedIn'];
    }

    /**
     * Load existing posts and sync log
     */
    async loadExistingData() {
        try {
            // Ensure data directory exists
            await fs.mkdir(DATA_DIR, { recursive: true });
            
            // Load existing posts
            let existingPosts = [];
            try {
                const postsData = await fs.readFile(POSTS_FILE, 'utf8');
                existingPosts = JSON.parse(postsData);
            } catch (error) {
                console.log('📝 No existing posts file found, starting fresh');
            }
            
            // Load sync log
            let syncLog = { lastSync: null, totalSyncs: 0, lastPostId: null };
            try {
                const logData = await fs.readFile(SYNC_LOG_FILE, 'utf8');
                syncLog = JSON.parse(logData);
            } catch (error) {
                console.log('📝 No sync log found, starting fresh');
            }
            
            return { existingPosts, syncLog };
        } catch (error) {
            console.error('❌ Failed to load existing data:', error.message);
            return { existingPosts: [], syncLog: { lastSync: null, totalSyncs: 0, lastPostId: null } };
        }
    }

    /**
     * Detect new posts by comparing with existing data
     */
    detectNewPosts(fetchedPosts, existingPosts, syncLog) {
        const existingIds = new Set(existingPosts.map(post => post.id));
        const newPosts = fetchedPosts.filter(post => !existingIds.has(post.id));
        
        // Also check by timestamp if we have a last sync time
        const lastSyncTime = syncLog.lastSync ? new Date(syncLog.lastSync).getTime() : 0;
        const recentPosts = fetchedPosts.filter(post => post.timestamp > lastSyncTime);
        
        // Combine both methods
        const allNewPosts = [...new Map([...newPosts, ...recentPosts].map(post => [post.id, post])).values()];
        
        console.log(`🔍 Found ${allNewPosts.length} new posts since last sync`);
        
        return allNewPosts;
    }

    /**
     * Create blog post from LinkedIn post
     */
    async createBlogPost(post) {
        try {
            // Ensure blog posts directory exists
            await fs.mkdir(BLOG_POSTS_DIR, { recursive: true });
            
            const filename = `${post.date}-linkedin-${post.id.replace(/[^a-zA-Z0-9]/g, '-')}.md`;
            const filepath = path.join(BLOG_POSTS_DIR, filename);
            
            // Check if blog post already exists
            try {
                await fs.access(filepath);
                console.log(`📄 Blog post already exists: ${filename}`);
                return false;
            } catch (error) {
                // File doesn't exist, continue creating
            }
            
            const frontMatter = `---
layout: post
title: "LinkedIn Update - ${post.date}"
date: ${post.date}
categories: [linkedin, social]
tags: [${post.tags.join(', ')}]
linkedin_url: ${post.url}
linkedin_id: ${post.id}
engagement:
  likes: ${post.engagement.likes}
  comments: ${post.engagement.comments}
  shares: ${post.engagement.shares}
---

`;
            
            const content = `${frontMatter}${post.content}

---

*Originally posted on [LinkedIn](${post.url})*

**Engagement Stats:**
- 👍 ${post.engagement.likes} likes
- 💬 ${post.engagement.comments} comments  
- 🔄 ${post.engagement.shares} shares
`;
            
            await fs.writeFile(filepath, content, 'utf8');
            console.log(`✅ Created blog post: ${filename}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to create blog post for ${post.id}:`, error.message);
            return false;
        }
    }

    /**
     * Save updated data
     */
    async saveData(posts, syncLog) {
        try {
            // Save posts
            await fs.writeFile(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf8');
            
            // Update and save sync log
            syncLog.lastSync = new Date().toISOString();
            syncLog.totalSyncs = (syncLog.totalSyncs || 0) + 1;
            if (posts.length > 0) {
                syncLog.lastPostId = posts[0].id;
            }
            
            await fs.writeFile(SYNC_LOG_FILE, JSON.stringify(syncLog, null, 2), 'utf8');
            
            console.log('💾 Data saved successfully');
        } catch (error) {
            console.error('❌ Failed to save data:', error.message);
        }
    }

    /**
     * Main automation function
     */
    async run() {
        console.log('🚀 Starting LinkedIn OAuth automation...');
        console.log('📅 Sync time:', new Date().toISOString());
        
        try {
            // Load existing data
            const { existingPosts, syncLog } = await this.loadExistingData();
            console.log(`📊 Loaded ${existingPosts.length} existing posts`);
            
            // Fetch recent posts from LinkedIn
            const fetchedPosts = await this.fetchRecentPosts();
            
            if (fetchedPosts.length === 0) {
                console.log('⚠️ No posts fetched from LinkedIn API');
                return;
            }
            
            // Detect new posts
            const newPosts = this.detectNewPosts(fetchedPosts, existingPosts, syncLog);
            this.newPostsFound = newPosts.length;
            
            if (newPosts.length === 0) {
                console.log('✅ No new posts found');
                await this.saveData(existingPosts, syncLog);
                return;
            }
            
            console.log(`🆕 Processing ${newPosts.length} new posts...`);
            
            // Create blog posts for new LinkedIn posts
            let blogPostsCreated = 0;
            for (const post of newPosts) {
                const created = await this.createBlogPost(post);
                if (created) blogPostsCreated++;
            }
            
            // Merge and sort all posts
            const allPosts = [...newPosts, ...existingPosts]
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 50); // Keep only the 50 most recent posts
            
            // Save updated data
            await this.saveData(allPosts, syncLog);
            
            console.log('🎉 Automation completed successfully!');
            console.log(`📊 Summary:`);
            console.log(`   - New posts found: ${newPosts.length}`);
            console.log(`   - Blog posts created: ${blogPostsCreated}`);
            console.log(`   - Total posts stored: ${allPosts.length}`);
            
        } catch (error) {
            console.error('❌ Automation failed:', error.message);
            process.exit(1);
        }
    }
}

// Run the automation if this script is executed directly
if (require.main === module) {
    const automation = new LinkedInOAuthAutomation();
    automation.run().then(() => {
        console.log('✅ Automation finished');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Automation error:', error);
        process.exit(1);
    });
}

module.exports = LinkedInOAuthAutomation;