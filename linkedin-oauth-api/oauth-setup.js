/**
 * LinkedIn OAuth Setup and Token Management
 * Handles the OAuth flow to get access tokens for API access
 */

const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const qs = require('qs');

class LinkedInOAuth {
    constructor() {
        this.clientId = process.env.LINKEDIN_CLIENT_ID;
        this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
        this.redirectUri = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/auth/linkedin/callback';
        
        // LinkedIn API endpoints
        this.authUrl = 'https://www.linkedin.com/oauth/v2/authorization';
        this.tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
        this.apiBaseUrl = 'https://api.linkedin.com/rest';
        
        // Required scopes for accessing posts
        this.scopes = [
            'openid',
            'profile', 
            'email',
            'w_member_social'  // This allows reading your own posts
        ];
        
        this.state = null;
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
    }

    /**
     * Generate OAuth authorization URL
     */
    getAuthorizationUrl() {
        this.state = uuidv4();
        
        const params = {
            response_type: 'code',
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            state: this.state,
            scope: this.scopes.join(' ')
        };
        
        const authUrl = `${this.authUrl}?${qs.stringify(params)}`;
        
        console.log('🔗 LinkedIn OAuth Authorization URL:');
        console.log(authUrl);
        console.log('\n📋 Instructions:');
        console.log('1. Open the URL above in your browser');
        console.log('2. Login to LinkedIn and authorize the application');
        console.log('3. You will be redirected to the callback URL with a code');
        console.log('4. Copy the "code" parameter from the URL');
        console.log('5. Use exchangeCodeForToken(code) to get access token');
        
        return {
            authUrl,
            state: this.state,
            instructions: 'Open the URL and complete OAuth flow'
        };
    }

    /**
     * Exchange authorization code for access token
     */
    async exchangeCodeForToken(authorizationCode, receivedState = null) {
        try {
            // Verify state parameter if provided
            if (receivedState && receivedState !== this.state) {
                throw new Error('Invalid state parameter - possible CSRF attack');
            }
            
            console.log('🔄 Exchanging authorization code for access token...');
            
            const tokenData = {
                grant_type: 'authorization_code',
                code: authorizationCode,
                client_id: this.clientId,
                client_secret: this.clientSecret,
                redirect_uri: this.redirectUri
            };
            
            const response = await axios.post(this.tokenUrl, qs.stringify(tokenData), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            
            const tokenInfo = response.data;
            
            this.accessToken = tokenInfo.access_token;
            this.refreshToken = tokenInfo.refresh_token;
            this.tokenExpiry = Date.now() + (tokenInfo.expires_in * 1000);
            
            console.log('✅ Access token obtained successfully!');
            console.log(`Token expires in: ${tokenInfo.expires_in} seconds`);
            
            // Test the token immediately
            await this.testToken();
            
            return {
                access_token: this.accessToken,
                refresh_token: this.refreshToken,
                expires_in: tokenInfo.expires_in,
                expires_at: new Date(this.tokenExpiry).toISOString()
            };
            
        } catch (error) {
            console.error('❌ Token exchange failed:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Test the access token by getting user profile
     */
    async testToken() {
        try {
            console.log('🧪 Testing access token...');
            
            const response = await axios.get(`${this.apiBaseUrl}/people/~`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'LinkedIn-Version': '202405'
                }
            });
            
            const profile = response.data;
            console.log('✅ Token test successful!');
            console.log(`Profile: ${profile.firstName?.localized?.en_US} ${profile.lastName?.localized?.en_US}`);
            console.log(`ID: ${profile.id}`);
            
            return profile;
            
        } catch (error) {
            console.error('❌ Token test failed:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get user's posts using the API
     */
    async getUserPosts() {
        try {
            if (!this.accessToken) {
                throw new Error('No access token available. Complete OAuth flow first.');
            }
            
            // Check if token is expired
            if (Date.now() >= this.tokenExpiry) {
                console.log('🔄 Token expired, need to refresh...');
                // In a real implementation, you'd refresh the token here
                throw new Error('Token expired. Please re-authenticate.');
            }
            
            console.log('📝 Fetching user posts...');
            
            // First get user profile to get the person ID
            const profileResponse = await axios.get(`${this.apiBaseUrl}/people/~`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'LinkedIn-Version': '202405'
                }
            });
            
            const personId = profileResponse.data.id;
            console.log(`👤 Person ID: ${personId}`);
            
            // Get user's posts/shares
            const postsResponse = await axios.get(`${this.apiBaseUrl}/shares`, {
                params: {
                    q: 'owners',
                    owners: `urn:li:person:${personId}`,
                    count: 10,
                    sortBy: 'CREATED'
                },
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'LinkedIn-Version': '202405'
                }
            });
            
            const shares = postsResponse.data.elements || [];
            console.log(`📊 Found ${shares.length} shares`);
            
            // Also try to get posts using the newer API
            let posts = [];
            try {
                const postsApiResponse = await axios.get(`${this.apiBaseUrl}/posts`, {
                    params: {
                        q: 'author',
                        author: `urn:li:person:${personId}`,
                        count: 10,
                        sortBy: 'CREATED'
                    },
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'LinkedIn-Version': '202405'
                    }
                });
                
                posts = postsApiResponse.data.elements || [];
                console.log(`📊 Found ${posts.length} posts`);
                
            } catch (postsError) {
                console.warn('⚠️ Posts API failed, using shares only:', postsError.response?.status);
            }
            
            // Combine and format the results
            const allContent = this.formatLinkedInContent([...shares, ...posts]);
            
            console.log(`✅ Successfully retrieved ${allContent.length} items`);
            return allContent;
            
        } catch (error) {
            console.error('❌ Failed to get user posts:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Format LinkedIn API response into our standard format
     */
    formatLinkedInContent(items) {
        return items.map(item => {
            // Extract content text
            let content = '';
            if (item.text?.text) {
                content = item.text.text;
            } else if (item.commentary?.text) {
                content = item.commentary.text;
            } else if (item.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text) {
                content = item.specificContent['com.linkedin.ugc.ShareContent'].shareCommentary.text;
            }
            
            // Extract creation date
            let date = new Date().toISOString().split('T')[0];
            if (item.created?.time) {
                date = new Date(item.created.time).toISOString().split('T')[0];
            } else if (item.createdAt) {
                date = new Date(item.createdAt).toISOString().split('T')[0];
            }
            
            // Extract activity ID
            let activityId = null;
            let url = 'https://www.linkedin.com/in/hzl';
            
            if (item.id) {
                // Extract activity ID from the URN
                const urnMatch = item.id.match(/urn:li:share:(\d+)/);
                if (urnMatch) {
                    activityId = urnMatch[1];
                    url = `https://www.linkedin.com/feed/update/urn:li:share:${activityId}/`;
                }
            }
            
            // Extract tags from content
            const tags = this.extractTags(content);
            
            return {
                content: content.substring(0, 500),
                date: date,
                url: url,
                activityId: activityId,
                tags: tags,
                source: 'linkedin_api'
            };
        }).filter(item => item.content && item.content.length > 10);
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
        const keywords = ['android', 'aosp', 'development', 'performance', 'engineering', 'build', 'optimization'];
        const foundKeywords = keywords.filter(keyword => 
            content.toLowerCase().includes(keyword)
        );
        
        return foundKeywords.length > 0 ? foundKeywords : ['LinkedIn'];
    }

    /**
     * Save tokens to environment/file for persistence
     */
    saveTokens() {
        const tokenData = {
            access_token: this.accessToken,
            refresh_token: this.refreshToken,
            expires_at: this.tokenExpiry,
            created_at: Date.now()
        };
        
        console.log('💾 Save these tokens to your environment variables:');
        console.log(`LINKEDIN_ACCESS_TOKEN=${this.accessToken}`);
        console.log(`LINKEDIN_REFRESH_TOKEN=${this.refreshToken}`);
        console.log(`LINKEDIN_TOKEN_EXPIRY=${this.tokenExpiry}`);
        
        return tokenData;
    }

    /**
     * Load tokens from environment variables
     */
    loadTokens() {
        this.accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
        this.refreshToken = process.env.LINKEDIN_REFRESH_TOKEN;
        this.tokenExpiry = parseInt(process.env.LINKEDIN_TOKEN_EXPIRY) || 0;
        
        if (this.accessToken && this.tokenExpiry > Date.now()) {
            console.log('✅ Loaded valid tokens from environment');
            return true;
        } else {
            console.log('⚠️ No valid tokens found in environment');
            return false;
        }
    }
}

/**
 * Interactive OAuth setup
 */
async function runOAuthSetup() {
    console.log('🚀 LinkedIn OAuth Setup');
    console.log('=' * 50);
    
    const oauth = new LinkedInOAuth();
    
    // Check if we already have tokens
    if (oauth.loadTokens()) {
        console.log('✅ Valid tokens found, testing API access...');
        try {
            const posts = await oauth.getUserPosts();
            console.log(`✅ API access working! Found ${posts.length} posts`);
            return oauth;
        } catch (error) {
            console.log('❌ Existing tokens invalid, starting new OAuth flow...');
        }
    }
    
    // Start OAuth flow
    const authInfo = oauth.getAuthorizationUrl();
    
    console.log('\n⏳ Waiting for authorization...');
    console.log('After completing OAuth, run:');
    console.log('node oauth-setup.js [authorization_code]');
    
    return oauth;
}

// Command line usage
if (require.main === module) {
    const authCode = process.argv[2];
    
    if (authCode) {
        // Exchange code for token
        const oauth = new LinkedInOAuth();
        oauth.exchangeCodeForToken(authCode)
            .then(tokenInfo => {
                console.log('✅ OAuth setup complete!');
                oauth.saveTokens();
                
                // Test getting posts
                return oauth.getUserPosts();
            })
            .then(posts => {
                console.log(`🎉 Successfully retrieved ${posts.length} posts!`);
                posts.forEach((post, index) => {
                    console.log(`\n📝 Post ${index + 1}:`);
                    console.log(`Content: ${post.content.substring(0, 100)}...`);
                    console.log(`Date: ${post.date}`);
                    console.log(`Activity ID: ${post.activityId}`);
                    console.log(`URL: ${post.url}`);
                });
            })
            .catch(error => {
                console.error('❌ OAuth setup failed:', error.message);
                process.exit(1);
            });
    } else {
        // Show authorization URL
        runOAuthSetup().catch(error => {
            console.error('❌ OAuth setup failed:', error.message);
            process.exit(1);
        });
    }
}

module.exports = { LinkedInOAuth, runOAuthSetup };