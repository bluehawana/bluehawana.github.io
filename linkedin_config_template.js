/**
 * LinkedIn API Configuration Template
 * 
 * SECURITY: Copy this file to 'linkedin-config.js' and fill in your actual credentials.
 * NEVER commit linkedin-config.js to the repository!
 * 
 * To use:
 * 1. Copy this file: cp linkedin-config.template.js linkedin-config.js
 * 2. Fill in your actual LinkedIn API credentials in linkedin-config.js
 * 3. The .gitignore file will prevent linkedin-config.js from being committed
 */

// Configuration object for LinkedIn API
window.linkedinConfig = {
    LINKEDIN_CLIENT_ID: 'YOUR_CLIENT_ID_HERE',
    LINKEDIN_CLIENT_SECRET: 'YOUR_CLIENT_SECRET_HERE',
    
    // API Configuration
    API_VERSION: '202505',  // Latest version as per LinkedIn API docs
    BASE_URL: 'https://api.linkedin.com/rest',  // Community Management API
    
    // OAuth Configuration - DO NOT MODIFY THESE SCOPES
    SCOPES: [
        'r_member_social',      // Access to member's social activity
        'r_basicprofile',       // Basic profile information
        'r_1st_connections_size', // Connection count
        'r_organization_social', // Community Management API READ access (required for v202505)
        'w_organization_social'  // Community Management API WRITE access (required for v202505)
    ],
    
    // Pre-configured access token (if available) - OPTIONAL
    ACCESS_TOKEN: null // Set to your token string if you have one
};

// Auto-configure localStorage with credentials when this script loads
if (typeof window !== 'undefined') {
    // Validate configuration
    if (!window.linkedinConfig.LINKEDIN_CLIENT_ID || window.linkedinConfig.LINKEDIN_CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
        console.error('❌ LinkedIn Client ID not configured! Please update linkedin-config.js with your actual credentials.');
        return;
    }
    
    if (!window.linkedinConfig.LINKEDIN_CLIENT_SECRET || window.linkedinConfig.LINKEDIN_CLIENT_SECRET === 'YOUR_CLIENT_SECRET_HERE') {
        console.error('❌ LinkedIn Client Secret not configured! Please update linkedin-config.js with your actual credentials.');
        return;
    }
    
    // Set configuration in localStorage
    localStorage.setItem('LINKEDIN_CLIENT_ID', window.linkedinConfig.LINKEDIN_CLIENT_ID);
    localStorage.setItem('LINKEDIN_CLIENT_SECRET', window.linkedinConfig.LINKEDIN_CLIENT_SECRET);
    
    // CRITICAL: Clear old tokens to force re-authentication with new scopes
    const existingToken = localStorage.getItem('linkedin_access_token');
    const tokenExpires = localStorage.getItem('linkedin_token_expires');
    
    if (existingToken) {
        // Check if this token was created with old scopes (pre-Community Management API)
        const shouldClearToken = !localStorage.getItem('linkedin_community_api_enabled');
        
        if (shouldClearToken) {
            console.log('🔄 Clearing old token - need Community Management API access');
            localStorage.removeItem('linkedin_access_token');
            localStorage.removeItem('linkedin_token_expires');
            localStorage.removeItem('linkedin_oauth_state');
        } else {
            console.log('✅ Existing token is compatible with Community Management API');
        }
    }
    
    // Set access token if provided (for testing purposes)
    if (window.linkedinConfig.ACCESS_TOKEN && !localStorage.getItem('linkedin_access_token')) {
        localStorage.setItem('linkedin_access_token', window.linkedinConfig.ACCESS_TOKEN);
        // Set expiration to 60 days from now (LinkedIn standard token expiry)
        localStorage.setItem('linkedin_token_expires', Date.now() + (60 * 24 * 60 * 60 * 1000));
        // Mark as Community Management API compatible
        localStorage.setItem('linkedin_community_api_enabled', 'true');
        console.log('✅ LinkedIn access token configured with 60-day expiry and Community Management API');
    }
    
    console.log('✅ LinkedIn API configuration loaded successfully');
}