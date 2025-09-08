#!/usr/bin/env node

/**
 * LinkedIn Real Post Detector
 * Try multiple methods to find your actual newest LinkedIn posts
 */

const https = require('https');
const fs = require('fs').promises;

const ACCESS_TOKEN = 'AQXAaMANteu-XQoVzKWDcARMLIkUOV6n92tstpvl9noU6niFW0PWud7eD6r5uUnGDHIIdiPMN4SNk3tVbmK-pQewkWkO5BZqd3KJUxVGMxav-qgivdROWMV-z_V97d1bgDI-PScFAsGk8Pun6XasiEhxARRhLbvuDvF92mea89aZgHrx-Vc-q8bOL-_8GgNbzkUeFX3sJQrmbKWbjhaZA2I0QYVeePmbIkJclfVD53GXIoTdkEbH19FSYu5Q2BM3AyIHhFLnpoIi_3xncAUDkFZtLwieDJ9cqaQJYVXD0b2Sk9Hm92aILKJDaS24yymZyvsnJfniVCAApYMk_Px8U96cYFEfmg';

class LinkedInRealPostDetector {
    constructor() {
        this.accessToken = ACCESS_TOKEN;
        this.profile = null;
    }

    /**
     * Get authenticated profile
     */
    async getProfile() {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.linkedin.com',
                path: '/v2/userinfo',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        const profile = JSON.parse(data);
                        this.profile = profile;
                        resolve(profile);
                    } else {
                        reject(new Error(`Profile API failed: ${res.statusCode}`));
                    }
                });
            });
            req.on('error', reject);
            req.end();
        });
    }

    /**
     * Try LinkedIn RSS feed
     */
    async tryLinkedInRSS() {
        return new Promise((resolve) => {
            console.log('🔍 Trying LinkedIn RSS feed...');
            
            const rssUrls = [
                'https://www.linkedin.com/in/hzl/recent-activity/posts.rss',
                'https://www.linkedin.com/in/hzl/recent-activity.rss',
                'https://linkedin.com/in/hzl.rss'
            ];

            let completed = 0;
            let foundPosts = [];

            rssUrls.forEach(url => {
                const urlObj = new URL(url);
                const options = {
                    hostname: urlObj.hostname,
                    path: urlObj.pathname + urlObj.search,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; RSS Reader)',
                        'Accept': 'application/rss+xml, application/xml, text/xml'
                    }
                };

                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        completed++;
                        if (res.statusCode === 200 && data.includes('<item>')) {
                            console.log(`✅ RSS feed found: ${url}`);
                            const posts = this.parseRSSFeed(data);
                            foundPosts = foundPosts.concat(posts);
                        } else {
                            console.log(`❌ RSS feed failed: ${url} (${res.statusCode})`);
                        }
                        
                        if (completed === rssUrls.length) {
                            resolve(foundPosts);
                        }
                    });
                });
                
                req.on('error', () => {
                    completed++;
                    if (completed === rssUrls.length) {
                        resolve(foundPosts);
                    }
                });
                
                req.end();
            });
        });
    }

    /**
     * Parse RSS feed content
     */
    parseRSSFeed(rssContent) {
        const posts = [];
        
        // Extract items from RSS
        const itemRegex = /<item>(.*?)<\/item>/gs;
        let match;
        
        while ((match = itemRegex.exec(rssContent)) !== null) {
            const itemContent = match[1];
            
            // Extract title
            const titleMatch = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
            const title = titleMatch ? titleMatch[1] : 'LinkedIn Post';
            
            // Extract description
            const descMatch = itemContent.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);
            const description = descMatch ? descMatch[1] : '';
            
            // Extract link
            const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
            const link = linkMatch ? linkMatch[1] : '';
            
            // Extract date
            const dateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);
            const pubDate = dateMatch ? new Date(dateMatch[1]) : new Date();
            
            if (description && description.length > 10) {
                posts.push({
                    id: `rss-${Date.now()}-${posts.length}`,
                    content: this.cleanHTMLContent(description),
                    title: title,
                    date: pubDate.toISOString().split('T')[0],
                    timestamp: pubDate.getTime(),
                    url: link || 'https://www.linkedin.com/in/hzl',
                    tags: this.extractTags(description),
                    source: 'linkedin_rss',
                    rawData: { title, description, link, pubDate: dateMatch ? dateMatch[1] : null }
                });
            }
        }
        
        return posts;
    }

    /**
     * Clean HTML content from RSS
     */
    cleanHTMLContent(html) {
        return html
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Extract hashtags from content
     */
    extractTags(content) {
        const hashtags = content.match(/#\w+/g);
        if (hashtags) {
            return hashtags.map(tag => tag.substring(1));
        }
        return ['LinkedIn'];
    }

    /**
     * Try alternative LinkedIn endpoints
     */
    async tryAlternativeEndpoints() {
        console.log('🔍 Trying alternative LinkedIn endpoints...');
        
        const endpoints = [
            '/v2/people/~:(id,firstName,lastName,headline,publicProfileUrl)',
            '/v2/people/~:(id,firstName,lastName,positions)',
            '/rest/people/~',
            '/v2/me'
        ];

        for (const endpoint of endpoints) {
            try {
                const result = await this.makeLinkedInRequest(endpoint);
                console.log(`✅ ${endpoint} worked:`, Object.keys(result));
                
                // Look for any activity or post-related data
                if (result.positions || result.headline) {
                    console.log('📝 Found profile data that might contain recent activity');
                }
            } catch (error) {
                console.log(`❌ ${endpoint} failed:`, error.message.substring(0, 100));
            }
        }
    }

    /**
     * Make LinkedIn API request
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
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(JSON.parse(data));
                    } else {
                        reject(new Error(`${res.statusCode}: ${data}`));
                    }
                });
            });
            req.on('error', reject);
            req.end();
        });
    }

    /**
     * Try web scraping with different approaches
     */
    async tryWebScraping() {
        console.log('🔍 Trying web scraping approaches...');
        
        const urls = [
            'https://www.linkedin.com/in/hzl/recent-activity/',
            'https://www.linkedin.com/in/hzl/detail/recent-activity/posts/',
            'https://www.linkedin.com/in/hzl/'
        ];

        for (const url of urls) {
            try {
                const html = await this.fetchURL(url);
                if (html && html.length > 1000) {
                    console.log(`✅ Successfully fetched ${url} (${html.length} bytes)`);
                    
                    // Look for post indicators
                    const postIndicators = [
                        'data-activity-id',
                        'feed-update',
                        'activity-',
                        'post-',
                        'share-update'
                    ];
                    
                    let foundIndicators = 0;
                    postIndicators.forEach(indicator => {
                        if (html.includes(indicator)) {
                            foundIndicators++;
                        }
                    });
                    
                    console.log(`📊 Found ${foundIndicators}/${postIndicators.length} post indicators`);
                    
                    if (foundIndicators > 0) {
                        return this.extractPostsFromHTML(html);
                    }
                } else {
                    console.log(`❌ ${url} returned limited content`);
                }
            } catch (error) {
                console.log(`❌ ${url} failed:`, error.message);
            }
        }
        
        return [];
    }

    /**
     * Fetch URL with proper headers
     */
    async fetchURL(url) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'identity',
                    'Connection': 'keep-alive'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 400) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}`));
                    }
                });
            });
            req.on('error', reject);
            req.end();
        });
    }

    /**
     * Extract posts from HTML
     */
    extractPostsFromHTML(html) {
        const posts = [];
        
        // Look for activity IDs
        const activityRegex = /data-activity-id="(\d+)"/g;
        let match;
        const activityIds = [];
        
        while ((match = activityRegex.exec(html)) !== null) {
            activityIds.push(match[1]);
        }
        
        console.log(`🔍 Found ${activityIds.length} activity IDs in HTML`);
        
        // Create posts for found activities
        activityIds.slice(0, 3).forEach((activityId, index) => {
            posts.push({
                id: `html-activity-${activityId}`,
                content: `LinkedIn post detected from HTML scraping (Activity ID: ${activityId}). This post was found on your LinkedIn profile page. To get the full content, please share the direct post URL.`,
                date: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
                timestamp: Date.now() - (index * 24 * 60 * 60 * 1000),
                url: `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`,
                tags: ['LinkedIn', 'HTMLScraping'],
                source: 'linkedin_html_scraping',
                activityId: activityId
            });
        });
        
        return posts;
    }

    /**
     * Run comprehensive post detection
     */
    async detectRealPosts() {
        console.log('🚀 Starting comprehensive LinkedIn post detection...\n');
        
        try {
            // Step 1: Get profile
            console.log('👤 Getting authenticated profile...');
            const profile = await this.getProfile();
            console.log(`✅ Authenticated as: ${profile.name}`);
            
            let allPosts = [];
            
            // Step 2: Try RSS feeds
            console.log('\n📡 Trying RSS feeds...');
            const rssPosts = await this.tryLinkedInRSS();
            if (rssPosts.length > 0) {
                console.log(`✅ Found ${rssPosts.length} posts from RSS`);
                allPosts = allPosts.concat(rssPosts);
            }
            
            // Step 3: Try alternative API endpoints
            console.log('\n🔍 Trying alternative API endpoints...');
            await this.tryAlternativeEndpoints();
            
            // Step 4: Try web scraping
            console.log('\n🌐 Trying web scraping...');
            const scrapedPosts = await this.tryWebScraping();
            if (scrapedPosts.length > 0) {
                console.log(`✅ Found ${scrapedPosts.length} posts from scraping`);
                allPosts = allPosts.concat(scrapedPosts);
            }
            
            // Step 5: Results
            console.log('\n📊 Detection Results:');
            console.log(`📝 Total posts found: ${allPosts.length}`);
            
            if (allPosts.length > 0) {
                console.log('\n📝 Your detected posts:');
                allPosts.forEach((post, index) => {
                    console.log(`\n${index + 1}. Source: ${post.source}`);
                    console.log(`   📅 Date: ${post.date}`);
                    console.log(`   📝 Content: ${post.content.substring(0, 150)}...`);
                    console.log(`   🔗 URL: ${post.url}`);
                });
                
                return allPosts;
            } else {
                console.log('\n⚠️ No real posts detected automatically.');
                console.log('💡 To sync your newest post:');
                console.log('   1. Go to https://www.linkedin.com/in/hzl');
                console.log('   2. Find your newest post');
                console.log('   3. Copy the post URL');
                console.log('   4. Share it with me to extract and sync');
                
                return [];
            }
            
        } catch (error) {
            console.error('❌ Detection failed:', error.message);
            return [];
        }
    }
}

// Run the detection
const detector = new LinkedInRealPostDetector();
detector.detectRealPosts().then(posts => {
    if (posts.length > 0) {
        console.log('\n🎉 Real posts detected! Ready to sync to your blog.');
    } else {
        console.log('\n📝 Please share your newest LinkedIn post URL for manual sync.');
    }
}).catch(console.error);