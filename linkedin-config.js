/**
 * LinkedIn API Configuration
 * This file contains the LinkedIn API credentials for the application.
 * 
 * SECURITY NOTE: In production, these values should be set via environment variables
 * or a secure configuration management system, not hardcoded in files.
 */

// Configuration object for LinkedIn API
window.linkedinConfig = {
    LINKEDIN_CLIENT_ID: '77duha47hcbh8o',
    LINKEDIN_CLIENT_SECRET: 'WPL_AP1.KCsCGIG1HHXfY8LV.1OEJWQ==',
    
    // API Configuration
    API_VERSION: '202505',  // Latest version as per your endpoint list
    BASE_URL: 'https://api.linkedin.com/rest',  // Updated to REST API
    
    // OAuth Configuration
    SCOPES: [
        'r_member_social',      // Access to member's social activity
        'r_basicprofile',       // Basic profile information
        'r_1st_connections_size', // Connection count
        'r_organization_social', // Community Management API READ access (required for v202505)
        'w_organization_social'  // Community Management API WRITE access (required for v202505)
    ],
    
    // Pre-configured access token (if available)
    ACCESS_TOKEN: 'AQXPq0nVBlhAfLxvHL1t0yKGqbpF767sq28qpTPUp6pgiHS92wzbEybkimwgMVt1vZ9Hv7rBShwkkogH5M_gV8cb_oMX5wBfarfBCyWz11SZx0rFYQJzgI7H34O2Z4HD4kx_pjBd0QmmMhSgdC1JBdyl3fW7H2bK_5hlKsspEXpmcTU4B5oimLpCJLGAUYLczOsLdnPL1IUkD2gDxWKmKZlXns7dAzhMqvLfS2sAX-xWbLG0Zq6rtpKVy1LVKBDxkDHkqmnJ8YCq5VtYgk49xZsApUKSAhOZ9t9EKqDOfZRSgWSdtVMUEc0oA0ynoGHLteaK4Hg9iJq6odq1z1YT1Vs0vw5FFA'
};

// Auto-configure localStorage with credentials when this script loads
if (typeof window !== 'undefined') {
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