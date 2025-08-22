/**
 * LinkedIn Sync Fix - Updated Netlify Function
 * 
 * This is an updated version of the LinkedIn sync function with better error handling,
 * environment variable management, and Community Management API support.
 */

const https = require('https');

exports.handler = async (event, context) => {
    // Enhanced CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, LinkedIn-Version, X-Restli-Protocol-Version',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        // Parse request
        const body = event.body ? JSON.parse(event.body) : {};
        const { action = 'posts', accessToken, count = 50 } = body;
        
        console.log(`🔄 LinkedIn sync function called - Action: ${action}`);
        console.log(`🔧 Environment check: CLIENT_ID=${process.env.LINKEDIN_CLIENT_ID ? 'SET' : 'MISSING'}`);
        console.log(`🔧 Environment check: CLIENT_SECRET=${process.env.LINKEDIN_CLIENT_SECRET ? 'SET' : 'MISSING'}`);
        console.log(`🔧 Environment check: ACCESS_TOKEN=${process.env.LINKEDIN_ACCESS_TOKEN ? 'SET' : 'MISSING'}`);

        // Determine access token (from request body or environment)
        const finalAccessToken = accessToken || process.env.LINKEDIN_ACCESS_TOKEN;
        
        if (!finalAccessToken) {
            console.error('❌ No access token available');
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'No access token provided. Please set LINKEDIN_ACCESS_TOKEN environment variable or provide in request.',
                    troubleshooting: {
                        step1: 'Visit https://bluehawana.com/pages/linkedin_debug.html to get new token',
                        step2: 'Set LINKEDIN_ACCESS_TOKEN in Netlify environment variables',
                        step3: 'Or pass accessToken in request body'
                    }
                })
            };
        }

        switch (action) {
            case 'profile':
                return await handleProfileRequest(finalAccessToken, headers);
                
            case 'posts':
                return await handlePostsRequest(finalAccessToken, count, headers);
                
            case 'test':
                return await handleTestRequest(finalAccessToken, headers);
                
            case 'health':
                return await handleHealthCheck(finalAccessToken, headers);
                
            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'Invalid action. Supported: profile, posts, test, health'
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
                details: error.message,
                troubleshooting: {
                    common_issues: [
                        'LinkedIn API token expired (tokens expire in 60 days)',
                        'Missing LINKEDIN_ACCESS_TOKEN environment variable',
                        'LinkedIn API rate limiting (try again in a few minutes)',
                        'LinkedIn app permissions changed'
                    ],
                    debug_url: 'https://bluehawana.com/pages/linkedin_debug.html'
                }
            })
        };
    }
};

/**
 * Handle LinkedIn profile API request
 */
async function handleProfileRequest(accessToken, headers) {
    console.log('👤 Fetching LinkedIn profile...');
    
    try {
        // Use v2 API for profile - more reliable
        const response = await makeLinkedInRequest(
            '/v2/people/~?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))',
            accessToken,
            'GET'
        );
        
        console.log('✅ Profile fetched successfully');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: response,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('❌ Profile request failed:', error.message);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Failed to fetch LinkedIn profile',
                details: error.message
            })
        };
    }
}

/**
 * Handle LinkedIn posts API request
 */
async function handlePostsRequest(accessToken, count, headers) {
    console.log(`📝 Fetching LinkedIn posts (limit: ${count})...`);
    
    try {
        // Try Community Management API first (v202505)
        let response;
        
        try {
            response = await makeLinkedInRequest(
                `/rest/posts?q=author&author=urn:li:person:ACoAAB8zZBwBuEWaKs5G_v6sYsJ8qTvT6eqD9-8&count=${count}&sortBy=CREATED_TIME&sortOrder=DESCENDING`,
                accessToken,
                'GET',
                {
                    'LinkedIn-Version': '202505',
                    'X-Restli-Protocol-Version': '2.0.0'
                }
            );
            
            console.log('✅ Posts fetched via Community Management API');
        } catch (communityError) {
            console.log('⚠️  Community Management API failed, trying v2 API...');
            
            // Fallback to v2 API
            response = await makeLinkedInRequest(
                `/v2/people/~/shares?count=${count}&start=0&sortBy=CREATED_TIME&sortOrder=DESCENDING`,
                accessToken,
                'GET'
            );
            
            console.log('✅ Posts fetched via v2 API (fallback)');
        }
        
        // Process and format posts
        const processedPosts = await processLinkedInPosts(response);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: processedPosts,
                count: processedPosts.length,
                timestamp: new Date().toISOString(),
                api_version: response.apiVersion || 'v2'
            })
        };
        
    } catch (error) {
        console.error('❌ Posts request failed:', error.message);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Failed to fetch LinkedIn posts',
                details: error.message
            })
        };
    }
}

/**
 * Handle test request
 */
async function handleTestRequest(accessToken, headers) {
    console.log('🧪 Running LinkedIn API test...');
    
    const testResults = {
        timestamp: new Date().toISOString(),
        tests: []
    };
    
    // Test 1: Token validation
    try {
        await makeLinkedInRequest('/v2/people/~', accessToken, 'GET');
        testResults.tests.push({
            name: 'Token Validation',
            status: 'PASS',
            message: 'Access token is valid'
        });
    } catch (error) {
        testResults.tests.push({
            name: 'Token Validation',
            status: 'FAIL',
            message: error.message
        });
    }
    
    // Test 2: Profile access
    try {
        await makeLinkedInRequest('/v2/people/~?projection=(id,firstName,lastName)', accessToken, 'GET');
        testResults.tests.push({
            name: 'Profile Access',
            status: 'PASS',
            message: 'Profile data accessible'
        });
    } catch (error) {
        testResults.tests.push({
            name: 'Profile Access',
            status: 'FAIL',
            message: error.message
        });
    }
    
    // Test 3: Community Management API
    try {
        await makeLinkedInRequest(
            '/rest/posts?q=author&author=urn:li:person:ACoAAB8zZBwBuEWaKs5G_v6sYsJ8qTvT6eqD9-8&count=1',
            accessToken,
            'GET',
            {
                'LinkedIn-Version': '202505',
                'X-Restli-Protocol-Version': '2.0.0'
            }
        );
        testResults.tests.push({
            name: 'Community Management API',
            status: 'PASS',
            message: 'Community Management API accessible'
        });
    } catch (error) {
        testResults.tests.push({
            name: 'Community Management API',
            status: 'FAIL',
            message: error.message
        });
    }
    
    const allPassed = testResults.tests.every(test => test.status === 'PASS');
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: allPassed,
            results: testResults,
            summary: `${testResults.tests.filter(t => t.status === 'PASS').length}/${testResults.tests.length} tests passed`
        })
    };
}

/**
 * Handle health check
 */
async function handleHealthCheck(accessToken, headers) {
    const health = {
        timestamp: new Date().toISOString(),
        service: 'LinkedIn API Sync',
        status: 'healthy',
        environment: {
            client_id: process.env.LINKEDIN_CLIENT_ID ? 'configured' : 'missing',
            client_secret: process.env.LINKEDIN_CLIENT_SECRET ? 'configured' : 'missing',
            access_token: (accessToken || process.env.LINKEDIN_ACCESS_TOKEN) ? 'configured' : 'missing',
            github_token: process.env.GITHUB_TOKEN ? 'configured' : 'missing'
        }
    };
    
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(health)
    };
}

/**
 * Make LinkedIn API request with proper error handling
 */
async function makeLinkedInRequest(endpoint, accessToken, method = 'GET', additionalHeaders = {}) {
    const baseUrl = endpoint.startsWith('/rest/') ? 'https://api.linkedin.com' : 'https://api.linkedin.com';
    const url = `${baseUrl}${endpoint}`;
    
    const requestHeaders = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...additionalHeaders
    };
    
    console.log(`🌐 Making request to: ${url}`);
    
    const response = await fetch(url, {
        method,
        headers: requestHeaders
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ LinkedIn API error: ${response.status} - ${errorText}`);
        throw new Error(`LinkedIn API error: ${response.status} - ${errorText}`);
    }
    
    return await response.json();
}

/**
 * Process LinkedIn posts into consistent format
 */
async function processLinkedInPosts(postsData) {
    // This function would process the raw LinkedIn data into your blog format
    // Implementation depends on your specific data structure needs
    
    if (postsData.elements) {
        // v2 API format
        return postsData.elements.map(post => ({
            id: post.id,
            text: post.text?.text || '',
            publishedAt: new Date(post.created?.time || Date.now()).toISOString(),
            url: `https://linkedin.com/posts/activity-${post.id}`,
            platform: 'linkedin'
        }));
    } else if (postsData.data) {
        // Community Management API format
        return postsData.data.map(post => ({
            id: post.id,
            text: post.commentary || '',
            publishedAt: new Date(post.createdAt || Date.now()).toISOString(),
            url: `https://linkedin.com/posts/activity-${post.id}`,
            platform: 'linkedin'
        }));
    }
    
    return [];
}