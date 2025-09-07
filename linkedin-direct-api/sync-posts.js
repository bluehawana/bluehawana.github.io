/**
 * LinkedIn Direct API Sync
 * Syncs LinkedIn posts using direct access token
 */

const { LinkedInDirectClient } = require('./linkedin-client');
const fs = require('fs').promises;
const path = require('path');

class LinkedInDirectSync {
    constructor(accessToken) {
        this.client = new LinkedInDirectClient(accessToken);
        this.outputFile = '../data/linkedin-posts.json';
    }

    /**
     * Sync LinkedIn posts and save to file
     */
    async syncPosts() {
        try {
            console.log('🚀 Starting LinkedIn Direct API sync...');
            
            // Test connection first
            const connectionTest = await this.client.testConnection();
            if (!connectionTest.success) {
                throw new Error(`LinkedIn API connection failed: ${connectionTest.error}`);
            }
            
            console.log('✅ LinkedIn API connection verified');
            
            // Get posts
            console.log('📝 Fetching LinkedIn posts...');
            const posts = await this.client.getAllUserContent(10);
            
            if (posts.length === 0) {
                console.log('⚠️ No posts retrieved from LinkedIn API');
                return {
                    success: false,
                    message: 'No posts found',
                    postsCount: 0
                };
            }
            
            console.log(`✅ Retrieved ${posts.length} posts from LinkedIn`);
            
            // Show posts summary
            console.log('\n📋 Posts retrieved:');
            posts.forEach((post, index) => {
                console.log(`${index + 1}. ${post.content.substring(0, 80)}...`);
                console.log(`   Date: ${post.date} | Activity ID: ${post.activityId || 'None'} | Source: ${post.source}`);
            });
            
            // Save to file
            await this.savePosts(posts);
            
            console.log(`\n✅ Sync completed successfully!`);
            console.log(`📊 Total posts: ${posts.length}`);
            console.log(`📊 Posts with Activity IDs: ${posts.filter(p => p.activityId).length}`);
            
            return {
                success: true,
                message: 'Sync completed successfully',
                postsCount: posts.length,
                postsWithActivityIds: posts.filter(p => p.activityId).length,
                posts: posts
            };
            
        } catch (error) {
            console.error('❌ Sync failed:', error.message);
            throw error;
        }
    }

    /**
     * Save posts to JSON file
     */
    async savePosts(posts) {
        try {
            const outputPath = path.resolve(__dirname, this.outputFile);
            const jsonContent = JSON.stringify(posts, null, 2);
            
            await fs.writeFile(outputPath, jsonContent, 'utf8');
            console.log(`💾 Posts saved to: ${outputPath}`);
            
        } catch (error) {
            console.error('❌ Failed to save posts:', error.message);
            throw error;
        }
    }

    /**
     * Load existing posts for comparison
     */
    async loadExistingPosts() {
        try {
            const outputPath = path.resolve(__dirname, this.outputFile);
            const content = await fs.readFile(outputPath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            console.log('📄 No existing posts file found, will create new one');
            return [];
        }
    }

    /**
     * Merge new posts with existing ones
     */
    async mergeAndSavePosts(newPosts) {
        try {
            const existingPosts = await this.loadExistingPosts();
            
            // Create a map for deduplication
            const postsMap = new Map();
            
            // Add existing posts
            existingPosts.forEach(post => {
                const hash = this.generatePostHash(post);
                postsMap.set(hash, post);
            });
            
            // Add new posts (will overwrite if duplicate)
            newPosts.forEach(post => {
                const hash = this.generatePostHash(post);
                postsMap.set(hash, post);
            });
            
            // Convert back to array and sort by date
            const mergedPosts = Array.from(postsMap.values())
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 10); // Keep only 10 most recent
            
            await this.savePosts(mergedPosts);
            
            console.log(`📊 Merged posts: ${existingPosts.length} existing + ${newPosts.length} new = ${mergedPosts.length} total`);
            
            return mergedPosts;
            
        } catch (error) {
            console.error('❌ Failed to merge posts:', error.message);
            throw error;
        }
    }

    /**
     * Generate hash for post deduplication
     */
    generatePostHash(post) {
        const content = (post.content || '').substring(0, 100).toLowerCase().trim();
        const date = post.date || '';
        return `${content}-${date}`.replace(/[^a-z0-9-]/g, '');
    }
}

/**
 * Command line usage
 */
async function runSync() {
    const token = process.argv[2] || process.env.LINKEDIN_ACCESS_TOKEN;
    
    if (!token) {
        console.error('❌ No LinkedIn access token provided!');
        console.log('\nUsage:');
        console.log('  node sync-posts.js YOUR_ACCESS_TOKEN');
        console.log('  or set LINKEDIN_ACCESS_TOKEN environment variable');
        process.exit(1);
    }
    
    try {
        const sync = new LinkedInDirectSync(token);
        const result = await sync.syncPosts();
        
        console.log('\n🎉 LinkedIn sync completed successfully!');
        console.log('📁 Check ../data/linkedin-posts.json for the results');
        
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ LinkedIn sync failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    runSync();
}

module.exports = { LinkedInDirectSync };