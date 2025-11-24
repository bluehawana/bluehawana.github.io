/**
 * LinkedIn API Client
 * Uses your real LinkedIn credentials for authentic API access
 */

const fetch = require('node-fetch');

class LinkedInAPI {
    constructor() {
        this.clientId = process.env.LINKEDIN_CLIENT_ID;
        this.accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
        this.apiVersion = process.env.LINKEDIN_API_VERSION || '202405';
        this.baseUrl = 'https://api.linkedin.com';
        
        if (!this.accessToken) {
            throw new Error('LINKEDIN_ACCESS_TOKEN is required');
        }
    }

    /**
     * Make authenticated request to LinkedIn API
     */
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const headers = {
            'Authorization': `Bearer ${this.accessToken}`,
            'LinkedIn-Version': this.apiVersion,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json',
            ...options.headers
        };

        console.log(`🔗 LinkedIn API Request: ${endpoint}`);
        
        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ LinkedIn API Error (${response.status}):`, errorText);
                throw new Error(`LinkedIn API Error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log(`✅ LinkedIn API Success: ${endpoint}`);
            return data;

        } catch (error) {
            console.error(`❌ LinkedIn API Request Failed:`, error.message);
            throw error;
        }
    }

    /**
     * Get user profile information
     */
    async getProfile() {
        try {
            const profile = await this.makeRequest('/v2/people/~');
            console.log('👤 Profile retrieved:', profile.localizedFirstName, profile.localizedLastName);
            return profile;
        } catch (error) {
            console.error('❌ Failed to get profile:', error.message);
            throw error;
        }
    }

    /**
     * Get user's posts/shares
     */
    async getPosts() {
        try {
            console.log('📝 Fetching LinkedIn posts...');
            
            // First get profile to get person ID
            const profile = await this.getProfile();
            const personId = profile.id;
            
            // Method 1: Try UGC Posts API (newer)
            try {
                const ugcPosts = await this.makeRequest(`/v2/ugcPosts?q=authors&authors=List(urn:li:person:${personId})&count=10`);
                
                if (ugcPosts.elements && ugcPosts.elements.length > 0) {
                    console.log(`✅ Found ${ugcPosts.elements.length} UGC posts`);
                    return this.parseUGCPosts(ugcPosts.elements);
                }
            } catch (error) {
                console.warn('⚠️ UGC Posts API failed:', error.message);
            }

            // Method 2: Try Shares API (legacy)
            try {
                const shares = await this.makeRequest(`/v2/shares?q=owners&owners=urn:li:person:${personId}&count=10`);
                
                if (shares.elements && shares.elements.length > 0) {
                    console.log(`✅ Found ${shares.elements.length} shares`);
                    return this.parseShares(shares.elements);
                }
            } catch (error) {
                console.warn('⚠️ Shares API failed:', error.message);
            }

            // Method 3: Try Posts API (Community Management)
            try {
                const posts = await this.makeRequest(`/v2/posts?q=author&author=urn:li:person:${personId}&count=10`);
                
                if (posts.elements && posts.elements.length > 0) {
                    console.log(`✅ Found ${posts.elements.length} community posts`);
                    return this.parseCommunityPosts(posts.elements);
                }
            } catch (error) {
                console.warn('⚠️ Community Posts API failed:', error.message);
            }

            console.warn('⚠️ No posts found via any API method');
            return [];

        } catch (error) {
            console.error('❌ Failed to get posts:', error.message);
            throw error;
        }
    }

    /**
     * Parse UGC Posts format
     */
    parseUGCPosts(ugcPosts) {
        return ugcPosts.map(post => {
            const content = this.extractContent(post.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text);
            const createdTime = new Date(post.created?.time || Date.now());
            
            return {
                content: content || 'LinkedIn post content',
                date: createdTime.toISOString().split('T')[0],
                url: this.generatePostUrl(post.id),
                tags: this.extractTags(content),
                source: 'linkedin_api_ugc',
                activityId: this.extractActivityId(post.id),
                rawData: post
            };
        });
    }

    /**
     * Parse Shares format
     */
    parseShares(shares) {
        return shares.map(share => {
            const content = this.extractContent(share.text?.text);
            const createdTime = new Date(share.created?.time || Date.now());
            
            return {
                content: content || 'LinkedIn share content',
                date: createdTime.toISOString().split('T')[0],
                url: this.generatePostUrl(share.id),
                tags: this.extractTags(content),
                source: 'linkedin_api_shares',
                activityId: this.extractActivityId(share.id),
                rawData: share
            };
        });
    }

    /**
     * Parse Community Posts format
     */
    parseCommunityPosts(posts) {
        return posts.map(post => {
            const content = this.extractContent(post.commentary);
            const createdTime = new Date(post.createdAt || Date.now());
            
            return {
                content: content || 'LinkedIn community post',
                date: createdTime.toISOString().split('T')[0],
                url: this.generatePostUrl(post.id),
                tags: this.extractTags(content),
                source: 'linkedin_api_community',
                activityId: this.extractActivityId(post.id),
                rawData: post
            };
        });
    }

    /**
     * Extract text content from various LinkedIn API formats
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
     * Generate LinkedIn post URL from ID
     */
    generatePostUrl(postId) {
        if (postId && postId.includes('activity:')) {
            return `https://www.linkedin.com/feed/update/${postId}/`;
        }
        
        // Extract activity ID if possible
        const activityId = this.extractActivityId(postId);
        if (activityId) {
            return `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`;
        }
        
        return 'https://www.linkedin.com/in/hzl';
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
     * Extract hashtags and keywords from content
     */
    extractTags(content) {
        if (!content) return ['LinkedIn'];
        
        const hashtags = content.match(/#\w+/g);
        if (hashtags) {
            return hashtags.map(tag => tag.substring(1));
        }
        
        // Extract keywords
        const keywords = ['android', 'aosp', 'development', 'performance', 'engineering', 'build', 'optimization', 'mission', 'completed'];
        const foundKeywords = keywords.filter(keyword => 
            content.toLowerCase().includes(keyword)
        );
        
        return foundKeywords.length > 0 ? foundKeywords : ['LinkedIn'];
    }

    /**
     * Test API connection
     */
    async testConnection() {
        try {
            console.log('🧪 Testing LinkedIn API connection...');
            
            const profile = await this.getProfile();
            console.log(`✅ API Connection successful! Hello ${profile.localizedFirstName}!`);
            
            const posts = await this.getPosts();
            console.log(`✅ Posts API working! Found ${posts.length} posts`);
            
            return {
                success: true,
                profile: profile,
                postsCount: posts.length,
                posts: posts
            };
            
        } catch (error) {
            console.error('❌ API Connection failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = LinkedInAPI;