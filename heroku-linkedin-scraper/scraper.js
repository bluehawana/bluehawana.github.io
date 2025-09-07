/**
 * LinkedIn Post Scraper
 * Uses multiple methods to automatically extract LinkedIn posts
 */

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');

class LinkedInScraper {
    constructor() {
        this.profileUrl = 'https://www.linkedin.com/in/hzl';
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    }

    /**
     * Method 1: Puppeteer scraping (most reliable)
     */
    async scrapWithPuppeteer() {
        let browser = null;
        
        try {
            console.log('🤖 Starting Puppeteer scraping...');
            
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ]
            });
            
            const page = await browser.newPage();
            
            // Set user agent and viewport
            await page.setUserAgent(this.userAgent);
            await page.setViewport({ width: 1366, height: 768 });
            
            // Navigate to LinkedIn profile activity page
            const activityUrl = `${this.profileUrl}/recent-activity/`;
            console.log(`📄 Loading: ${activityUrl}`);
            
            await page.goto(activityUrl, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            // Wait for content to load
            await page.waitForTimeout(5000);
            
            // Extract posts using page evaluation
            const posts = await page.evaluate(() => {
                const postElements = document.querySelectorAll('[data-urn*="activity"]');
                const extractedPosts = [];
                
                postElements.forEach((element, index) => {
                    if (index >= 10) return; // Limit to 10 posts
                    
                    try {
                        // Extract content
                        const contentEl = element.querySelector('.feed-shared-text, .feed-shared-inline-show-more-text, [data-test-id="main-feed-activity-card"] .break-words');
                        const content = contentEl ? contentEl.innerText.trim() : '';
                        
                        // Extract time
                        const timeEl = element.querySelector('time, .feed-shared-actor__sub-description time');
                        const timeAttr = timeEl ? timeEl.getAttribute('datetime') : null;
                        const date = timeAttr ? new Date(timeAttr).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                        
                        // Extract URL
                        const linkEl = element.querySelector('a[href*="activity"]');
                        const url = linkEl ? linkEl.href : '';
                        
                        // Extract activity ID
                        const urnMatch = element.getAttribute('data-urn') || '';
                        const activityId = urnMatch.match(/activity:(\d+)/) ? urnMatch.match(/activity:(\d+)/)[1] : null;
                        
                        if (content && content.length > 10) {
                            extractedPosts.push({
                                content: content.substring(0, 500),
                                date: date,
                                url: url || `https://www.linkedin.com/in/hzl`,
                                activityId: activityId,
                                source: 'puppeteer'
                            });
                        }
                    } catch (error) {
                        console.warn('Error extracting post:', error);
                    }
                });
                
                return extractedPosts;
            });
            
            console.log(`✅ Puppeteer extracted ${posts.length} posts`);
            return posts;
            
        } catch (error) {
            console.error('❌ Puppeteer scraping failed:', error);
            return null;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * Method 2: HTTP scraping with axios
     */
    async scrapeWithAxios() {
        try {
            console.log('🌐 Starting HTTP scraping...');
            
            const response = await axios.get(`${this.profileUrl}/recent-activity/`, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive'
                },
                timeout: 15000
            });
            
            const $ = cheerio.load(response.data);
            const posts = [];
            
            // Look for activity URNs and content in the HTML
            $('[data-urn*="activity"]').each((index, element) => {
                if (index >= 10) return; // Limit to 10 posts
                
                const $el = $(element);
                const urn = $el.attr('data-urn') || '';
                const activityId = urn.match(/activity:(\d+)/) ? urn.match(/activity:(\d+)/)[1] : null;
                
                // Try to extract content from various selectors
                const contentSelectors = [
                    '.feed-shared-text',
                    '.feed-shared-inline-show-more-text',
                    '[data-test-id="main-feed-activity-card"] .break-words',
                    '.feed-shared-update-v2__description'
                ];
                
                let content = '';
                for (const selector of contentSelectors) {
                    const contentEl = $el.find(selector).first();
                    if (contentEl.length) {
                        content = contentEl.text().trim();
                        break;
                    }
                }
                
                if (content && content.length > 10 && activityId) {
                    posts.push({
                        content: content.substring(0, 500),
                        date: new Date().toISOString().split('T')[0],
                        url: `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`,
                        activityId: activityId,
                        source: 'axios'
                    });
                }
            });
            
            console.log(`✅ HTTP scraping extracted ${posts.length} posts`);
            return posts;
            
        } catch (error) {
            console.error('❌ HTTP scraping failed:', error);
            return null;
        }
    }

    /**
     * Method 3: RSS feed attempts
     */
    async scrapeRSSFeeds() {
        const rssServices = [
            'https://api.rss2json.com/v1/api.json?rss_url=',
            'https://rss-to-json-serverless-api.vercel.app/api?feedURL='
        ];
        
        const feedUrls = [
            `${this.profileUrl}/recent-activity/`,
            `${this.profileUrl}/detail/recent-activity/`
        ];
        
        for (const service of rssServices) {
            for (const feedUrl of feedUrls) {
                try {
                    console.log(`📡 Trying RSS: ${service}${encodeURIComponent(feedUrl)}`);
                    
                    const response = await axios.get(service + encodeURIComponent(feedUrl), {
                        timeout: 10000
                    });
                    
                    if (response.data.status === 'ok' && response.data.items?.length > 0) {
                        const posts = response.data.items.slice(0, 10).map(item => ({
                            content: this.cleanContent(item.description || item.title),
                            date: new Date(item.pubDate || Date.now()).toISOString().split('T')[0],
                            url: item.link || this.profileUrl,
                            source: 'rss'
                        }));
                        
                        console.log(`✅ RSS extracted ${posts.length} posts`);
                        return posts;
                    }
                } catch (error) {
                    console.warn(`⚠️ RSS attempt failed: ${service}`);
                }
            }
        }
        
        return null;
    }

    /**
     * Method 4: LinkedIn public API endpoints
     */
    async scrapePublicAPI() {
        const endpoints = [
            'https://www.linkedin.com/voyager/api/identity/profiles/hzl',
            'https://www.linkedin.com/voyager/api/feed/updates'
        ];
        
        for (const endpoint of endpoints) {
            try {
                console.log(`🔌 Trying public API: ${endpoint}`);
                
                const response = await axios.get(endpoint, {
                    headers: {
                        'User-Agent': this.userAgent,
                        'Accept': 'application/json'
                    },
                    timeout: 10000
                });
                
                if (response.data) {
                    console.log('✅ Public API responded');
                    // Parse API response for posts
                    return this.parseAPIResponse(response.data);
                }
            } catch (error) {
                console.warn(`⚠️ Public API failed: ${endpoint}`);
            }
        }
        
        return null;
    }

    /**
     * Parse API response for posts
     */
    parseAPIResponse(data) {
        // This would need to be customized based on LinkedIn's API response format
        console.log('API data received, parsing...');
        return [];
    }

    /**
     * Clean and format content
     */
    cleanContent(content) {
        if (!content) return '';
        
        return content
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 500);
    }

    /**
     * Extract tags from content
     */
    extractTags(content) {
        if (!content) return ['LinkedIn'];
        
        const hashtags = content.match(/#\w+/g);
        if (hashtags) {
            return hashtags.map(tag => tag.substring(1));
        }
        
        // Extract keywords
        const keywords = ['android', 'aosp', 'development', 'performance', 'engineering', 'build', 'optimization'];
        const foundKeywords = keywords.filter(keyword => 
            content.toLowerCase().includes(keyword)
        );
        
        return foundKeywords.length > 0 ? foundKeywords : ['LinkedIn'];
    }

    /**
     * Main scraping function - tries all methods
     */
    async scrapeAllMethods() {
        console.log('🚀 Starting comprehensive LinkedIn scraping...');
        
        const methods = [
            { name: 'Puppeteer', func: () => this.scrapWithPuppeteer() },
            { name: 'HTTP', func: () => this.scrapeWithAxios() },
            { name: 'RSS', func: () => this.scrapeRSSFeeds() },
            { name: 'API', func: () => this.scrapePublicAPI() }
        ];
        
        for (const method of methods) {
            try {
                console.log(`🔄 Trying ${method.name} method...`);
                const posts = await method.func();
                
                if (posts && posts.length > 0) {
                    // Add tags to posts
                    const postsWithTags = posts.map(post => ({
                        ...post,
                        tags: this.extractTags(post.content)
                    }));
                    
                    console.log(`✅ ${method.name} method successful: ${postsWithTags.length} posts`);
                    return postsWithTags;
                }
            } catch (error) {
                console.error(`❌ ${method.name} method failed:`, error.message);
            }
        }
        
        console.warn('⚠️ All scraping methods failed');
        return null;
    }
}

/**
 * Main export function
 */
async function scrapeLinkedInPosts() {
    const scraper = new LinkedInScraper();
    return await scraper.scrapeAllMethods();
}

module.exports = {
    scrapeLinkedInPosts,
    LinkedInScraper
};