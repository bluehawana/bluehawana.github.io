/**
 * LinkedIn API Configuration Template
 *
 * Copy this file to linkedin_config.js and fill in your actual credentials
 * NEVER commit linkedin_config.js to the repository!
 */

// Configuration object for LinkedIn API
window.linkedinConfig = {
    LINKEDIN_CLIENT_ID: 'YOUR_CLIENT_ID_HERE',
    LINKEDIN_CLIENT_SECRET: 'YOUR_CLIENT_SECRET_HERE',

    // API Configuration
    API_VERSION: '202505',  // Latest version as per LinkedIn API docs
    BASE_URL: 'https://api.linkedin.com/rest',  // Community Management API

    // OAuth Configuration - Your actual scopes
    SCOPES: [
        'openid',               // Use your name and photo
        'profile',              // Use your name and photo
        'r_events',             // Retrieve your organization's events
        'w_member_social',      // Create, modify, and delete posts, comments, and reactions
        'email',                // Use the primary email address
        'rw_events'             // Manage your organization's events
    ],

    // Your access token (get this through OAuth flow)
    ACCESS_TOKEN: 'YOUR_ACCESS_TOKEN_HERE'
};

// Auto-configure localStorage with credentials when this script loads
if (typeof window !== 'undefined') {
    // Set configuration in localStorage
    localStorage.setItem('LINKEDIN_CLIENT_ID', window.linkedinConfig.LINKEDIN_CLIENT_ID);

    // Set access token immediately
    localStorage.setItem('linkedin_access_token', window.linkedinConfig.ACCESS_TOKEN);

    // Set expiration to 60 days from now (LinkedIn standard token expiry)
    const expiryDate = Date.now() + (60 * 24 * 60 * 60 * 1000);
    localStorage.setItem('linkedin_token_expires', expiryDate);

    // Mark as Community Management API compatible
    localStorage.setItem('linkedin_community_api_enabled', 'true');

    console.log('✅ LinkedIn OAuth 2.0 access token configured successfully');
    console.log('📅 Token expires:', new Date(expiryDate).toLocaleDateString());
    console.log('🔑 Scopes enabled:', window.linkedinConfig.SCOPES.join(', '));
}