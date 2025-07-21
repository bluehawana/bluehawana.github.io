/**
 * Netlify Function for LinkedIn Community Management API Sync (v202505)
 * Handles server-side LinkedIn API requests with proper authentication
 * 
 * This is the updated version that supports the Community Management API
 */

exports.handler = async (event, context) => {
    // Enhanced CORS headers for LinkedIn API integration
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, LinkedIn-Version, X-Restli-Protocol-Version',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        const { action, accessToken, count = 50 } = JSON.parse(event.body || '{}');
        
        if (!accessToken) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Access token required'
                })
            };
        }
        
        console.log(`🔄 LinkedIn sync function called - Action: ${action}`);
        
        switch (action) {
            case 'profile':
                return await handleProfileRequest(accessToken, headers);
                
            case 'posts':
                return await handlePostsRequest(accessToken, count, headers);
                
            case 'test':
                return await handleTestRequest(accessToken, headers);
                
            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'Invalid action. Supported: profile, posts, test'
                    })
                };
        }
        
    } catch (error) {
        console.error('❌ LinkedIn sync function error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                details: error.message
            })
        };
    }
};

/**
 * Handle LinkedIn profile API request
 */
async function handleProfileRequest(accessToken, headers) {
    try {
        const response = await fetch('https://api.linkedin.com/v2/people/~?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'LinkedIn-Version': '202505',
                'X-Restli-Protocol-Version': '2.0.0'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Profile API failed: ${response.status} - ${errorText}`);
        }
        
        const profileData = await response.json();
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: profileData,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('Profile request error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Profile request failed',
                details: error.message
            })
        };
    }
}

/**
 * Handle LinkedIn posts API request using Community Management API v202505
 */
async function handlePostsRequest(accessToken, count, headers) {
    try {
        // First get profile to get user ID
        const profileResponse = await fetch('https://api.linkedin.com/v2/people/~?projection=(id)', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'LinkedIn-Version': '202505',
                'X-Restli-Protocol-Version': '2.0.0'
            }
        });
        
        if (!profileResponse.ok) {
            throw new Error(`Profile fetch failed: ${profileResponse.status}`);
        }
        
        const profile = await profileResponse.json();
        const userId = profile.id;
        
        console.log(`📝 Fetching posts for user: ${userId}`);
        
        // Try Community Management API endpoints (v202505)
        const endpoints = [
            // Primary - Community Management Posts API
            `https://api.linkedin.com/rest/posts?q=authors&authors=List(urn:li:person:${userId})&count=${count}&sortBy=LAST_MODIFIED`,
            
            // Secondary - Community Management Shares API  
            `https://api.linkedin.com/rest/shares?q=owners&owners=urn:li:person:${userId}&count=${count}&sortBy=CREATED_TIME`,
            
            // Legacy fallback - UGC Posts API
            `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(urn:li:person:${userId})&count=${count}&sortBy=LAST_MODIFIED`
        ];
        
        const results = await Promise.allSettled(
            endpoints.map(url => fetch(url, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'LinkedIn-Version': '202505',
                    'X-Restli-Protocol-Version': '2.0.0'
                }
            }))
        );
        
        let allPosts = [];
        
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            if (result.status === 'fulfilled' && result.value.ok) {
                const data = await result.value.json();
                if (data.elements && data.elements.length > 0) {
                    console.log(`✅ Community Management API endpoint ${i + 1} returned ${data.elements.length} posts`);
                    allPosts = [...allPosts, ...data.elements];
                } else {
                    console.log(`⚠️ Community Management API endpoint ${i + 1} returned no posts`);
                }
            } else {
                const reason = result.status === 'fulfilled' ? 
                    `HTTP ${result.value.status}` : 
                    result.reason?.message || 'Request failed';
                console.log(`❌ Community Management API endpoint ${i + 1} failed: ${reason}`);
            }
        }
        
        // Remove duplicates based on post ID
        const uniquePosts = Array.from(
            new Map(allPosts.map(post => [post.id, post])).values()
        );
        
        console.log(`📊 Total unique posts from Community Management API: ${uniquePosts.length}`);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: {
                    elements: uniquePosts,
                    total: uniquePosts.length,
                    userId: userId,
                    apiVersion: '202505',
                    endpoints: endpoints.length,
                    source: 'Community Management API'
                },
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('Community Management API posts request error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Community Management API posts request failed',
                details: error.message
            })
        };
    }
}

/**
 * Handle test API request to validate authentication and API access
 */
async function handleTestRequest(accessToken, headers) {
    try {
        const tests = [
            {
                name: 'Profile API',
                url: 'https://api.linkedin.com/v2/people/~?projection=(id)',
                expected: 'User profile data'
            },
            {
                name: 'Community Management API Check',
                url: 'https://api.linkedin.com/rest/posts?count=1',
                expected: 'Posts endpoint access'
            }
        ];
        
        const results = {};
        
        for (const test of tests) {
            try {
                const response = await fetch(test.url, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'LinkedIn-Version': '202505',
                        'X-Restli-Protocol-Version': '2.0.0'
                    }
                });
                
                results[test.name] = {
                    status: response.status,
                    ok: response.ok,
                    message: response.ok ? 'Success' : `HTTP ${response.status}`
                };
                
            } catch (error) {
                results[test.name] = {
                    status: 'ERROR',
                    ok: false,
                    message: error.message
                };
            }
        }
        
        const allTestsPassed = Object.values(results).every(result => result.ok);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: {
                    tokenValid: allTestsPassed,
                    communityManagementApiAccess: results['Community Management API Check']?.ok || false,
                    profileAccess: results['Profile API']?.ok || false,
                    tests: results,
                    message: allTestsPassed ? 'All tests passed' : 'Some tests failed'
                },
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: {
                    tokenValid: false,
                    error: error.message
                },
                timestamp: new Date().toISOString()
            })
        };
    }
}