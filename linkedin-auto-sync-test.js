#!/usr/bin/env node

/**
 * LinkedIn Auto-Sync Test
 * Test the current LinkedIn API to find your newest posts
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

// Your access token from config
const ACCESS_TOKEN = 'REMOVED_SECRET';

class LinkedInAutoSync {
    constructor() {
        this.accessToken = ACCESS_TOKEN;
        this.baseUrl = 'https://api.linkedin.com';
        this.personId = null;
    }

    /**
     * Make authenticated request to LinkedIn API
     */
    async makeRequest(endpoint) {
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

            console.log(`🔗 LinkedIn API Request: ${endpoint}`);

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const jsonData = JSON.parse(data);
                            console.log(`✅ LinkedIn API Success: ${endpoint}`);
                            resolve(jsonData);
                        } catch (error) {
                            console.log(`✅ LinkedIn API Success (non-JSON): ${endpoint}`);
                            resolve(data);
                        }
                    } else {
                        console.error(`❌ LinkedIn API Error (${res.statusCode}):`, data.substring(0, 200));
                        reject(new Error(`LinkedIn API Error: ${res.statusCode} - ${data}`));
                    }
                });
            });

            req.on('error', (error) => {
                console.error(`❌ LinkedIn API Request Failed:`, error.message);
                reject(error);
            });

            req.end();
        });
    }

    /**
     * Get user profile and extract person ID
     */
    async getProfile() {
        try {
            console.log('👤 Getting LinkedIn profile...');
            const profile = await this.makeRequest('/v2/userinfo');
            console.log(`✅ Profile retrieved: ${profile.name}`);
            console.log(`📧 Email: ${profile.email}`);
            
            // Extract person ID from sub field
            if (profile.sub) {
                this.personId = profile.sub;
                console.log(`🆔 Person ID: ${this.personId}`);
            }
            
            return profile;
        } catch (error) {
            console.error('❌ Failed to get profile:', error.message);
            throw error;
        }
    }

    /**
     * Try multiple LinkedIn API endpoints to find posts
     */
    async findPosts() {
        if (!this.personId) {
            await this.getProfile();
        }

        console.log('\n📝 Searching for LinkedIn posts using multiple endpoints...');
        
        const endpoints = [
            {
                path: `/v2/posts?q=author&author=urn:li:person:${this.personId}&count=10`,
                name: 'Community Posts API',
                parser: 'parseCommunityPosts'
            },
            {
                path: `/v2/ugcPosts?q=authors&authors=urn:li:person:${this.personId}&count=10`,
                name: 'UGC Posts API',
                parser: 'parseUGCPosts'
            },
            {
                path: `/v2/shares?q=owners&owners=urn:li:person:${this.personId}&count=10`,
                name: 'Shares API',
                parser: 'parseShares'
            },
            {
                path: `/v2/activities?q=actor&actor=urn:li:person:${this.personId}&count=10`,
                name: 'Activities API',
                parser: 'parseActivities'
            }
        ];

        let allPosts = [];
        let workingEndpoints = [];

        for (const endpoint of endpoints) {
            try {
                console.log(`\n🔍 Trying ${endpoint.name}...`);
                const response = await this.makeRequest(endpoint.path);
                
                if (response.elements && response.elements.length > 0) {
                    console.log(`✅ ${endpoint.name} found ${response.elements.length} items`);
                    const posts = this[endpoint.parser](response.elements);
                    allPosts = allPosts.concat(posts);
                    workingEndpoints.push(endpoint.name);
                } else {
                    console.log(`⚠️ ${endpoint.name} returned no posts`);
                }
            } catch (error) {
                console.log(`❌ ${endpoint.name} failed: ${error.message.substring(0, 100)}`);
            }
            
            // Wait between requests to be respectful
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`\n📊 Search Summary:`);
        console.log(`✅ Working endpoints: ${workingEndpoints.join(', ')}`);
        console.log(`📝 Total posts found: ${allPosts.length}`);

        return allPosts;
    }

    /**
     * Parse Community Posts format
     */
    parseCommunityPosts(posts) {
        return posts.map(post => {
            const content = this.extractContent(post.commentary || post.content);
            const createdTime = new Date(post.createdAt || post.publishedAt || Date.now());
            
            return {
                id: post.id || `post-${Date.now()}`,
                content: content || 'LinkedIn community post',
                date: createdTime.toISOString().split('T')[0],
                timestamp: createdTime.getTime(),
                url: this.generatePostUrl(post.id),
                tags: this.extractTags(content),
                source: 'linkedin_api_community',
                rawData: post
            };
        });
    }

    /**
     * Parse UGC Posts format
     */
    parseUGCPosts(ugcPosts) {
        return ugcPosts.map(post => {
            const content = this.extractContent(
                post.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text ||
                post.commentary ||
                post.text
            );
            const createdTime = new Date(post.created?.time || post.createdAt || Date.now());
            
            return {
                id: post.id || `ugc-${Date.now()}`,
                content: content || 'LinkedIn UGC post',
                date: createdTime.toISOString().split('T')[0],
                timestamp: createdTime.getTime(),
                url: this.generatePostUrl(post.id),
                tags: this.extractTags(content),
                source: 'linkedin_api_ugc',
                rawData: post
            };
        });
    }

    /**
     * Parse Shares format
     */
    parseShares(shares) {
        return shares.map(share => {
            const content = this.extractContent(share.text?.text || share.commentary);
            const createdTime = new Date(share.created?.time || share.createdAt || Date.now());
            
            return {
                id: share.id || `share-${Date.now()}`,
                content: content || 'LinkedIn share',
                date: createdTime.toISOString().split('T')[0],
                timestamp: createdTime.getTime(),
                url: this.generatePostUrl(share.id),
                tags: this.extractTags(content),
                source: 'linkedin_api_shares',
                rawData: share
            };
        });
    }

    /**
     * Parse Activities format
     */
    parseActivities(activities) {
        return activities.map(activity => {
            const content = this.extractContent(activity.object?.text || activity.commentary);
            const createdTime = new Date(activity.created?.time || activity.createdAt || Date.now());
            
            return {
                id: activity.id || `activity-${Date.now()}`,
                content: content || 'LinkedIn activity',
                date: createdTime.toISOString().split('T')[0],
                timestamp: createdTime.getTime(),
                url: this.generatePostUrl(activity.id),
                tags: this.extractTags(content),
                source: 'linkedin_api_activities',
                rawData: activity
            };
        });
    }

    /**
     * Extract text content from various formats
     */
    extractContent(textData) {
        if (typeof textData === 'string') {
            return textData.trim();
        }
        
        if (textData && textData.text) {
            return textData.text.trim();
        }
        
        if (textData && textData.values && textData.values.length > 0) {
            return textData.values[0].value.trim();
        }
        
        return '';
    }

    /**
     * Generate LinkedIn post URL
     */
    generatePostUrl(postId) {
        if (!postId) return 'https://www.linkedin.com/in/harvad';
        
        if (postId.includes('activity:')) {
            return `https://www.linkedin.com/feed/update/${postId}/`;
        }
        
        const activityId = this.extractActivityId(postId);
        if (activityId) {
            return `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`;
        }
        
        return 'https://www.linkedin.com/in/harvad';
    }

    /**
     * Extract activity ID from LinkedIn URN
     */
    extractActivityId(urn) {
        if (!urn) return null;
        const match = urn.match(/activity[:\-](\d+)/);
        return match ? match[1] : null;
    }

    /**
     * Extract hashtags from content
     */
    extractTags(content) {
        if (!content) return ['LinkedIn'];
        
        const hashtags = content.match(/#\w+/g);
        if (hashtags) {
            return hashtags.map(tag => tag.substring(1));
        }
        
        return ['LinkedIn'];
    }

    /**
     * Create blog post from LinkedIn post
     */
    async createBlogPost(post) {
        try {
            const postsDir = '_posts';
            await fs.mkdir(postsDir, { recursive: true });
            
            const filename = `${post.date}-linkedin-auto-sync-${post.id.replace(/[^a-zA-Z0-9]/g, '-')}.md`;
            const filepath = path.join(postsDir, filename);
            
            const frontMatter = `---
layout: post
title: "LinkedIn Post - ${post.date}"
date: ${post.date}
categories: [linkedin, social]
tags: [${post.tags.join(', ')}]
linkedin_url: ${post.url}
linkedin_id: ${post.id}
auto_synced: true
source: ${post.source}
---

`;
            
            const content = `${frontMatter}${post.content}

---

**🔗 LinkedIn Integration Details:**
- **Original Post:** [View on LinkedIn](${post.url})
- **Sync Date:** ${new Date().toISOString().split('T')[0]}
- **Source:** ${post.source}
- **Post ID:** ${post.id}

*This post was automatically synced from LinkedIn using OAuth 2.0 API.*
`;
            
            await fs.writeFile(filepath, content, 'utf8');
            console.log(`✅ Blog post created: ${filename}`);
            return filepath;
        } catch (error) {
            console.error(`❌ Failed to create blog post:`, error.message);
            return null;
        }
    }

    /**
     * Save posts data
     */
    async savePostsData(posts) {
        try {
            const dataDir = 'data';
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
            
            // Merge new posts (avoid duplicates by ID)
            const existingIds = new Set(existingPosts.map(p => p.id));
            const newPosts = posts.filter(p => !existingIds.has(p.id));
            const updatedPosts = [...newPosts, ...existingPosts].slice(0, 100); // Keep last 100
            
            await fs.writeFile(postsFile, JSON.stringify(updatedPosts, null, 2), 'utf8');
            
            console.log(`✅ Data saved: ${newPosts.length} new posts, ${updatedPosts.length} total`);
            return newPosts.length;
        } catch (error) {
            console.error(`❌ Failed to save data:`, error.message);
            return 0;
        }
    }

    /**
     * Run the full sync process
     */
    async runSync() {
        console.log('🚀 Starting LinkedIn Auto-Sync...\n');
        
        try {
            // Step 1: Get profile
            const profile = await this.getProfile();
            
            // Step 2: Find posts
            const posts = await this.findPosts();
            
            if (posts.length === 0) {
                console.log('\n⚠️ No posts found. This might be due to:');
                console.log('   - API permissions (your token may not have post reading access)');
                console.log('   - No recent posts on your LinkedIn profile');
                console.log('   - API endpoint restrictions');
                return false;
            }

            // Step 3: Show found posts
            console.log('\n📝 Found Posts:');
            posts.forEach((post, index) => {
                console.log(`\n${index + 1}. ${post.source}`);
                console.log(`   📅 Date: ${post.date}`);
                console.log(`   📝 Content: ${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}`);
                console.log(`   🏷️ Tags: ${post.tags.join(', ')}`);
                console.log(`   🔗 URL: ${post.url}`);
            });

            // Step 4: Create blog posts
            console.log('\n📄 Creating blog posts...');
            let createdCount = 0;
            for (const post of posts) {
                const filepath = await this.createBlogPost(post);
                if (filepath) createdCount++;
            }

            // Step 5: Save data
            const newPostsCount = await this.savePostsData(posts);

            // Step 6: Summary
            console.log('\n🎉 LinkedIn Auto-Sync Complete!');
            console.log(`📊 Results:`);
            console.log(`   ✅ Profile: ${profile.name}`);
            console.log(`   📝 Posts found: ${posts.length}`);
            console.log(`   📄 Blog posts created: ${createdCount}`);
            console.log(`   💾 New posts saved: ${newPostsCount}`);

            return true;

        } catch (error) {
            console.error('\n❌ Sync failed:', error.message);
            return false;
        }
    }
}

// Run the sync
const sync = new LinkedInAutoSync();
sync.runSync().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('❌ Sync error:', error);
    process.exit(1);
});