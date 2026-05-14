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
        // Try multiple possible Netlify function URLs
        const possibleURLs = [
            '/.netlify/functions',
            'https://bluehawana.netlify.app/.netlify/functions',
            'https://bluehawana.com/.netlify/functions'
        ];
        
        // For now, return the first one, but we'll test all in loadConfig
        return possibleURLs[0];
    }

    /**
     * Try multiple base URLs to find working functions
     */
    async findWorkingBaseURL() {
        const possibleURLs = [
            '/.netlify/functions',
            'https://bluehawana.netlify.app/.netlify/functions',
            'https://bluehawana.com/.netlify/functions'
        ];

        for (const baseURL of possibleURLs) {
            try {
                console.log(`🔍 Testing functions at: ${baseURL}`);
                const response = await fetch(`${baseURL}/test`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (response.ok) {
                    console.log(`✅ Found working functions at: ${baseURL}`);
                    return baseURL;
                }
            } catch (error) {
                console.log(`❌ ${baseURL} failed:`, error.message);
            }
        }
        
        throw new Error('No working Netlify functions endpoint found');
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
            
            // First try to find a working base URL
            let workingBaseURL;
            try {
                workingBaseURL = await this.findWorkingBaseURL();
                this.baseURL = workingBaseURL;
            } catch (error) {
                console.warn('⚠️ No working functions endpoint found, using default');
                workingBaseURL = this.baseURL;
            }

            const response = await fetch(`${workingBaseURL}/linkedin-env`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText} - Functions may not be deployed yet`);
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
            
            // Show user-friendly error message with more details
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

        const isNetlifyFunctionError = errorMessage.includes('404') || errorMessage.includes('Functions may not be deployed');
        
        errorDiv.innerHTML = `
            <h3>⚠️ LinkedIn Configuration Error</h3>
            <p><strong>Error:</strong> ${errorMessage}</p>
            <hr style="margin: 15px 0; border: none; border-top: 1px solid #fcc;">
            ${isNetlifyFunctionError ? `
                <h4>Functions Deployment Issue:</h4>
                <p>The Netlify Functions are not responding (404 error). This usually means:</p>
                <ul>
                    <li>Functions haven't been deployed yet (wait 2-3 minutes after pushing code)</li>
                    <li>Functions directory is not properly configured in netlify.toml</li>
                    <li>There's an error in the function code preventing deployment</li>
                </ul>
                <p><strong>Current Status:</strong> Checking multiple function endpoints...</p>
                <hr style="margin: 15px 0; border: none; border-top: 1px solid #fcc;">
            ` : ''}
            <h4>Environment Variables Setup:</h4>
            <ol>
                <li>Log in to your <a href="https://app.netlify.com" target="_blank">Netlify Dashboard</a></li>
                <li>Find your site: <strong>bluehawana.github.io</strong></li>
                <li>Go to: Site Settings → Environment Variables</li>
                <li>Add these variables:
                    <ul>
                        <li><code>LINKEDIN_CLIENT_ID</code> = <code>77duha47hcbh8o</code></li>
                        <li><code>LINKEDIN_CLIENT_SECRET</code> = [Your LinkedIn app secret]</li>
                        <li><code>LINKEDIN_ACCESS_TOKEN</code> = [Your access token]</li>
                    </ul>
                </li>
                <li>Save and wait for automatic redeploy (1-2 minutes)</li>
            </ol>
            <p><strong>Note:</strong> Functions must be working AND environment variables must be set.</p>
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