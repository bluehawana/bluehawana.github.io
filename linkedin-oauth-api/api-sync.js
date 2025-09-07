/**
 * LinkedIn API Sync Service
 * Automatically syncs LinkedIn posts using OAuth API access
 */

const { LinkedInOAuth } = require('./oauth-setup');
const { updateGitHubRepo } = require('./github-updater');

class LinkedInAPISync {
    constructor() {
        this.oauth = new LinkedInOAuth();
        this.lastSyncTime = null;
        this.syncResults = [];
    }

    /**
     * Initialize the sync service
     */
    async initialize() {
        console.log('🚀 Initializing LinkedIn API Sync...');
        
        // Try to load existing tokens
        if (!this.oauth.loadTokens()) {
            throw new Error('No valid LinkedIn tokens found. Please run OAuth setup first.');
        }
        
        // Test API access
        try {
            await this.oauth.testToken();
            console.log('✅ LinkedIn API access verified');
            return true;
        } catch (error) {
            console.error('❌ LinkedIn API access failed:', error.message);
            throw new Error('LinkedIn API authentication failed. Please re-run OAuth setup.');
        }
    }

    /**
     * Sync LinkedIn posts to GitHub
     */
    async syncPosts() {
        const startTime = new Date();
        console.log(`🔄 Starting LinkedIn API sync at ${startTime.toISOString()}`);
        
        try {
            // Step 1: Get posts from LinkedIn API
            console.log('📝 Fetching posts from LinkedIn API...');
            const posts = await this.oauth.getUserPosts();
            
            if (!posts || posts.length === 0) {
                console.log('⚠️ No posts found from LinkedIn API');
                return {
                    success: false,
                    message: 'No posts found',
                    timestamp: startTime.toISOString()
                };
            }
            
            console.log(`✅ Retrieved ${posts.length} posts from LinkedIn API`);
            
            // Step 2: Update GitHub repository
            console.log('📤 Updating GitHub repository...');
            const updateResult = await updateGitHubRepo(posts);
            
            // Step 3: Record sync results
            const syncResult = {
                success: true,
                timestamp: startTime.toISOString(),
                postsFound: posts.length,
                githubUpdated: updateResult.updated,
                newPosts: updateResult.newPosts || 0,
                totalPosts: updateResult.totalPosts || posts.length,
                duration: Date.now() - startTime.getTime(),
                posts: posts.map(post => ({
                    content: post.content.substring(0, 100) + '...',
                    date: post.date,
                    activityId: post.activityId,
                    hasActivityId: !!post.activityId
                }))
            };
            
            this.lastSyncTime = startTime.toISOString();
            this.syncResults.push(syncResult);
            
            // Keep only last 50 sync results
            if (this.syncResults.length > 50) {
                this.syncResults = this.syncResults.slice(-50);
            }
            
            console.log(`✅ Sync completed successfully in ${syncResult.duration}ms`);
            console.log(`📊 Posts with Activity IDs: ${posts.filter(p => p.activityId).length}/${posts.length}`);
            
            return syncResult;
            
        } catch (error) {
            console.error('❌ Sync failed:', error);
            
            const errorResult = {
                success: false,
                timestamp: startTime.toISOString(),
                error: error.message,
                duration: Date.now() - startTime.getTime()
            };
            
            this.syncResults.push(errorResult);
            throw error;
        }
    }

    /**
     * Get sync status and statistics
     */
    getStatus() {
        const latestSync = this.syncResults[this.syncResults.length - 1];
        
        return {
            initialized: !!this.oauth.accessToken,
            lastSync: this.lastSyncTime,
            latestResult: latestSync,
            totalSyncs: this.syncResults.length,
            successfulSyncs: this.syncResults.filter(r => r.success).length,
            failedSyncs: this.syncResults.filter(r => !r.success).length,
            tokenExpiry: this.oauth.tokenExpiry ? new Date(this.oauth.tokenExpiry).toISOString() : null,
            tokenValid: this.oauth.tokenExpiry > Date.now()
        };
    }

    /**
     * Get recent sync history
     */
    getSyncHistory(limit = 10) {
        return this.syncResults.slice(-limit).reverse();
    }

    /**
     * Manual sync trigger with detailed logging
     */
    async manualSync() {
        console.log('🔧 Manual sync triggered');
        
        try {
            const result = await this.syncPosts();
            
            console.log('\n📊 Sync Summary:');
            console.log(`✅ Success: ${result.success}`);
            console.log(`📝 Posts found: ${result.postsFound}`);
            console.log(`📤 GitHub updated: ${result.githubUpdated}`);
            console.log(`🆕 New posts: ${result.newPosts}`);
            console.log(`⏱️ Duration: ${result.duration}ms`);
            
            if (result.posts && result.posts.length > 0) {
                console.log('\n📋 Posts retrieved:');
                result.posts.forEach((post, index) => {
                    console.log(`${index + 1}. ${post.content}`);
                    console.log(`   Date: ${post.date} | Activity ID: ${post.activityId || 'None'}`);
                });
            }
            
            return result;
            
        } catch (error) {
            console.error('\n❌ Manual sync failed:', error.message);
            throw error;
        }
    }
}

/**
 * Command line usage
 */
async function runSync() {
    const sync = new LinkedInAPISync();
    
    try {
        await sync.initialize();
        const result = await sync.manualSync();
        
        console.log('\n🎉 LinkedIn API sync completed successfully!');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ LinkedIn API sync failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    runSync();
}

module.exports = { LinkedInAPISync };