/**
 * Improved LinkedIn Sync System
 * Multiple fallback methods for reliable LinkedIn post synchronization
 * Now includes OAuth 2.0 API access
 */

class LinkedInSyncManager {
    constructor() {
        this.methods = [
            'oauth_api',
            'rss_feed',
            'web_scraping', 
            'manual_update',
            'static_fallback'
        ];
        this.currentMethod = 'oauth_api';
        this.accessToken = localStorage.getItem('linkedin_access_token');
        this.memberId = localStorage.getItem('linkedin_member_id');
    }

    /**
     * Method 1: OAuth 2.0 API Access (Most Reliable)
     * Uses the official LinkedIn API with OAuth token
     */
    async syncViaOAuthAPI() {
        try {
            console.log('🔄 Attempting LinkedIn OAuth API sync...');
            
            if (!this.accessToken) {
                throw new Error('No OAuth access token available');
            }

            const headers = {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0'
            };

            // First, get member ID if not available
            if (!this.memberId) {
                const meResponse = await fetch('https://api.linkedin.com/v2/people/(id~)', { headers });
                if (meResponse.ok) {
                    const me = await meResponse.json();
                    this.memberId = me.id;
                    localStorage.setItem('linkedin_member_id', this.memberId);
                }
            }

            // Get user's posts using the shares API
            const postsUrl = `https://api.linkedin.com/v2/shares?q=owners&owners=urn:li:person:${this.memberId}&count=20&sortBy=CREATED_TIME`;
            const postsResponse = await fetch(postsUrl, { headers });
            
            if (postsResponse.ok) {
                const data = await postsResponse.json();
                const posts = this.parseOAuthPosts(data.elements || []);
                await this.savePosts(posts);
                console.log('✅ OAuth API sync successful');
                return posts;
            }
            
            throw new Error(`API request failed: ${postsResponse.status}`);
            
        } catch (error) {
            console.warn('⚠️ OAuth API sync failed:', error.message);
            return null;
        }
    }

    /**
     * Parse posts from OAuth API response
     */
    parseOAuthPosts(shares) {
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
                }
            };
        }).filter(post => post.content.length > 0);
    }

    /**
     * Method 1: LinkedIn RSS Feed (Most Reliable)
     * LinkedIn provides RSS feeds for public profiles
     */
    async syncViaRSSFeed() {
        try {
            console.log('🔄 Attempting LinkedIn RSS sync...');
            
            // LinkedIn RSS URL format: https://www.linkedin.com/in/USERNAME/recent-activity/
            const rssUrl = 'https://www.linkedin.com/in/hzl/recent-activity/';
            
            // Use RSS to JSON service
            const rssToJsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
            
            const response = await fetch(rssToJsonUrl);
            const data = await response.json();
            
            if (data.status === 'ok' && data.items) {
                const posts = this.parseRSSPosts(data.items);
                await this.savePosts(posts);
                console.log('✅ RSS sync successful');
                return posts;
            }
            
            throw new Error('RSS feed not available');
            
        } catch (error) {
            console.warn('⚠️ RSS sync failed:', error.message);
            return null;
        }
    }

    /**
     * Method 2: Web Scraping with CORS Proxy
     * Scrape LinkedIn profile page for recent posts
     */
    async syncViaWebScraping() {
        try {
            console.log('🔄 Attempting web scraping sync...');
            
            // Use CORS proxy to access LinkedIn profile
            const proxyUrl = 'https://api.allorigins.win/get?url=';
            const linkedinUrl = 'https://www.linkedin.com/in/hzl/recent-activity/';
            
            const response = await fetch(proxyUrl + encodeURIComponent(linkedinUrl));
            const data = await response.json();
            
            if (data.contents) {
                const posts = this.parseLinkedInHTML(data.contents);
                if (posts.length > 0) {
                    await this.savePosts(posts);
                    console.log('✅ Web scraping sync successful');
                    return posts;
                }
            }
            
            throw new Error('No posts found via scraping');
            
        } catch (error) {
            console.warn('⚠️ Web scraping sync failed:', error.message);
            return null;
        }
    }

    /**
     * Method 3: Manual Update System
     * Easy way to manually add posts via web interface
     */
    createManualUpdateInterface() {
        const container = document.createElement('div');
        container.id = 'linkedin-manual-update';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #1a1a1a;
            border: 1px solid #00d4ff;
            border-radius: 8px;
            padding: 20px;
            z-index: 10000;
            max-width: 400px;
            display: none;
        `;
        
        container.innerHTML = `
            <h3 style="color: #00d4ff; margin-top: 0;">Add LinkedIn Post</h3>
            <textarea id="post-content" placeholder="Paste your LinkedIn post content here..." 
                style="width: 100%; height: 100px; margin-bottom: 10px; background: #333; color: #fff; border: 1px solid #555; border-radius: 4px; padding: 8px;"></textarea>
            <input type="text" id="post-tags" placeholder="Tags (comma-separated)" 
                style="width: 100%; margin-bottom: 10px; background: #333; color: #fff; border: 1px solid #555; border-radius: 4px; padding: 8px;">
            <input type="text" id="post-url" placeholder="LinkedIn post URL (optional)" 
                style="width: 100%; margin-bottom: 10px; background: #333; color: #fff; border: 1px solid #555; border-radius: 4px; padding: 8px;">
            <div style="display: flex; gap: 10px;">
                <button onclick="linkedInSync.addManualPost()" style="background: #00d4ff; color: #000; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Add Post</button>
                <button onclick="linkedInSync.hideManualInterface()" style="background: #666; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Cancel</button>
            </div>
        `;
        
        document.body.appendChild(container);
        
        // Add toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.innerHTML = '+ LinkedIn';
        toggleBtn.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #00d4ff;
            color: #000;
            border: none;
            padding: 10px 15px;
            border-radius: 4px;
            cursor: pointer;
            z-index: 9999;
            font-weight: bold;
        `;
        toggleBtn.onclick = () => this.showManualInterface();
        document.body.appendChild(toggleBtn);
    }

    showManualInterface() {
        document.getElementById('linkedin-manual-update').style.display = 'block';
    }

    hideManualInterface() {
        document.getElementById('linkedin-manual-update').style.display = 'none';
    }

    async addManualPost() {
        const content = document.getElementById('post-content').value;
        const tags = document.getElementById('post-tags').value;
        const url = document.getElementById('post-url').value || 'https://www.linkedin.com/in/hzl';
        
        if (!content.trim()) {
            alert('Please enter post content');
            return;
        }
        
        const post = {
            content: content.trim(),
            date: new Date().toISOString().split('T')[0],
            url: url,
            tags: tags ? tags.split(',').map(t => t.trim()) : ['Update'],
            source: 'manual'
        };
        
        const existingPosts = await this.loadExistingPosts();
        const updatedPosts = [post, ...existingPosts].slice(0, 10);
        
        await this.savePosts(updatedPosts);
        
        // Refresh the display
        if (typeof fetchLinkedInPosts === 'function') {
            fetchLinkedInPosts();
        }
        
        // Clear form
        document.getElementById('post-content').value = '';
        document.getElementById('post-tags').value = '';
        document.getElementById('post-url').value = '';
        
        this.hideManualInterface();
        
        console.log('✅ Manual post added successfully');
    }

    /**
     * Method 4: GitHub Actions Automation
     * Use GitHub Actions to periodically update posts
     */
    generateGitHubAction() {
        return `
name: Update LinkedIn Posts
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Manual trigger

jobs:
  update-posts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Update LinkedIn Posts
        run: |
          # Try multiple methods to get LinkedIn posts
          node linkedin-sync-improved.js
          
      - name: Commit changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add data/linkedin-posts.json
          git diff --staged --quiet || git commit -m "Auto-update LinkedIn posts"
          git push
        `;
    }

    /**
     * Parse RSS feed items into post format
     */
    parseRSSPosts(items) {
        return items.slice(0, 5).map(item => ({
            content: this.cleanHTMLContent(item.description || item.title),
            date: new Date(item.pubDate).toISOString().split('T')[0],
            url: item.link || 'https://www.linkedin.com/in/hzl',
            tags: this.extractTags(item.description || item.title),
            source: 'rss'
        }));
    }

    /**
     * Parse LinkedIn HTML for posts
     */
    parseLinkedInHTML(html) {
        // This is a simplified parser - LinkedIn's HTML structure changes frequently
        const posts = [];
        
        // Look for post patterns in HTML
        const postMatches = html.match(/data-urn="urn:li:activity:\d+"/g);
        
        if (postMatches) {
            postMatches.slice(0, 5).forEach(match => {
                const activityId = match.match(/\d+/)[0];
                posts.push({
                    content: 'LinkedIn post content (view on LinkedIn)',
                    date: new Date().toISOString().split('T')[0],
                    url: `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`,
                    tags: ['LinkedIn'],
                    source: 'scraping',
                    activityId: activityId
                });
            });
        }
        
        return posts;
    }

    /**
     * Clean HTML content and extract text
     */
    cleanHTMLContent(html) {
        if (!html) return '';
        
        return html
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim()
            .substring(0, 500); // Limit length
    }

    /**
     * Extract hashtags from content
     */
    extractTags(content) {
        if (!content) return ['Update'];
        
        const hashtags = content.match(/#\w+/g);
        if (hashtags) {
            return hashtags.map(tag => tag.substring(1));
        }
        
        // Generate tags based on keywords
        const keywords = ['development', 'coding', 'tech', 'programming', 'software', 'web', 'app'];
        const foundKeywords = keywords.filter(keyword => 
            content.toLowerCase().includes(keyword)
        );
        
        return foundKeywords.length > 0 ? foundKeywords : ['Update'];
    }

    /**
     * Load existing posts from JSON file
     */
    async loadExistingPosts() {
        try {
            const response = await fetch('/data/linkedin-posts.json');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.warn('Could not load existing posts:', error);
        }
        return [];
    }

    /**
     * Save posts to JSON file (requires server-side implementation)
     */
    async savePosts(posts) {
        try {
            // This would need a server endpoint to save files
            const response = await fetch('/api/save-linkedin-posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(posts)
            });
            
            if (!response.ok) {
                throw new Error('Failed to save posts');
            }
            
            console.log('✅ Posts saved successfully');
            
        } catch (error) {
            console.warn('⚠️ Could not save posts to server:', error);
            
            // Fallback: save to localStorage
            localStorage.setItem('linkedin-posts-backup', JSON.stringify(posts));
            console.log('💾 Posts saved to localStorage as backup');
        }
    }

    /**
     * Main sync function - tries all methods
     */
    async syncPosts() {
        console.log('🚀 Starting LinkedIn sync...');
        
        for (const method of this.methods) {
            let posts = null;
            
            switch (method) {
                case 'rss_feed':
                    posts = await this.syncViaRSSFeed();
                    break;
                case 'web_scraping':
                    posts = await this.syncViaWebScraping();
                    break;
                case 'manual_update':
                    // Manual updates are handled separately
                    continue;
                case 'static_fallback':
                    posts = await this.loadExistingPosts();
                    break;
            }
            
            if (posts && posts.length > 0) {
                console.log(`✅ Sync successful via ${method}`);
                return posts;
            }
        }
        
        console.warn('⚠️ All sync methods failed, using static data');
        return await this.loadExistingPosts();
    }
}

// Initialize the sync manager
const linkedInSync = new LinkedInSyncManager();

// Auto-sync on page load
document.addEventListener('DOMContentLoaded', () => {
    linkedInSync.syncPosts();
    
    // Add manual update interface for admin users
    if (window.location.hostname === 'localhost' || window.location.search.includes('admin=true')) {
        linkedInSync.createManualUpdateInterface();
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LinkedInSyncManager;
}