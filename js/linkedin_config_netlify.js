/**
 * LinkedIn Configuration via Netlify Functions
 * This fetches LinkedIn configuration from Netlify environment variables
 * instead of requiring a local config file.
 */

class LinkedInConfigNetlify {
    constructor() {
        this.config = null;
        this.isLoaded = false;
        this.baseURL = this.getBaseURL();
    }

    /**
     * Get base URL for API calls
     */
    getBaseURL() {
        // If we're running locally, use the Netlify dev URL or production URL
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isLocal) {
            // For local development, you can use the production URL
            return 'https://bluehawana.netlify.app/.netlify/functions';
        }
        
        // For production, use relative path
        return '/.netlify/functions';
    }

    /**
     * Load LinkedIn configuration from Netlify Function
     */
    async loadConfig() {
        if (this.isLoaded && this.config) {
            return this.config;
        }

        try {
            console.log('🔄 Loading LinkedIn configuration from Netlify...');
            
            const response = await fetch(`${this.baseURL}/linkedin-env`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load configuration');
            }

            this.config = data.config;
            this.isLoaded = true;
            
            console.log('✅ LinkedIn configuration loaded successfully');
            console.log('📊 Available scopes:', this.config.SCOPES);
            
            return this.config;

        } catch (error) {
            console.error('❌ Failed to load LinkedIn configuration:', error);
            
            // Show user-friendly error message
            this.showConfigError(error.message);
            
            throw error;
        }
    }

    /**
     * Get specific configuration value
     */
    async getConfig(key) {
        const config = await this.loadConfig();
        return config[key];
    }

    /**
     * Check if LinkedIn is properly configured
     */
    async isConfigured() {
        try {
            const config = await this.loadConfig();
            return !!(config && config.LINKEDIN_CLIENT_ID && config.LINKEDIN_CLIENT_ID !== 'YOUR_CLIENT_ID_HERE');
        } catch (error) {
            return false;
        }
    }

    /**
     * Get OAuth authorization URL
     */
    async getAuthURL() {
        const config = await this.loadConfig();
        
        if (!config.LINKEDIN_CLIENT_ID) {
            throw new Error('LinkedIn Client ID not configured in Netlify environment variables');
        }

        const state = this.generateState();
        const scopes = config.SCOPES.join(' ');
        
        const authURL = `https://www.linkedin.com/oauth/v2/authorization?` +
            `response_type=code&` +
            `client_id=${config.LINKEDIN_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(config.REDIRECT_URI)}&` +
            `scope=${encodeURIComponent(scopes)}&` +
            `state=${state}`;

        return authURL;
    }

    /**
     * Generate OAuth state parameter
     */
    generateState() {
        const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('linkedin_oauth_state', state);
        return state;
    }

    /**
     * Trigger LinkedIn sync via Netlify Function
     */
    async syncLinkedInPosts() {
        try {
            console.log('🔄 Starting LinkedIn sync via Netlify Function...');
            
            const response = await fetch(`${this.baseURL}/linkedin-sync`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Sync failed');
            }

            console.log(`✅ LinkedIn sync completed: ${result.postsCount} posts processed`);
            
            return result;

        } catch (error) {
            console.error('❌ LinkedIn sync failed:', error);
            throw error;
        }
    }

    /**
     * Get automation status from Netlify Function
     */
    async getAutomationStatus() {
        try {
            const response = await fetch(`${this.baseURL}/automation-status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();

        } catch (error) {
            console.error('❌ Failed to get automation status:', error);
            return {
                error: error.message,
                linkedIn: { status: 'error' },
                gitHub: { status: 'error' },
                overall: 'error'
            };
        }
    }

    /**
     * Show configuration error to user
     */
    showConfigError(errorMessage) {
        // Create or update error display
        let errorDiv = document.getElementById('linkedin-config-error');
        
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'linkedin-config-error';
            errorDiv.style.cssText = `
                background: #fee;
                border: 1px solid #fcc;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                color: #c00;
                font-family: monospace;
                font-size: 14px;
            `;
            
            // Insert at the top of the content
            const content = document.querySelector('.content') || document.body;
            content.insertBefore(errorDiv, content.firstChild);
        }

        errorDiv.innerHTML = `
            <h3>⚠️ LinkedIn Configuration Error</h3>
            <p><strong>Error:</strong> ${errorMessage}</p>
            <hr style="margin: 15px 0; border: none; border-top: 1px solid #fcc;">
            <h4>To Fix This Issue:</h4>
            <ol>
                <li>Log in to your <a href="https://app.netlify.com" target="_blank">Netlify Dashboard</a></li>
                <li>Go to your site settings → Environment Variables</li>
                <li>Add the following environment variables:
                    <ul>
                        <li><code>LINKEDIN_CLIENT_ID</code> - Your LinkedIn app client ID</li>
                        <li><code>LINKEDIN_CLIENT_SECRET</code> - Your LinkedIn app client secret</li>
                        <li><code>LINKEDIN_ACCESS_TOKEN</code> - Your LinkedIn access token (if you have one)</li>
                    </ul>
                </li>
                <li>Redeploy your site</li>
            </ol>
            <p><strong>Note:</strong> This method is more secure than local config files and works in production.</p>
        `;
    }

    /**
     * Hide configuration error
     */
    hideConfigError() {
        const errorDiv = document.getElementById('linkedin-config-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }
}

// Create global instance
window.linkedInConfigNetlify = new LinkedInConfigNetlify();

// Backward compatibility - expose methods globally
window.getLinkedInConfig = async (key) => {
    return await window.linkedInConfigNetlify.getConfig(key);
};

window.isLinkedInConfigured = async () => {
    return await window.linkedInConfigNetlify.isConfigured();
};

window.syncLinkedInViaNetlify = async () => {
    return await window.linkedInConfigNetlify.syncLinkedInPosts();
};

window.getLinkedInAuthURL = async () => {
    return await window.linkedInConfigNetlify.getAuthURL();
};

window.getAutomationStatus = async () => {
    return await window.linkedInConfigNetlify.getAutomationStatus();
};

console.log('✅ LinkedIn Netlify configuration system loaded');