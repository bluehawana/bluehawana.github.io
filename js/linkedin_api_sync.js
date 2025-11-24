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
        this.scopes = ['email', 'openid', 'profile', 'r_events', 'rw_events', 'w_member_social']; // Updated to match token scopes
        this.apiVersion = '202505'; // Updated to latest version
        this.accessToken = localStorage.getItem('linkedin_access_token');
        this.baseUrl = 'https://api.linkedin.com/rest'; // Updated to REST endpoint
        this.v2BaseUrl = 'https://api.linkedin.com/v2'; // Keep v2 for fallback
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
        
        // Try common default configurations for development
        const defaults = {
            'LINKEDIN_CLIENT_ID': '77duha47hcbh8o', // Default client ID
            'LINKEDIN_CLIENT_SECRET': '' // Never set defaults for secrets
        };
        
        if (defaults[key] && key !== 'LINKEDIN_CLIENT_SECRET') {
            console.warn(`Using default configuration for ${key}. Please set proper credentials.`);
            return defaults[key];
        }
        
        // Check if running in development mode and provide better error messages
        const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isDevelopment) {
            console.error(`⚠️ Missing LinkedIn configuration: ${key}`);
            console.error('To fix this:');
            console.error(`1. Set in localStorage: localStorage.setItem('${key}', 'your_value')`);
            console.error('2. Or create a linkedinConfig object in your HTML');
            console.error('3. Or set up environment variables for production');
            
            // Return a placeholder for client ID to prevent crashes
            if (key === 'LINKEDIN_CLIENT_ID') {
                return 'MISSING_CLIENT_ID';
            }
        }
        
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
        
        if (!token) {
            console.warn('❌ No access token found');
            return false;
        }
        
        if (!expires) {
            console.warn('❌ No token expiry found');
            return false;
        }
        
        const expiryTime = parseInt(expires);
        const currentTime = Date.now();
        const timeUntilExpiry = expiryTime - currentTime;
        
        if (timeUntilExpiry <= 0) {
            console.warn(`❌ Token expired ${Math.abs(timeUntilExpiry/1000/60)} minutes ago`);
            return false;
        }
        
        if (timeUntilExpiry < 60 * 60 * 1000) { // Less than 1 hour
            console.warn(`⚠️ Token expires in ${Math.floor(timeUntilExpiry/1000/60)} minutes`);
        }
        
        console.log(`✅ Token valid for ${Math.floor(timeUntilExpiry/1000/60/60)} hours`);
        return true;
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
        // Use v2 endpoint for profile data (more reliable)
        const url = `${this.v2BaseUrl}/people/~?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))`;
        const headers = {
            'Authorization': `Bearer ${this.accessToken}`,
            'LinkedIn-Version': this.apiVersion,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json'
        };

        try {
            const response = await fetch(url, { headers });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Profile API request failed: ${response.status} - ${errorText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Profile API error:', error);
            throw error;
        }
    }

    /**
     * Fetch user's LinkedIn posts using LinkedIn Community Management API v202505
     * This uses the proper endpoints that replaced the deprecated v2 APIs
     */
    async fetchUserPosts(count = 50) {
        try {
            // First, get the user's profile to get their ID
            const profile = await this.getUserProfile();
            const userId = profile.id;

            console.log(`🔍 Fetching posts for user: ${userId} using Community Management API v202505`);

            // Use the new Community Management API endpoints (202505)
            const results = await Promise.allSettled([
                // Method 1: Posts API (PRIMARY - replaces ugcPosts in 202505)
                this.makeAPIRequestV2(`/rest/posts?q=authors&authors=List(urn:li:person:${userId})&count=${count}&sortBy=LAST_MODIFIED`),
                
                // Method 2: Posts API with author query
                this.makeAPIRequestV2(`/rest/posts?q=author&author=urn:li:person:${userId}&count=${count}&sortBy=CREATED_TIME`),
                
                // Method 3: Shares API (fallback for older content)
                this.makeAPIRequestV2(`/rest/shares?q=owners&owners=urn:li:person:${userId}&count=${count}&sortBy=CREATED_TIME`),
                
                // Method 4: UGC Posts (legacy support)
                this.makeAPIRequestV2(`/v2/ugcPosts?q=authors&authors=List(urn:li:person:${userId})&count=${count}&sortBy=LAST_MODIFIED`)
            ]);

            // Process results from all successful API calls
            let allPosts = [];
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    const data = result.value;
                    const posts = data.elements || data.values || (Array.isArray(data) ? data : []);
                    if (posts.length > 0) {
                        console.log(`✅ Community Management API method ${index + 1} returned ${posts.length} posts`);
                        allPosts = [...allPosts, ...posts];
                        
                        // Log sample post structure for debugging
                        console.log(`Sample post structure from method ${index + 1}:`, JSON.stringify(posts[0], null, 2).substring(0, 500));
                    } else {
                        console.log(`⚠️ Community Management API method ${index + 1} returned no posts`);
                    }
                } else {
                    console.error(`❌ Community Management API method ${index + 1} failed:`, result.reason?.message || result.reason);
                }
            });

            // If no posts found, try fallback methods
            if (allPosts.length === 0) {
                console.log('🔄 No posts found from primary methods, trying fallback...');
                allPosts = await this.tryFallbackMethods(userId, count);
            }

            // Remove duplicates and enhance post data
            const uniquePosts = this.removeDuplicatePosts(allPosts);
            console.log(`✨ Total unique posts found: ${uniquePosts.length}`);
            
            return { elements: uniquePosts };
            
        } catch (error) {
            console.error('❌ Error fetching user posts from Community Management API:', error);
            
            // Try to return cached data if available
            const cachedPosts = await this.loadExistingPosts();
            if (cachedPosts.length > 0) {
                console.log('📁 Returning cached posts due to API error');
                // Convert cached posts to expected format
                return { elements: cachedPosts.map(post => ({ 
                    id: post.activityId ? `urn:li:activity:${post.activityId}` : null,
                    created: { time: new Date(post.date).getTime() },
                    content: post.content,
                    url: post.url,
                    tags: post.tags
                })) };
            }
            throw error;
        }
    }

    /**
     * Enhanced API request method that handles both REST and v2 endpoints properly
     */
    async makeAPIRequestV2(endpoint, options = {}) {
        if (!this.isTokenValid()) {
            throw new Error('No valid access token. Please authenticate first.');
        }

        // Determine if this is a v2 or REST endpoint
        const isV2Endpoint = endpoint.startsWith('/v2/');
        const baseUrl = isV2Endpoint ? this.v2BaseUrl : 'https://api.linkedin.com';
        const url = `${baseUrl}${endpoint}`;
        
        const headers = {
            'Authorization': `Bearer ${this.accessToken}`,
            'LinkedIn-Version': this.apiVersion,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json',
            ...options.headers
        };

        try {
            console.log(`🌐 Making API request to: ${url}`);
            const response = await fetch(url, {
                method: 'GET',
                ...options,
                headers
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API Error ${response.status}:`, errorText);
                throw new Error(`API request failed: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log(`✅ API request successful, returned:`, Object.keys(data));
            return data;
            
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    /**
     * Try fallback methods when main API calls fail
     */
    async tryFallbackMethods(userId, count) {
        const fallbackResults = await Promise.allSettled([
            // Simplified shares call
            this.makeAPIRequest(`/shares?q=owners&owners=urn:li:person:${userId}&count=${count}`),
            
            // Activity feed (if available)
            this.makeAPIRequest(`/people/~/network/updates?count=${count}&type=SHAR`),
            
            // Profile activity (minimal)
            this.makeAPIRequest(`/people/~/shares?count=${count}`)
        ]);

        let fallbackPosts = [];
        fallbackResults.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.elements) {
                console.log(`🔄 Fallback method ${index + 1} returned ${result.value.elements.length} posts`);
                fallbackPosts = [...fallbackPosts, ...result.value.elements];
            }
        });

        return fallbackPosts;
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
     * Extract activity ID from LinkedIn Community Management API post data
     * Updated for v202505 API response format
     */
    extractActivityId(post) {
        try {
            console.log('🔍 Extracting activity ID from Community Management API post');
            
            // Method 1: Direct ID from Community Management API (202505 format)
            if (post.id) {
                const patterns = [
                    /urn:li:activity:(\d{19})/,           // Activity URN
                    /urn:li:share:(\d{19})/,              // Share URN  
                    /urn:li:ugcPost:(\d{19})/,            // UGC Post URN
                    /urn:li:post:(\d{19})/,               // New Posts API URN
                    /(\d{19})/                            // Just the 19-digit number
                ];
                
                for (const [index, pattern] of patterns.entries()) {
                    const match = post.id.match(pattern);
                    if (match && match[1] && match[1].length === 19) {
                        console.log(`✅ Activity ID found via method 1.${index + 1}: ${match[1]}`);
                        return match[1];
                    }
                }
            }

            // Method 2: From lifecycle state or activity reference (202505 API)
            if (post.lifecycleState && post.lifecycleState.activity) {
                const activityMatch = post.lifecycleState.activity.match(/urn:li:activity:(\d{19})/);
                if (activityMatch) {
                    console.log(`✅ Activity ID found via method 2: ${activityMatch[1]}`);
                    return activityMatch[1];
                }
            }

            // Method 3: From content reference or parent activity
            if (post.content && post.content.contentEntities) {
                const contentStr = JSON.stringify(post.content);
                const contentMatch = contentStr.match(/urn:li:activity:(\d{19})/);
                if (contentMatch) {
                    console.log(`✅ Activity ID found via method 3: ${contentMatch[1]}`);
                    return contentMatch[1];
                }
            }

            // Method 4: From response metadata (x-restli-id header equivalent)
            if (post.responseHeaders && post.responseHeaders['x-restli-id']) {
                const restliId = post.responseHeaders['x-restli-id'];
                const restliMatch = restliId.match(/(\d{19})/);
                if (restliMatch) {
                    console.log(`✅ Activity ID found via method 4: ${restliMatch[1]}`);
                    return restliMatch[1];
                }
            }

            // Method 5: From permalink or URL (existing posts)
            if (post.permalink || post.url) {
                const urlSource = post.permalink || post.url;
                const urlPatterns = [
                    /activity-(\d{19})-/,                 // LinkedIn activity URL format
                    /urn%3Ali%3Aactivity%3A(\d{19})/,     // URL encoded URN
                    /update\/urn:li:activity:(\d{19})/    // Direct activity URL
                ];
                
                for (const [index, pattern] of urlPatterns.entries()) {
                    const match = urlSource.match(pattern);
                    if (match) {
                        console.log(`✅ Activity ID found via method 5.${index + 1}: ${match[1]}`);
                        return match[1];
                    }
                }
            }

            // Method 6: Deep search in entire post structure (comprehensive)
            const postStr = JSON.stringify(post);
            const deepPatterns = [
                /urn:li:activity:(\d{19})/,
                /urn:li:share:(\d{19})/,
                /urn:li:ugcPost:(\d{19})/,
                /urn:li:post:(\d{19})/,
                /"activity":\s*"urn:li:activity:(\d{19})"/,
                /"share":\s*"urn:li:share:(\d{19})"/
            ];

            for (const [index, pattern] of deepPatterns.entries()) {
                const match = postStr.match(pattern);
                if (match && match[1] && match[1].length === 19) {
                    console.log(`✅ Activity ID found via method 6.${index + 1}: ${match[1]}`);
                    return match[1];
                }
            }

            // Method 7: Generate from timestamp (enhanced heuristic)
            if (post.created || post.createdAt || post.lastModified) {
                const timestamp = post.created?.time || 
                                 new Date(post.createdAt).getTime() ||
                                 new Date(post.lastModified?.time || post.lastModified).getTime();
                
                if (timestamp) {
                    // LinkedIn activity IDs often correlate with timestamp
                    // Multiple heuristic approaches for better accuracy
                    const heuristics = [
                        Math.floor(timestamp * 1000000).toString(),     // Standard multiplier
                        Math.floor(timestamp * 1048576).toString(),     // 2^20 multiplier
                        Math.floor(timestamp / 1000 * 1000000000).toString() // Seconds based
                    ];
                    
                    for (const [index, heuristic] of heuristics.entries()) {
                        if (heuristic.length >= 19) {
                            const estimatedId = heuristic.substring(0, 19);
                            console.log(`⚠️ Estimated activity ID via method 7.${index + 1}: ${estimatedId}`);
                            return estimatedId;
                        }
                    }
                }
            }

            console.warn('❌ Could not extract activity ID from post structure:', {
                id: post.id,
                hasLifecycleState: !!post.lifecycleState,
                hasContent: !!post.content,
                hasPermalink: !!post.permalink,
                hasUrl: !!post.url,
                hasCreated: !!(post.created || post.createdAt || post.lastModified)
            });
            
            return null;
            
        } catch (error) {
            console.error('❌ Error extracting activity ID:', error);
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
     * Extract content from LinkedIn Community Management API post formats (v202505)
     */
    extractPostContent(post) {
        console.log('🔍 Extracting content from Community Management API post');
        
        const contentSources = [
            // Community Management API v202505 format
            () => post.commentary?.text,
            () => post.commentary,
            
            // Posts API content format
            () => post.content?.contentEntities?.[0]?.entityLocation?.url,
            () => post.content?.contentEntities?.[0]?.description?.text,  
            () => post.content?.contentEntities?.[0]?.description,
            
            // Legacy UGC Post format (still used)
            () => post.specificContent?.com?.linkedin?.ugc?.shareContent?.shareCommentary?.text,
            () => post.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text,
            
            // Direct text fields
            () => post.text?.text,
            () => post.text,
            () => post.description?.text,
            () => post.description,
            
            // Share content variations  
            () => post.shareContent?.commentary?.text,
            () => post.shareContent?.commentary,
            () => post.shareCommentary?.text,
            () => post.shareCommentary,
            
            // Article content
            () => post.content?.article?.title + '\n' + post.content?.article?.description,
            () => post.content?.article?.title,
            () => post.content?.article?.description?.text,
            () => post.content?.article?.description,
            
            // Media content
            () => post.content?.media?.title?.text + '\n' + post.content?.media?.description?.text,
            () => post.content?.media?.title?.text,
            () => post.content?.media?.description?.text,
            () => post.content?.media?.title,
            () => post.content?.media?.description,
            
            // Multi-content posts
            () => {
                if (post.content?.multiImage?.commentary) {
                    return post.content.multiImage.commentary.text || post.content.multiImage.commentary;
                }
                return null;
            },
            
            // Legacy variations
            () => post.ugcPost?.commentary,
            () => post.ugcPost?.shareCommentary?.text,
            () => post.ugcPost?.shareCommentary,
            
            // Deep search fallback (enhanced for 202505)
            () => {
                const postStr = JSON.stringify(post);
                const patterns = [
                    /"commentary":\s*"([^"]+)"/,
                    /"text":\s*"([^"]+)"/,
                    /"description":\s*"([^"]+)"/,
                    /"shareCommentary":\s*"([^"]+)"/,
                    /"title":\s*"([^"]+)"/
                ];
                
                for (const pattern of patterns) {
                    const match = postStr.match(pattern);
                    if (match && match[1] && match[1].length > 10) {
                        return match[1];
                    }
                }
                return null;
            },
            
            // Extract from nested content structures
            () => {
                if (post.content && typeof post.content === 'object') {
                    const searchContent = (obj, depth = 0) => {
                        if (depth > 3) return null; // Prevent infinite recursion
                        
                        for (const [key, value] of Object.entries(obj)) {
                            if (typeof value === 'string' && value.length > 20) {
                                if (key.includes('text') || key.includes('commentary') || 
                                    key.includes('description') || key.includes('title')) {
                                    return value;
                                }
                            } else if (typeof value === 'object' && value !== null) {
                                const nested = searchContent(value, depth + 1);
                                if (nested) return nested;
                            }
                        }
                        return null;
                    };
                    
                    return searchContent(post.content);
                }
                return null;
            }
        ];

        // Try each content source
        for (const [index, source] of contentSources.entries()) {
            try {
                const content = source();
                if (content && typeof content === 'string' && content.trim().length > 0) {
                    const cleanContent = content.trim()
                        .replace(/\\n/g, '\n')           // Unescape newlines
                        .replace(/\\"/g, '"')            // Unescape quotes
                        .replace(/\\u([0-9a-fA-F]{4})/g, // Decode unicode
                            (match, digits) => String.fromCharCode(parseInt(digits, 16)));
                    
                    if (cleanContent.length >= 10) { // Minimum content length
                        console.log(`✅ Content extracted via method ${index + 1}: "${cleanContent.substring(0, 100)}..."`);
                        return cleanContent;
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Content extraction method ${index + 1} failed:`, error.message);
                continue;
            }
        }

        console.warn('❌ No content found in Community Management API post structure');
        console.log('📋 Post keys available:', Object.keys(post));
        
        // Return a fallback that includes some identifying information
        return `LinkedIn post content (ID: ${post.id || 'unknown'})`;
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