/**
 * Netlify Function to handle LinkedIn API environment configuration
 * This provides secure access to environment variables without exposing them in client code
 */

exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
    
    try {
        // Get environment variables from Netlify
        const config = {
            LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
            LINKEDIN_API_VERSION: process.env.LINKEDIN_API_VERSION || '202505',
            LINKEDIN_BASE_URL: 'https://api.linkedin.com',
            
            // Don't expose the client secret - it should only be used server-side
            // CLIENT_SECRET is intentionally NOT included for security
            
            // OAuth configuration
            REDIRECT_URI: `${process.env.URL || 'https://bluehawana.com'}/linkedin-callback.html`,
            SCOPES: [
                'email',
                'openid',
                'profile',
                'r_events',
                'rw_events',
                'w_member_social'
            ]
        };
        
        // Validate required environment variables
        if (!config.LINKEDIN_CLIENT_ID) {
            console.error('Missing LINKEDIN_CLIENT_ID environment variable');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'LinkedIn configuration not properly set up',
                    details: 'LINKEDIN_CLIENT_ID environment variable is missing'
                })
            };
        }
        
        console.log('✅ LinkedIn environment configuration requested');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                config: config,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('❌ Error in LinkedIn environment function:', error);
        
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