/**
 * LinkedIn Auto-Detector
 * Attempts to automatically find new LinkedIn posts using multiple methods
 */

class LinkedInAutoDetector {
    constructor() {
        this.profileUrl = 'https://www.linkedin.com/in/hzl';
        this.methods = [
            'rss_feeds',
            'web_scraping',
            'activity_monitoring',
            'notification_parsing'
        ];
    }

    /**
     * Method 1: Try multiple RSS feed sources
     */
    async tryRSSFeeds() {
        const rssSources = [
            'https://www.linkedin.com/in/hzl/recent-activity/',
            'https://www.linkedin.com/in/hzl/detail/recent-activity/',
            'https://www.linkedin.com/feed/hashtag/hzl'
        ];

        for (const rssUrl of rssSources) {
            try {
                console.log(`🔍 Trying RSS: ${rssUrl}`);
                
                // Try multiple RSS-to-JSON services
                const services = [
                    `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`,
                    `https://rss-to-json-serverless-api.vercel.app/api?feedURL=${encodeURIComponent(rssUrl)}`,
                    `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`
                ];

                for (const serviceUrl of services) {
                    const response = await fetch(serviceUrl);
                    const data = await response.json();
                    
                    if (data.status === 'ok' && data.items?.length > 0) {
                        console.log('✅ RSS feed found posts:', data.items.length);
                        return this.parseRSSPosts(data.items);
                    }
                }
            } catch (error) {
                console.warn(`⚠️ RSS source failed: ${rssUrl}`, error.message);
            }
        }
        return null;
    }

    /**
     * Method 2: Web scraping with CORS proxies
     */
    async tryWebScraping() {
        const proxies = [
            'https://api.allorigins.win/get?url=',
            'https://cors-anywhere.herokuapp.com/',
            'https://thingproxy.freeboard.io/fetch/'
        ];

        for (const proxy of proxies) {
            try {
                console.log(`🔍 Trying web scraping via: ${proxy}`);
                
                const response = await fetch(proxy + encodeURIComponent(this.profileUrl + '/recent-activity/'));
                const data = await response.json();
                
                if (data.contents || data.response) {
                    const html = data.contents || data.response;
                    const posts = this.parseLinkedInHTML(html);
                    
                    if (posts.length > 0) {
                        console.log('✅ Web scraping found posts:', posts.length);
                        return posts;
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Web scraping failed: ${proxy}`, error.message);
            }
        }
        return null;
    }

    /**
     * Method 3: Activity monitoring via LinkedIn's public endpoints
     */
    async tryActivityMonitoring() {
        try {
            console.log('🔍 Trying activity monitoring...');
            
            // Try LinkedIn's public activity endpoints
            const endpoints = [
                'https://www.linkedin.com/voyager/api/identity/profiles/hzl/networkinfo',
                'https://www.linkedin.com/voyager/api/feed/updates',
                'https://www.linkedin.com/in/hzl/detail/recent-activity/posts/'
            ];

            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(endpoint, {
                        headers: {
                            'Accept': 'application/json',
                            'User-Agent': 'Mozilla/5.0 (compatible; LinkedInSync/1.0)'
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('✅ Activity endpoint responded:', endpoint);
                        // Parse the response for posts
                        return this.parseActivityData(data);
                    }
                } catch (error) {
                    console.warn(`⚠️ Activity endpoint failed: ${endpoint}`);
                }
            }
        } catch (error) {
            console.warn('⚠️ Activity monitoring failed:', error.message);
        }
        return null;
    }

    /**
     * Method 4: Browser extension approach (for manual setup)
     */
    generateBrowserBookmarklet() {
        return `
javascript:(function(){
    const posts = [];
    
    // Find LinkedIn post elements
    document.querySelectorAll('[data-urn*="activity"]').forEach(el => {
        const content = el.querySelector('.feed-shared-text')?.innerText;
        const timeEl = el.querySelector('time');
        const linkEl = el.querySelector('a[href*="activity"]');
        
        if (content && timeEl && linkEl) {
            posts.push({
                content: content.substring(0, 500),
                date: new Date(timeEl.getAttribute('datetime')).toISOString().split('T')[0],
                url: linkEl.href,
                tags: ['LinkedIn', 'Auto'],
                source: 'bookmarklet'
            });
        }
    });
    
    if (posts.length > 0) {
        const jsonData = JSON.stringify(posts, null, 2);
        const blob = new Blob([jsonData], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'linkedin-posts-extracted.json';
        a.click();
        alert('Extracted ' + posts.length + ' posts! Check your downloads.');
    } else {
        alert('No posts found. Make sure you are on your LinkedIn profile activity page.');
    }
})();
        `.trim();
    }

    /**
     * Parse RSS feed items
     */
    parseRSSPosts(items) {
        return items.slice(0, 10).map(item => ({
            content: this.cleanContent(item.description || item.title),
            date: new Date(item.pubDate || Date.now()).toISOString().split('T')[0],
            url: item.link || this.profileUrl,
            tags: this.extractTags(item.description || item.title),
            source: 'rss_auto'
        }));
    }

    /**
     * Parse LinkedIn HTML for posts
     */
    parseLinkedInHTML(html) {
        const posts = [];
        
        // Look for activity URNs in HTML
        const activityMatches = html.match(/urn:li:activity:\d+/g) || [];
        const uniqueActivities = [...new Set(activityMatches)];
        
        uniqueActivities.slice(0, 5).forEach(urn => {
            const activityId = urn.match(/\d+/)[0];
            posts.push({
                content: 'LinkedIn post (view on LinkedIn for full content)',
                date: new Date().toISOString().split('T')[0],
                url: `https://www.linkedin.com/feed/update/${urn}/`,
                tags: ['LinkedIn', 'Auto'],
                source: 'scraping',
                activityId: activityId
            });
        });
        
        return posts;
    }

    /**
     * Parse activity data from LinkedIn endpoints
     */
    parseActivityData(data) {
        // This would need to be customized based on LinkedIn's response format
        console.log('Activity data received:', data);
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
        
        const keywords = ['android', 'aosp', 'development', 'performance', 'engineering', 'build'];
        const foundKeywords = keywords.filter(keyword => 
            content.toLowerCase().includes(keyword)
        );
        
        return foundKeywords.length > 0 ? foundKeywords : ['LinkedIn'];
    }

    /**
     * Main detection function
     */
    async detectNewPosts() {
        console.log('🚀 Starting LinkedIn post detection...');
        
        for (const method of this.methods.slice(0, 3)) { // Skip bookmarklet in auto mode
            let posts = null;
            
            switch (method) {
                case 'rss_feeds':
                    posts = await this.tryRSSFeeds();
                    break;
                case 'web_scraping':
                    posts = await this.tryWebScraping();
                    break;
                case 'activity_monitoring':
                    posts = await this.tryActivityMonitoring();
                    break;
            }
            
            if (posts && posts.length > 0) {
                console.log(`✅ Detection successful via ${method}:`, posts.length, 'posts');
                return posts;
            }
        }
        
        console.warn('⚠️ All automatic detection methods failed');
        return null;
    }

    /**
     * Generate instructions for manual detection
     */
    getManualInstructions() {
        return {
            bookmarklet: this.generateBrowserBookmarklet(),
            instructions: `
1. Go to your LinkedIn profile: ${this.profileUrl}/recent-activity/
2. Create a new bookmark with this JavaScript code as the URL
3. Click the bookmark while on your LinkedIn activity page
4. It will download a JSON file with your posts
5. Upload the JSON content to your blog system
            `.trim()
        };
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LinkedInAutoDetector;
}

// Browser usage
if (typeof window !== 'undefined') {
    window.LinkedInAutoDetector = LinkedInAutoDetector;
}