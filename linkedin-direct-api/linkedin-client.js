/**
 * LinkedIn Direct API Client
 * Uses access token to directly fetch LinkedIn posts
 */

const axios = require('axios');

class LinkedInDirectClient {
    constructor(accessToken) {
        this.accessToken = accessToken || process.env.LINKEDIN_ACCESS_TOKEN;
        this.apiBaseUrl = 'https://api.linkedin.com/rest';
        this.apiVersion = '202405';
        
        if (!this.accessToken) {
            throw new Error('LinkedIn access token is required');
        }
        
        // Setup axios instance with default headers
        this.api = axios.create({
            baseURL: this.apiBaseUrl,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'LinkedIn-Version': this.apiVersion,
                'X-Restli-Protocol-Version': '2.0.0',
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
    }

    /**
     * Test the access token by getting user profile
     */
    async testConnection() {
        try {
            console.log('🧪 Testing LinkedIn API connection...');
            
            const response = await this.api.get('/people/~');
            const profile = response.data;
            
            console.log('✅ LinkedIn API connection successful!');
            console.log(`👤 Profile: ${profile.firstName?.localized?.en_US || profile.localizedFirstName} ${profile.lastName?.localized?.en_US || profile.localizedLastName}`);
            console.log(`🆔 Person ID: ${profile.id}`);
            
            return {
                success: true,
                profile: profile,
                personId: profile.id
            };
            
        } catch (error) {
            console.error('❌ LinkedIn API connection failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Get user's person ID (needed for other API calls)
     */
    async getPersonId() {
        try {
            const response = await this.api.get('/people/~');
            return response.data.id;
        } catch (error) {
            console.error('❌ Failed to get person ID:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get user's posts using the shares API
     */
    async getUserShares(count = 10) {
        try {
            console.log('📝 Fetching user shares...');
            
            const personId = await this.getPersonId();
            console.log(`👤 Using person ID: ${personId}`);
            
            const response = await this.api.get('/shares', {
                params: {
                    q: 'owners',
                    owners: `urn:li:person:${personId}`,
                    count: count,
                    sortBy: 'CREATED'
                }
            });
            
            const shares = response.data.elements || [];
            console.log(`📊 Found ${shares.length} shares`);
            
            return this.formatShares(shares);
            
        } catch (error) {
            console.error('❌ Failed to get user shares:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get user's posts using the posts API (newer)
     */
    async getUserPosts(count = 10) {
        try {
            console.log('📝 Fetching user posts...');
            
            const personId = await this.getPersonId();
            
            const response = await this.api.get('/posts', {
                params: {
                    q: 'author',
                    author: `urn:li:person:${personId}`,
                    count: count,
                    sortBy: 'CREATED'
                }
            });
            
            const posts = response.data.elements || [];
            console.log(`📊 Found ${posts.length} posts`);
            
            return this.formatPosts(posts);
            
        } catch (error) {
            console.error('❌ Failed to get user posts:', error.response?.data || error.message);
            // Don't throw here, let it fall back to shares
            return [];
        }
    }

    /**
     * Get user's activity feed
     */
    async getUserActivity(count = 10) {
        try {
            console.log('📝 Fetching user activity...');
            
            const personId = await this.getPersonId();
            
            // Try different activity endpoints
            const endpoints = [
                `/people/${personId}/networkUpdates`,
                `/people/~:${personId}/network/updates`,
                `/feed/updates`
            ];
            
            for (const endpoint of endpoints) {
                try {
                    const response = await this.api.get(endpoint, {
                        params: { count: count }
                    });
                    
                    if (response.data.elements && response.data.elements.length > 0) {
                        console.log(`📊 Found ${response.data.elements.length} activities from ${endpoint}`);
                        return this.formatActivity(response.data.elements);
                    }
                } catch (endpointError) {
                    console.warn(`⚠️ Endpoint ${endpoint} failed:`, endpointError.response?.status);
                }
            }
            
            return [];
            
        } catch (error) {
            console.error('❌ Failed to get user activity:', error.response?.data || error.message);
            return [];
        }
    }

    /**
     * Get all user content using multiple methods
     */
    async getAllUserContent(count = 10) {
        try {
            console.log('🔄 Fetching all user content using multiple methods...');
            
            const results = await Promise.allSettled([
                this.getUserPosts(count),
                this.getUserShares(count),
                this.getUserActivity(count)
            ]);
            
            let allContent = [];
            
            results.forEach((result, index) => {
                const methodNames = ['Posts API', 'Shares API', 'Activity API'];
                if (result.status === 'fulfilled' && result.value.length > 0) {
                    console.log(`✅ ${methodNames[index]}: ${result.value.length} items`);
                    allContent = allContent.concat(result.value);
                } else {
                    console.log(`❌ ${methodNames[index]}: ${result.reason || 'No data'}`);
                }
            });
            
            // Remove duplicates based on content hash
            const uniqueContent = this.removeDuplicates(allContent);
            
            // Sort by date (newest first)
            uniqueContent.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            console.log(`✅ Total unique content items: ${uniqueContent.length}`);
            return uniqueContent.slice(0, count);
            
        } catch (error) {
            console.error('❌ Failed to get all user content:', error);
            throw error;
        }
    }

    /**
     * Format shares data into standard format
     */
    formatShares(shares) {
        return shares.map(share => {
            let content = '';
            let activityId = null;
            let url = 'https://www.linkedin.com/in/hzl';
            
            // Extract content
            if (share.text?.text) {
                content = share.text.text;
            } else if (share.commentary?.text) {
                content = share.commentary.text;
            } else if (share.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text) {
                content = share.specificContent['com.linkedin.ugc.ShareContent'].shareCommentary.text;
            }
            
            // Extract activity ID and URL
            if (share.id) {
                const shareMatch = share.id.match(/urn:li:share:(\d+)/);
                if (shareMatch) {
                    activityId = shareMatch[1];
                    url = `https://www.linkedin.com/feed/update/urn:li:share:${activityId}/`;
                }
            }
            
            // Extract date
            let date = new Date().toISOString().split('T')[0];
            if (share.created?.time) {
                date = new Date(share.created.time).toISOString().split('T')[0];
            }
            
            return {
                content: content.substring(0, 500),
                date: date,
                url: url,
                activityId: activityId,
                tags: this.extractTags(content),
                source: 'linkedin_shares_api',
                rawId: share.id
            };
        }).filter(item => item.content && item.content.length > 10);
    }

    /**
     * Format posts data into standard format
     */
    formatPosts(posts) {
        return posts.map(post => {
            let content = '';
            let activityId = null;
            let url = 'https://www.linkedin.com/in/hzl';
            
            // Extract content
            if (post.commentary?.text) {
                content = post.commentary.text;
            } else if (post.content?.text) {
                content = post.content.text;
            }
            
            // Extract activity ID and URL
            if (post.id) {
                const activityMatch = post.id.match(/urn:li:activity:(\d+)/);
                if (activityMatch) {
                    activityId = activityMatch[1];
                    url = `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`;
                }
            }
            
            // Extract date
            let date = new Date().toISOString().split('T')[0];
            if (post.createdAt) {
                date = new Date(post.createdAt).toISOString().split('T')[0];
            }
            
            return {
                content: content.substring(0, 500),
                date: date,
                url: url,
                activityId: activityId,
                tags: this.extractTags(content),
                source: 'linkedin_posts_api',
                rawId: post.id
            };
        }).filter(item => item.content && item.content.length > 10);
    }

    /**
     * Format activity data into standard format
     */
    formatActivity(activities) {
        return activities.map(activity => {
            let content = '';
            let activityId = null;
            let url = 'https://www.linkedin.com/in/hzl';
            
            // Extract content from various activity types
            if (activity.updateContent?.person?.headline) {
                content = activity.updateContent.person.headline;
            } else if (activity.updateContent?.companyStatusUpdate?.share?.comment) {
                content = activity.updateContent.companyStatusUpdate.share.comment;
            }
            
            // Extract date
            let date = new Date().toISOString().split('T')[0];
            if (activity.timestamp) {
                date = new Date(activity.timestamp).toISOString().split('T')[0];
            }
            
            return {
                content: content.substring(0, 500),
                date: date,
                url: url,
                activityId: activityId,
                tags: this.extractTags(content),
                source: 'linkedin_activity_api',
                rawId: activity.id
            };
        }).filter(item => item.content && item.content.length > 10);
    }

    /**
     * Remove duplicate content based on content hash
     */
    removeDuplicates(items) {
        const seen = new Set();
        return items.filter(item => {
            const hash = this.generateContentHash(item);
            if (seen.has(hash)) {
                return false;
            }
            seen.add(hash);
            return true;
        });
    }

    /**
     * Generate content hash for deduplication
     */
    generateContentHash(item) {
        const content = (item.content || '').substring(0, 100).toLowerCase().trim();
        const date = item.date || '';
        return `${content}-${date}`.replace(/[^a-z0-9-]/g, '');
    }

    /**
     * Extract hashtags and keywords from content
     */
    extractTags(content) {
        if (!content) return ['LinkedIn'];
        
        // Extract hashtags
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
     * Get detailed API information for debugging
     */
    async getAPIInfo() {
        try {
            const testResult = await this.testConnection();
            
            if (!testResult.success) {
                return testResult;
            }
            
            const personId = testResult.personId;
            
            // Test different endpoints
            const endpointTests = [
                { name: 'Profile', endpoint: '/people/~' },
                { name: 'Shares', endpoint: '/shares', params: { q: 'owners', owners: `urn:li:person:${personId}`, count: 1 } },
                { name: 'Posts', endpoint: '/posts', params: { q: 'author', author: `urn:li:person:${personId}`, count: 1 } }
            ];
            
            const results = {};
            
            for (const test of endpointTests) {
                try {
                    const response = await this.api.get(test.endpoint, { params: test.params });
                    results[test.name] = {
                        success: true,
                        status: response.status,
                        dataKeys: Object.keys(response.data),
                        elementCount: response.data.elements?.length || 0
                    };
                } catch (error) {
                    results[test.name] = {
                        success: false,
                        status: error.response?.status,
                        error: error.response?.data?.message || error.message
                    };
                }
            }
            
            return {
                success: true,
                personId: personId,
                endpointTests: results,
                tokenValid: true
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                tokenValid: false
            };
        }
    }
}

module.exports = { LinkedInDirectClient };