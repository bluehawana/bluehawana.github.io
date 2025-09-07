/**
 * Test script for LinkedIn scraper
 * Run this to test the scraping functionality locally
 */

const { scrapeLinkedInPosts } = require('./scraper');
const { updateGitHubRepo } = require('./github-updater');

async function testScraper() {
    console.log('🧪 Testing LinkedIn scraper...');
    console.log('=' * 50);
    
    try {
        // Test scraping
        console.log('1️⃣ Testing LinkedIn post scraping...');
        const posts = await scrapeLinkedInPosts();
        
        if (posts && posts.length > 0) {
            console.log(`✅ Scraping successful! Found ${posts.length} posts:`);
            posts.forEach((post, index) => {
                console.log(`\n📝 Post ${index + 1}:`);
                console.log(`Content: ${post.content.substring(0, 100)}...`);
                console.log(`Date: ${post.date}`);
                console.log(`URL: ${post.url}`);
                console.log(`Tags: ${post.tags?.join(', ') || 'None'}`);
                console.log(`Source: ${post.source}`);
            });
        } else {
            console.log('❌ No posts found during scraping');
            return;
        }
        
        // Test GitHub update (only if GITHUB_TOKEN is set)
        if (process.env.GITHUB_TOKEN) {
            console.log('\n2️⃣ Testing GitHub repository update...');
            const updateResult = await updateGitHubRepo(posts);
            
            if (updateResult.updated) {
                console.log('✅ GitHub update successful!');
                console.log(`New posts: ${updateResult.newPosts}`);
                console.log(`Total posts: ${updateResult.totalPosts}`);
                console.log(`Commit SHA: ${updateResult.commitSha}`);
            } else {
                console.log('ℹ️ No GitHub update needed (no changes)');
            }
        } else {
            console.log('\n2️⃣ Skipping GitHub test (no GITHUB_TOKEN set)');
        }
        
        console.log('\n🎉 All tests completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}

// Run tests
if (require.main === module) {
    testScraper();
}

module.exports = { testScraper };