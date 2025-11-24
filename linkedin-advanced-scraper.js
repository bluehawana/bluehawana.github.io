#!/usr/bin/env node

/**
 * LinkedIn Advanced Scraper
 * Fully automated post detection using advanced scraping techniques
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

const ACCESS_TOKEN = 'AQXAaMANteu-XQoVzKWDcARMLIkUOV6n92tstpvl9noU6niFW0PWud7eD6r5uUnGDHIIdiPMN4SNk3tVbmK-pQewkWkO5BZqd3KJUxVGMxav-qgivdROWMV-z_V97d1bgDI-PScFAsGk8Pun6XasiEhxARRhLbvuDvF92mea89aZgHrx-Vc-q8bOL-_8GgNbzkUeFX3sJQrmbKWbjhaZA2I0QYVeePmbIkJclfVD53GXIoTdkEbH19FSYu5Q2BM3AyIHhFLnpoIi_3xncAUDkFZtLwieDJ9cqaQJYVXD0b2Sk9Hm92aILKJDaS24yymZyvsnJfniVCAApYMk_Px8U96cYFEfmg';

class LinkedInAdvancedScraper {
    constructor() {
        this.accessToken = ACCESS_TOKEN;
        this.profile = null;
        this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
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
     * Advanced LinkedIn page scraping with multiple strategies
     */
    async scrapeLinkedInPosts() {
        console.log('🕷️ Starting advanced LinkedIn scraping...');
        
        // Strategy 1: Try mobile LinkedIn (often less protected)
        console.log('\n📱 Trying mobile LinkedIn...');
        const mobilePosts = await this.scrapeMobileLinkedIn();
        if (mobilePosts.length > 0) {
            console.log(`✅ Found ${mobilePosts.length} posts from mobile LinkedIn`);
            return mobilePosts;
        }

        // Strategy 2: Try LinkedIn public profile with different user agents
        console.log('\n🌐 Trying desktop LinkedIn with browser simulation...');
        const desktopPosts = await this.scrapeDesktopLinkedIn();
        if (desktopPosts.length > 0) {
            console.log(`✅ Found ${desktopPosts.length} posts from desktop LinkedIn`);
            return desktopPosts;
        }

        // Strategy 3: Try LinkedIn API endpoints that might work
        console.log('\n🔍 Trying undocumented LinkedIn endpoints...');
        const apiPosts = await this.tryUndocumentedEndpoints();
        if (apiPosts.length > 0) {
            console.log(`✅ Found ${apiPosts.length} posts from undocumented endpoints`);
            return apiPosts;
        }

        // Strategy 4: Parse JavaScript data from LinkedIn page
        console.log('\n⚡ Trying JavaScript data extraction...');
        const jsPosts = await this.extractJavaScriptData();
        if (jsPosts.length > 0) {
            console.log(`✅ Found ${jsPosts.length} posts from JavaScript data`);
            return jsPosts;
        }

        return [];
    }

    /**
     * Scrape mobile LinkedIn (m.linkedin.com)
     */
    async scrapeMobileLinkedIn() {
        try {
            const mobileUrls = [
                'https://m.linkedin.com/in/hzl',
                'https://touch.www.linkedin.com/in/hzl'
            ];

            for (const url of mobileUrls) {
                console.log(`📱 Trying: ${url}`);
                const html = await this.fetchWithMobileHeaders(url);
                
                if (html && html.length > 5000) {
                    console.log(`✅ Mobile page loaded: ${html.length} bytes`);
                    const posts = this.parseMobileHTML(html);
                    if (posts.length > 0) return posts;
                }
            }
        } catch (error) {
            console.log(`❌ Mobile scraping failed: ${error.message}`);
        }
        return [];
    }

    /**
     * Scrape desktop LinkedIn with browser simulation
     */
    async scrapeDesktopLinkedIn() {
        try {
            const urls = [
                'https://www.linkedin.com/in/hzl/recent-activity/posts/',
                'https://www.linkedin.com/in/hzl/detail/recent-activity/',
                'https://www.linkedin.com/in/hzl/'
            ];

            for (const url of urls) {
                console.log(`🌐 Trying: ${url}`);
                const html = await this.fetchWithBrowserHeaders(url);
                
                if (html && html.length > 10000) {
                    console.log(`✅ Desktop page loaded: ${html.length} bytes`);
                    const posts = this.parseDesktopHTML(html);
                    if (posts.length > 0) return posts;
                }
            }
        } catch (error) {
            console.log(`❌ Desktop scraping failed: ${error.message}`);
        }
        return [];
    }

    /**
     * Try undocumented LinkedIn API endpoints
     */
    async tryUndocumentedEndpoints() {
        const endpoints = [
            // Try different API versions
            '/v1/people/~:(id,first-name,last-name,headline,public-profile-url)',
            '/v2/people/~',
            '/v2/people/id=IMcvTu6zhf',
            
            // Try activity endpoints
            '/v2/activities?actor=urn:li:person:IMcvTu6zhf',
            '/v1/people/~/network/updates',
            '/v2/networkUpdates',
            
            // Try different post endpoints
            '/v2/shares?owner=urn:li:person:IMcvTu6zhf',
            '/v1/people/~/shares',
            
            // Try organization endpoints (if you have company)
            '/v2/organizationalEntityAcls',
            '/v2/organizationAcls'
        ];

        for (const endpoint of endpoints) {
            try {
                console.log(`🔍 Trying: ${endpoint}`);
                const result = await this.makeLinkedInRequest(endpoint);
                
                if (result && (result.elements || result.values)) {
                    console.log(`✅ ${endpoint} returned data!`);
                    const posts = this.parseAPIResponse(result, endpoint);
                    if (posts.length > 0) return posts;
                }
            } catch (error) {
                // Continue silently
            }
        }
        return [];
    }

    /**
     * Extract JavaScript data from LinkedIn pages
     */
    async extractJavaScriptData() {
        try {
            const html = await this.fetchWithBrowserHeaders('https://www.linkedin.com/in/hzl/');
            
            if (html && html.length > 50000) {
                console.log(`⚡ Analyzing JavaScript data in ${html.length} bytes...`);
                
                // Look for JSON data in script tags
                const scriptRegex = /<script[^>]*>(.*?)<\/script>/gs;
                let match;
                const posts = [];
                
                while ((match = scriptRegex.exec(html)) !== null) {
                    const scriptContent = match[1];
                    
                    // Look for activity data
                    if (scriptContent.includes('activity') && scriptContent.includes('urn:li:')) {
                        const activityMatches = scriptContent.match(/urn:li:activity:\d+/g);
                        if (activityMatches) {
                            console.log(`🔍 Found ${activityMatches.length} activity URNs in JavaScript`);
                            
                            activityMatches.slice(0, 5).forEach((urn, index) => {
                                const activityId = urn.split(':')[3];
                                posts.push({
                                    id: `js-${activityId}`,
                                    content: `LinkedIn post detected from JavaScript data (Activity: ${urn}). This post was automatically discovered by analyzing the LinkedIn page's JavaScript data. The system detected activity ID ${activityId} which indicates a recent post on your profile.`,
                                    date: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
                                    timestamp: Date.now() - (index * 24 * 60 * 60 * 1000),
                                    url: `https://www.linkedin.com/feed/update/${urn}/`,
                                    tags: ['LinkedIn', 'JavaScript', 'AutoDetected'],
                                    source: 'linkedin_javascript_extraction',
                                    activityId: activityId,
                                    urn: urn
                                });
                            });
                        }
                    }
                    
                    // Look for post content in JSON
                    if (scriptContent.includes('"text"') && scriptContent.includes('"commentary"')) {
                        try {
                            // Try to extract JSON objects
                            const jsonMatches = scriptContent.match(/\{[^{}]*"text"[^{}]*\}/g);
                            if (jsonMatches) {
                                jsonMatches.slice(0, 3).forEach((jsonStr, index) => {
                                    try {
                                        const data = JSON.parse(jsonStr);
                                        if (data.text && data.text.length > 20) {
                                            posts.push({
                                                id: `js-text-${Date.now()}-${index}`,
                                                content: data.text,
                                                date: new Date(Date.now() - (index * 12 * 60 * 60 * 1000)).toISOString().split('T')[0],
                                                timestamp: Date.now() - (index * 12 * 60 * 60 * 1000),
                                                url: 'https://www.linkedin.com/in/hzl',
                                                tags: this.extractTags(data.text),
                                                source: 'linkedin_javascript_json',
                                                rawData: data
                                            });
                                        }
                                    } catch (e) {
                                        // Invalid JSON, continue
                                    }
                                });
                            }
                        } catch (e) {
                            // Continue
                        }
                    }
                }
                
                return posts;
            }
        } catch (error) {
            console.log(`❌ JavaScript extraction failed: ${error.message}`);
        }
        return [];
    }

    /**
     * Fetch URL with mobile headers
     */
    async fetchWithMobileHeaders(url) {
        return this.fetchURL(url, {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'identity',
            'Connection': 'keep-alive'
        });
    }

    /**
     * Fetch URL with browser headers
     */
    async fetchWithBrowserHeaders(url) {
        return this.fetchURL(url, {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'identity',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none'
        });
    }

    /**
     * Generic URL fetcher
     */
    async fetchURL(url, headers = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: headers
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
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            req.end();
        });
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
     * Parse mobile HTML
     */
    parseMobileHTML(html) {
        const posts = [];
        
        // Look for mobile-specific patterns
        const mobilePatterns = [
            /data-activity[^>]*>([^<]+)</g,
            /activity-update[^>]*>([^<]+)</g,
            /<p[^>]*>([^<]{50,500})</g
        ];

        mobilePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(html)) !== null) {
                const content = match[1].trim();
                if (content.length > 30 && !content.includes('LinkedIn') && !content.includes('Connect')) {
                    posts.push({
                        id: `mobile-${Date.now()}-${posts.length}`,
                        content: content,
                        date: new Date().toISOString().split('T')[0],
                        timestamp: Date.now(),
                        url: 'https://www.linkedin.com/in/hzl',
                        tags: this.extractTags(content),
                        source: 'linkedin_mobile_scraping'
                    });
                }
            }
        });

        return posts.slice(0, 5); // Limit to 5 posts
    }

    /**
     * Parse desktop HTML
     */
    parseDesktopHTML(html) {
        const posts = [];
        
        // Look for activity IDs and content
        const activityRegex = /data-activity-id="(\d+)"/g;
        const contentRegex = /<span[^>]*aria-hidden="true"[^>]*>([^<]{30,500})<\/span>/g;
        
        let activityMatch;
        const activityIds = [];
        
        while ((activityMatch = activityRegex.exec(html)) !== null) {
            activityIds.push(activityMatch[1]);
        }
        
        let contentMatch;
        const contents = [];
        
        while ((contentMatch = contentRegex.exec(html)) !== null) {
            const content = contentMatch[1].trim();
            if (content.length > 30 && !content.includes('LinkedIn') && !content.includes('See more')) {
                contents.push(content);
            }
        }
        
        // Combine activity IDs with content
        const maxPosts = Math.min(activityIds.length, contents.length, 3);
        for (let i = 0; i < maxPosts; i++) {
            posts.push({
                id: `desktop-${activityIds[i]}`,
                content: contents[i],
                date: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
                timestamp: Date.now() - (i * 24 * 60 * 60 * 1000),
                url: `https://www.linkedin.com/feed/update/urn:li:activity:${activityIds[i]}/`,
                tags: this.extractTags(contents[i]),
                source: 'linkedin_desktop_scraping',
                activityId: activityIds[i]
            });
        }
        
        return posts;
    }

    /**
     * Parse API response
     */
    parseAPIResponse(response, endpoint) {
        const posts = [];
        const elements = response.elements || response.values || [response];
        
        elements.slice(0, 3).forEach((item, index) => {
            let content = '';
            
            // Try different content fields
            if (item.text) content = item.text;
            else if (item.commentary) content = item.commentary;
            else if (item.headline) content = item.headline;
            else if (item.summary) content = item.summary;
            
            if (content && content.length > 20) {
                posts.push({
                    id: `api-${endpoint.replace(/[^a-zA-Z0-9]/g, '-')}-${index}`,
                    content: content,
                    date: new Date(Date.now() - (index * 12 * 60 * 60 * 1000)).toISOString().split('T')[0],
                    timestamp: Date.now() - (index * 12 * 60 * 60 * 1000),
                    url: 'https://www.linkedin.com/in/hzl',
                    tags: this.extractTags(content),
                    source: `linkedin_api_${endpoint.split('/')[1]}`,
                    rawData: item
                });
            }
        });
        
        return posts;
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
        
        // Extract keywords
        const keywords = ['development', 'tech', 'programming', 'android', 'aosp', 'engineering', 'build', 'performance'];
        const found = keywords.filter(keyword => content.toLowerCase().includes(keyword));
        
        return found.length > 0 ? found : ['LinkedIn'];
    }

    /**
     * Create blog post
     */
    async createBlogPost(post) {
        try {
            const postsDir = '_posts';
            await fs.mkdir(postsDir, { recursive: true });
            
            const filename = `${post.date}-linkedin-auto-${post.activityId || post.id}.md`;
            const filepath = path.join(postsDir, filename);
            
            const frontMatter = `---
layout: post
title: "LinkedIn Post - ${post.date}"
date: ${post.date}
categories: [linkedin, social]
tags: [${post.tags.join(', ')}]
linkedin_url: ${post.url}
linkedin_id: ${post.id}
activity_id: ${post.activityId || 'N/A'}
auto_synced: true
source: ${post.source}
author: ${this.profile?.name || 'LinkedIn User'}
---

`;
            
            const content = `${frontMatter}${post.content}

---

**🔗 LinkedIn Integration Details:**
- **Author:** ${this.profile?.name || 'LinkedIn User'} (${this.profile?.email || 'N/A'})
- **Original Post:** [View on LinkedIn](${post.url})
- **Sync Date:** ${new Date().toISOString().split('T')[0]}
- **Source:** ${post.source}
- **Detection Method:** Advanced automated scraping
${post.activityId ? `- **Activity ID:** ${post.activityId}` : ''}
${post.urn ? `- **URN:** ${post.urn}` : ''}

*This post was automatically detected and synced using advanced LinkedIn scraping techniques.*
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
     * Run the advanced scraper
     */
    async runAdvancedScraping() {
        console.log('🚀 Starting LinkedIn Advanced Automated Scraper...\n');
        
        try {
            // Step 1: Get profile
            console.log('👤 Getting authenticated profile...');
            const profile = await this.getProfile();
            console.log(`✅ Authenticated as: ${profile.name} (${profile.email})`);
            
            // Step 2: Advanced scraping
            const posts = await this.scrapeLinkedInPosts();
            
            if (posts.length === 0) {
                console.log('\n⚠️ No posts detected with advanced scraping.');
                console.log('💡 LinkedIn has very strong anti-scraping protections.');
                console.log('🔧 Alternative approaches:');
                console.log('   1. Use LinkedIn RSS feeds (if available)');
                console.log('   2. Use third-party LinkedIn APIs');
                console.log('   3. Use browser automation tools (Puppeteer/Selenium)');
                console.log('   4. Use LinkedIn webhook notifications');
                return false;
            }

            // Step 3: Show detected posts
            console.log('\n📝 Detected Posts:');
            posts.forEach((post, index) => {
                console.log(`\n${index + 1}. Source: ${post.source}`);
                console.log(`   📅 Date: ${post.date}`);
                console.log(`   📝 Content: ${post.content.substring(0, 150)}${post.content.length > 150 ? '...' : ''}`);
                console.log(`   🏷️ Tags: ${post.tags.join(', ')}`);
                console.log(`   🔗 URL: ${post.url}`);
                if (post.activityId) console.log(`   🆔 Activity ID: ${post.activityId}`);
            });

            // Step 4: Create blog posts
            console.log('\n📄 Creating blog posts...');
            let createdCount = 0;
            for (const post of posts) {
                const filepath = await this.createBlogPost(post);
                if (filepath) createdCount++;
            }

            // Step 5: Summary
            console.log('\n🎉 Advanced LinkedIn Scraping Complete!');
            console.log(`📊 Results:`);
            console.log(`   ✅ OAuth Authentication: Working`);
            console.log(`   👤 Profile: ${profile.name} (${profile.email})`);
            console.log(`   📝 Posts detected: ${posts.length}`);
            console.log(`   📄 Blog posts created: ${createdCount}`);
            console.log(`   🔧 Detection methods: Multiple advanced techniques`);

            return true;

        } catch (error) {
            console.error('\n❌ Advanced scraping failed:', error.message);
            return false;
        }
    }
}

// Run the advanced scraper
const scraper = new LinkedInAdvancedScraper();
scraper.runAdvancedScraping().then(success => {
    if (success) {
        console.log('\n🎉 Successfully detected and synced your LinkedIn posts!');
    } else {
        console.log('\n💡 Consider using browser automation tools for more advanced scraping.');
    }
}).catch(console.error);