/**
 * LinkedIn API Integration for Automatic Post Synchronization
 * Fetches LinkedIn posts and extracts activity IDs automatically
 */

class LinkedInAPISync {
    constructor() {
        // LinkedIn API Configuration
        this.clientId = '78j5zi980vkc3v';
        this.clientSecret = 'WPL_AP1.ybNtkPTT6e7UMOFt.TnVyVA==';
        this.redirectUri = window.location.origin + '/linkedin-callback.html';
        this.scopes = ['r_member_social', 'r_basicprofile', 'r_1st_connections_size'];
        this.apiVersion = '202211';
        this.accessToken = localStorage.getItem('linkedin_access_token');
        this.baseUrl = 'https://api.linkedin.com/v2';
    }

    /**
     * Initialize LinkedIn OAuth flow
     */
    initializeAuth() {
        const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
            `response_type=code&` +
            `client_id=${this.clientId}&` +
            `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
            `scope=${this.scopes.join('%20')}&` +
            `state=${this.generateState()}`;
        
        window.open(authUrl, 'linkedin-auth', 'width=600,height=600');
        return authUrl;
    }

    /**
     * Generate state parameter for OAuth security
     */
    generateState() {
        const state = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('linkedin_oauth_state', state);
        return state;
    }

    /**
     * Exchange authorization code for access token
     */
    async exchangeCodeForToken(code, state) {
        // Verify state parameter
        const storedState = localStorage.getItem('linkedin_oauth_state');
        if (state !== storedState) {
            throw new Error('Invalid state parameter');
        }

        const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: this.redirectUri,
            client_id: this.clientId,
            client_secret: this.clientSecret
        });

        try {
            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params
            });

            const tokenData = await response.json();
            
            if (tokenData.access_token) {
                this.accessToken = tokenData.access_token;
                localStorage.setItem('linkedin_access_token', this.accessToken);
                localStorage.setItem('linkedin_token_expires', Date.now() + (tokenData.expires_in * 1000));
                return tokenData;
            } else {
                throw new Error('Failed to get access token: ' + JSON.stringify(tokenData));
            }
        } catch (error) {
            console.error('Token exchange error:', error);
            throw error;
        }
    }

    /**
     * Check if access token is valid and not expired
     */
    isTokenValid() {
        const token = localStorage.getItem('linkedin_access_token');
        const expires = localStorage.getItem('linkedin_token_expires');
        
        return token && expires && Date.now() < parseInt(expires);
    }

    /**
     * Make authenticated API request
     */
    async makeAPIRequest(endpoint, options = {}) {
        if (!this.isTokenValid()) {
            throw new Error('No valid access token. Please authenticate first.');
        }

        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.accessToken}`,
            'LinkedIn-Version': this.apiVersion,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json',
            ...options.headers
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed: ${response.status} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    /**
     * Get user's profile information
     */
    async getUserProfile() {
        return await this.makeAPIRequest('/people/~?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))');
    }

    /**
     * Fetch user's LinkedIn posts using Network Updates API
     */
    async fetchUserPosts(count = 20) {
        try {
            // First, get the user's profile to get their ID
            const profile = await this.getUserProfile();
            const userId = profile.id;

            // Fetch network updates (posts)
            const networkUpdates = await this.makeAPIRequest(
                `/shares?q=owners&owners=urn:li:person:${userId}&count=${count}&sortBy=CREATED_TIME`
            );

            console.log('Network updates response:', networkUpdates);
            return networkUpdates;
        } catch (error) {
            console.error('Error fetching user posts:', error);
            throw error;
        }
    }

    /**
     * Extract activity ID from LinkedIn share URN or URL
     */
    extractActivityId(share) {
        try {
            // Try multiple methods to extract activity ID
            
            // Method 1: From share URN
            if (share.id) {
                const urnMatch = share.id.match(/urn:li:share:(\d+)/);
                if (urnMatch) {
                    return urnMatch[1];
                }
            }

            // Method 2: From activity URN
            if (share.activity) {
                const activityMatch = share.activity.match(/urn:li:activity:(\d+)/);
                if (activityMatch) {
                    return activityMatch[1];
                }
            }

            // Method 3: From share content or other fields
            if (share.content && share.content.contentEntities) {
                // Look for activity references in content
                const contentStr = JSON.stringify(share.content);
                const activityMatch = contentStr.match(/activity[:-](\d{19})/);
                if (activityMatch) {
                    return activityMatch[1];
                }
            }

            console.warn('Could not extract activity ID from share:', share);
            return null;
        } catch (error) {
            console.error('Error extracting activity ID:', error);
            return null;
        }
    }

    /**
     * Convert LinkedIn post to our format
     */
    convertLinkedInPost(share) {
        const activityId = this.extractActivityId(share);
        
        // Extract text content
        let content = '';
        if (share.content && share.content.contentEntities && share.content.contentEntities.length > 0) {
            const entity = share.content.contentEntities[0];
            if (entity.description) {
                content = entity.description;
            }
        }
        if (!content && share.text) {
            content = share.text.text || share.text;
        }
        if (!content && share.commentary) {
            content = share.commentary;
        }

        // Generate URL
        let url = 'https://www.linkedin.com/in/hzl/recent-activity/all/';
        if (activityId) {
            url = `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`;
        }

        // Extract hashtags as tags
        const tags = [];
        if (content) {
            const hashtagMatches = content.match(/#[\w]+/g);
            if (hashtagMatches) {
                tags.push(...hashtagMatches.map(tag => tag.substring(1)));
            }
        }

        // Add default tags based on content
        if (content.toLowerCase().includes('kubernetes')) tags.push('Kubernetes');
        if (content.toLowerCase().includes('linux')) tags.push('Linux');
        if (content.toLowerCase().includes('python')) tags.push('Python');
        if (content.toLowerCase().includes('ai') || content.toLowerCase().includes('artificial intelligence')) tags.push('AI');

        return {
            content: content || 'LinkedIn post content',
            date: share.created ? new Date(share.created.time).toISOString().split('T')[0] : '',
            url: url,
            tags: [...new Set(tags)] // Remove duplicates
        };
    }

    /**
     * Sync LinkedIn posts and update local data
     */
    async syncLinkedInPosts() {
        try {
            console.log('Starting LinkedIn post sync...');
            
            const networkData = await this.fetchUserPosts(20);
            const posts = [];

            if (networkData.elements && networkData.elements.length > 0) {
                for (const share of networkData.elements) {
                    const post = this.convertLinkedInPost(share);
                    posts.push(post);
                }
            }

            console.log('Synced posts:', posts);
            return posts;
        } catch (error) {
            console.error('Sync error:', error);
            throw error;
        }
    }

    /**
     * Generate updated JSON for linkedin-posts.json
     */
    generateUpdatedJSON(posts) {
        return JSON.stringify(posts, null, 2);
    }
}

// Initialize global instance
window.linkedInSync = new LinkedInAPISync();

// Listen for OAuth callback messages
window.addEventListener('message', async function(event) {
    if (event.origin !== window.location.origin) return;
    
    if (event.data.type === 'linkedin-oauth-callback') {
        try {
            await window.linkedInSync.exchangeCodeForToken(event.data.code, event.data.state);
            console.log('LinkedIn authentication successful!');
            
            // Automatically sync posts after authentication
            const posts = await window.linkedInSync.syncLinkedInPosts();
            
            // Display results
            const jsonOutput = window.linkedInSync.generateUpdatedJSON(posts);
            console.log('Updated LinkedIn posts JSON:', jsonOutput);
            
            // Trigger custom event for UI updates
            window.dispatchEvent(new CustomEvent('linkedin-sync-complete', { 
                detail: { posts, jsonOutput } 
            }));
            
        } catch (error) {
            console.error('LinkedIn authentication error:', error);
            window.dispatchEvent(new CustomEvent('linkedin-sync-error', { 
                detail: { error: error.message } 
            }));
        }
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LinkedInAPISync;
}