/**
 * LinkedIn API Integration for Automatic Post Synchronization
 * Fetches LinkedIn posts and extracts activity IDs automatically
 */

class LinkedInAPISync {
    constructor() {
        // LinkedIn API Configuration - Set these in your environment
        this.clientId = this.getConfig('LINKEDIN_CLIENT_ID');
        this.clientSecret = this.getConfig('LINKEDIN_CLIENT_SECRET');
        this.redirectUri = window.location.origin + '/linkedin-callback.html';
        this.scopes = ['r_member_social', 'r_basicprofile', 'r_1st_connections_size'];
        this.apiVersion = '202211';
        this.accessToken = localStorage.getItem('linkedin_access_token');
        this.baseUrl = 'https://api.linkedin.com/v2';
    }

    /**
     * Get configuration from environment or config file
     * In production, these should be set via environment variables
     */
    getConfig(key) {
        // Try localStorage first (for development)
        const stored = localStorage.getItem(key);
        if (stored) return stored;
        
        // Try window.config object (if set by config.js)
        if (window.linkedinConfig && window.linkedinConfig[key]) {
            return window.linkedinConfig[key];
        }
        
        // Fallback error
        throw new Error(`Missing configuration: ${key}. Please set this in localStorage or config file.`);
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
     * Fetch user's LinkedIn posts using multiple API endpoints
     */
    async fetchUserPosts(count = 20) {
        try {
            // First, get the user's profile to get their ID
            const profile = await this.getUserProfile();
            const userId = profile.id;

            console.log('Fetching posts for user:', userId);

            // Try multiple API endpoints to get posts
            const results = await Promise.allSettled([
                // Method 1: Shares API
                this.makeAPIRequest(`/shares?q=owners&owners=urn:li:person:${userId}&count=${count}&sortBy=CREATED_TIME`),
                
                // Method 2: Posts API (newer endpoint)
                this.makeAPIRequest(`/posts?q=author&author=urn:li:person:${userId}&count=${count}&sortBy=CREATED_TIME`),
                
                // Method 3: UGC Posts API  
                this.makeAPIRequest(`/ugcPosts?q=authors&authors=List(urn:li:person:${userId})&count=${count}&sortBy=CREATED_TIME`)
            ]);

            // Combine results from all successful API calls
            let allPosts = [];
            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value.elements) {
                    console.log(`API method ${index + 1} returned ${result.value.elements.length} posts`);
                    allPosts = [...allPosts, ...result.value.elements];
                } else {
                    console.log(`API method ${index + 1} failed:`, result.reason);
                }
            });

            // Remove duplicates based on post ID
            const uniquePosts = this.removeDuplicatePosts(allPosts);
            
            console.log(`Total unique posts found: ${uniquePosts.length}`);
            return { elements: uniquePosts };
            
        } catch (error) {
            console.error('Error fetching user posts:', error);
            throw error;
        }
    }

    /**
     * Remove duplicate posts based on ID or content similarity
     */
    removeDuplicatePosts(posts) {
        const seen = new Set();
        const unique = [];
        
        for (const post of posts) {
            // Create a unique identifier based on ID or content
            const identifier = post.id || 
                              (post.specificContent?.com?.linkedin?.ugc?.shareContent?.shareCommentary?.text?.substring(0, 100)) ||
                              (post.commentary?.substring(0, 100)) ||
                              JSON.stringify(post).substring(0, 100);
            
            if (!seen.has(identifier)) {
                seen.add(identifier);
                unique.push(post);
            }
        }
        
        return unique;
    }

    /**
     * Extract activity ID from LinkedIn post data using multiple methods
     */
    extractActivityId(post) {
        try {
            console.log('Extracting activity ID from post:', post);
            
            // Method 1: From post.id (direct activity URN)
            if (post.id) {
                const patterns = [
                    /urn:li:activity:(\d{19})/,
                    /urn:li:share:(\d{19})/,
                    /urn:li:ugcPost:(\d{19})/,
                    /(\d{19})/  // Just the number
                ];
                
                for (const pattern of patterns) {
                    const match = post.id.match(pattern);
                    if (match && match[1] && match[1].length === 19) {
                        console.log(`Activity ID found via method 1: ${match[1]}`);
                        return match[1];
                    }
                }
            }

            // Method 2: From post.activity field
            if (post.activity) {
                const activityMatch = post.activity.match(/urn:li:activity:(\d{19})/);
                if (activityMatch) {
                    console.log(`Activity ID found via method 2: ${activityMatch[1]}`);
                    return activityMatch[1];
                }
            }

            // Method 3: From post URL or permalink
            if (post.permalink) {
                const urlMatch = post.permalink.match(/activity-(\d{19})-/);
                if (urlMatch) {
                    console.log(`Activity ID found via method 3: ${urlMatch[1]}`);
                    return urlMatch[1];
                }
            }

            // Method 4: From ugcPost structure
            if (post.ugcPost) {
                const ugcMatch = post.ugcPost.match(/urn:li:ugcPost:(\d{19})/);
                if (ugcMatch) {
                    console.log(`Activity ID found via method 4: ${ugcMatch[1]}`);
                    return ugcMatch[1];
                }
            }

            // Method 5: Deep search in post content and metadata
            const postStr = JSON.stringify(post);
            const deepMatch = postStr.match(/(?:activity|share|ugcPost)[:\-](\d{19})/);
            if (deepMatch) {
                console.log(`Activity ID found via method 5: ${deepMatch[1]}`);
                return deepMatch[1];
            }

            // Method 6: Extract from created time and profile combination (fallback)
            if (post.created && post.created.time) {
                // LinkedIn activity IDs are often based on timestamp
                const timestamp = post.created.time;
                // This is a heuristic - LinkedIn IDs are usually close to timestamp * 1000000
                const estimatedId = Math.floor(timestamp * 1000000).toString();
                if (estimatedId.length >= 18) {
                    console.log(`Estimated activity ID via method 6: ${estimatedId.substring(0, 19)}`);
                    return estimatedId.substring(0, 19);
                }
            }

            console.warn('Could not extract activity ID from post:', post);
            return null;
        } catch (error) {
            console.error('Error extracting activity ID:', error);
            return null;
        }
    }

    /**
     * Convert LinkedIn post to our format with enhanced content extraction
     */
    convertLinkedInPost(post) {
        const activityId = this.extractActivityId(post);
        
        // Extract text content using multiple methods
        let content = this.extractPostContent(post);

        // Generate URL
        let url = 'https://www.linkedin.com/in/hzl/recent-activity/all/';
        if (activityId) {
            url = `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`;
        }

        // Extract hashtags and generate tags
        const tags = this.extractPostTags(content);

        // Extract date
        let date = '';
        if (post.created && post.created.time) {
            date = new Date(post.created.time).toISOString().split('T')[0];
        } else if (post.createdAt) {
            date = new Date(post.createdAt).toISOString().split('T')[0];
        } else if (post.lastModified) {
            date = new Date(post.lastModified.time).toISOString().split('T')[0];
        }

        return {
            content: content || 'LinkedIn post content',
            date: date,
            url: url,
            tags: tags,
            activityId: activityId // Store for debugging
        };
    }

    /**
     * Extract content from various LinkedIn post formats
     */
    extractPostContent(post) {
        const contentSources = [
            // UGC Post format
            () => post.specificContent?.com?.linkedin?.ugc?.shareContent?.shareCommentary?.text,
            
            // Standard share format
            () => post.content?.contentEntities?.[0]?.description,
            
            // Text field variations
            () => post.text?.text,
            () => post.text,
            () => post.commentary,
            
            // UGC variations
            () => post.ugcPost?.commentary,
            () => post.ugcPost?.shareCommentary?.text,
            
            // Article or rich content
            () => post.content?.article?.description,
            () => post.content?.article?.title,
            
            // Media posts
            () => post.content?.media?.title,
            () => post.content?.media?.description,
            
            // Fallback to any text in the post
            () => {
                const postStr = JSON.stringify(post);
                const textMatch = postStr.match(/"text":\s*"([^"]+)"/);
                return textMatch ? textMatch[1] : null;
            }
        ];

        for (const source of contentSources) {
            try {
                const content = source();
                if (content && typeof content === 'string' && content.trim().length > 0) {
                    console.log('Content extracted using source:', source.toString());
                    return content.trim();
                }
            } catch (error) {
                // Continue to next source
                continue;
            }
        }

        console.warn('No content found in post:', post);
        return 'LinkedIn post content';
    }

    /**
     * Extract and generate tags from post content
     */
    extractPostTags(content) {
        const tags = [];
        
        if (!content) return tags;

        // Extract hashtags
        const hashtagMatches = content.match(/#[\w]+/g);
        if (hashtagMatches) {
            tags.push(...hashtagMatches.map(tag => tag.substring(1)));
        }

        // Add contextual tags based on content keywords
        const keywordTags = {
            'kubernetes': 'Kubernetes',
            'k8s': 'Kubernetes', 
            'linux': 'Linux',
            'python': 'Python',
            'javascript': 'JavaScript',
            'react': 'React',
            'angular': 'Angular',
            'docker': 'Docker',
            'aws': 'AWS',
            'azure': 'Azure',
            'cloud': 'Cloud',
            'ai': 'AI',
            'artificial intelligence': 'AI',
            'machine learning': 'MachineLearning',
            'devops': 'DevOps',
            'microservices': 'Microservices',
            'api': 'API',
            'github': 'GitHub',
            'linkedin': 'LinkedIn',
            'website': 'WebDevelopment',
            'fullstack': 'FullStack',
            'developer': 'Developer',
            'coding': 'Coding',
            'programming': 'Programming'
        };

        const contentLower = content.toLowerCase();
        for (const [keyword, tag] of Object.entries(keywordTags)) {
            if (contentLower.includes(keyword)) {
                tags.push(tag);
            }
        }

        // Remove duplicates and return
        return [...new Set(tags)];
    }

    /**
     * Sync LinkedIn posts and detect new content automatically
     */
    async syncLinkedInPosts() {
        try {
            console.log('🔄 Starting intelligent LinkedIn post sync...');
            
            // Fetch current posts from API
            const networkData = await this.fetchUserPosts(50); // Get more posts to catch any missed ones
            const fetchedPosts = [];

            if (networkData.elements && networkData.elements.length > 0) {
                console.log(`📥 Processing ${networkData.elements.length} posts from LinkedIn API...`);
                
                for (const rawPost of networkData.elements) {
                    const processedPost = this.convertLinkedInPost(rawPost);
                    
                    // Only add posts with valid content
                    if (processedPost.content && processedPost.content !== 'LinkedIn post content') {
                        fetchedPosts.push(processedPost);
                    }
                }
            }

            // Load existing posts from local data
            const existingPosts = await this.loadExistingPosts();
            
            // Detect new posts
            const newPosts = this.detectNewPosts(fetchedPosts, existingPosts);
            
            if (newPosts.length > 0) {
                console.log(`✨ Found ${newPosts.length} new posts!`);
                
                // Merge and sort posts
                const allPosts = this.mergeAndSortPosts(newPosts, existingPosts);
                
                // Update activity IDs for existing posts that might be missing them
                const updatedPosts = this.updateMissingActivityIds(allPosts, fetchedPosts);
                
                console.log('🎉 Sync complete with updates!');
                return updatedPosts;
            } else {
                console.log('📝 No new posts detected');
                
                // Still check for activity ID updates on existing posts
                const updatedPosts = this.updateMissingActivityIds(existingPosts, fetchedPosts);
                return updatedPosts;
            }
            
        } catch (error) {
            console.error('❌ Sync error:', error);
            throw error;
        }
    }

    /**
     * Load existing posts from local data file
     */
    async loadExistingPosts() {
        try {
            const response = await fetch('./data/linkedin-posts.json?v=' + Date.now());
            const posts = await response.json();
            console.log(`📁 Loaded ${posts.length} existing posts from local data`);
            return posts;
        } catch (error) {
            console.warn('Could not load existing posts:', error);
            return [];
        }
    }

    /**
     * Detect new posts by comparing content and URLs
     */
    detectNewPosts(fetchedPosts, existingPosts) {
        const existingUrls = new Set(existingPosts.map(post => post.url));
        const existingContents = new Set(existingPosts.map(post => 
            post.content.substring(0, 150).toLowerCase().trim()
        ));

        const newPosts = fetchedPosts.filter(post => {
            const contentPreview = post.content.substring(0, 150).toLowerCase().trim();
            
            // Check if this is truly a new post
            const isNewUrl = !existingUrls.has(post.url);
            const isNewContent = !existingContents.has(contentPreview);
            
            // Don't add if URL is the generic fallback URL
            const isGenericUrl = post.url === 'https://www.linkedin.com/in/hzl/recent-activity/all/';
            
            return (isNewUrl && isNewContent) && !isGenericUrl;
        });

        if (newPosts.length > 0) {
            console.log('🆕 New posts detected:', newPosts.map(p => ({
                content: p.content.substring(0, 100) + '...',
                url: p.url,
                activityId: p.activityId
            })));
        }

        return newPosts;
    }

    /**
     * Merge new posts with existing posts and sort by date
     */
    mergeAndSortPosts(newPosts, existingPosts) {
        const allPosts = [...newPosts, ...existingPosts];
        
        // Sort by date (newest first), then by content length for stable sort
        return allPosts.sort((a, b) => {
            if (a.date && b.date) {
                return new Date(b.date) - new Date(a.date);
            }
            // If no dates, put posts with activity IDs first
            if (a.activityId && !b.activityId) return -1;
            if (!a.activityId && b.activityId) return 1;
            
            return 0;
        });
    }

    /**
     * Update missing activity IDs from fetched posts
     */
    updateMissingActivityIds(currentPosts, fetchedPosts) {
        let updatedCount = 0;
        
        const updatedPosts = currentPosts.map(currentPost => {
            // Skip if already has a valid activity ID
            if (currentPost.url.includes('urn:li:activity:')) {
                return currentPost;
            }
            
            // Find matching post from API data
            const matchingPost = fetchedPosts.find(fetched => {
                const currentContent = currentPost.content.substring(0, 100).toLowerCase().trim();
                const fetchedContent = fetched.content.substring(0, 100).toLowerCase().trim();
                return currentContent === fetchedContent;
            });
            
            if (matchingPost && matchingPost.activityId) {
                console.log(`🔗 Updated activity ID for post: ${currentPost.content.substring(0, 50)}...`);
                updatedCount++;
                
                return {
                    ...currentPost,
                    url: `https://www.linkedin.com/feed/update/urn:li:activity:${matchingPost.activityId}/`,
                    activityId: matchingPost.activityId,
                    date: matchingPost.date || currentPost.date
                };
            }
            
            return currentPost;
        });
        
        if (updatedCount > 0) {
            console.log(`🔧 Updated ${updatedCount} posts with missing activity IDs`);
        }
        
        return updatedPosts;
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