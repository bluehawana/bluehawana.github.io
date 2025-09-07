#!/usr/bin/env node

/**
 * Test OAuth Integration
 * This script tests the LinkedIn OAuth automation to ensure it works correctly
 */

const LinkedInOAuthAutomation = require('./linkedin-oauth-automation.js');
const fs = require('fs').promises;
const path = require('path');

async function testOAuthIntegration() {
    console.log('🧪 Testing LinkedIn OAuth Integration...\n');
    
    const automation = new LinkedInOAuthAutomation();
    
    try {
        // Test 1: Check if access token is configured
        console.log('📋 Test 1: Access Token Configuration');
        if (automation.accessToken && automation.accessToken.length > 50) {
            console.log('✅ Access token is configured');
        } else {
            console.log('❌ Access token is missing or invalid');
            return false;
        }
        
        // Test 2: Get member ID
        console.log('\n📋 Test 2: Member ID Retrieval');
        try {
            const memberId = await automation.getMemberId();
            console.log(`✅ Member ID retrieved: ${memberId}`);
        } catch (error) {
            console.log(`❌ Failed to get member ID: ${error.message}`);
            return false;
        }
        
        // Test 3: Fetch recent posts
        console.log('\n📋 Test 3: Fetch Recent Posts');
        try {
            const posts = await automation.fetchRecentPosts();
            console.log(`✅ Fetched ${posts.length} posts from LinkedIn API`);
            
            if (posts.length > 0) {
                console.log('\n📄 Sample post:');
                const samplePost = posts[0];
                console.log(`   ID: ${samplePost.id}`);
                console.log(`   Date: ${samplePost.date}`);
                console.log(`   Content: ${samplePost.content.substring(0, 100)}...`);
                console.log(`   Tags: ${samplePost.tags.join(', ')}`);
                console.log(`   Engagement: ${samplePost.engagement.likes} likes, ${samplePost.engagement.comments} comments`);
            }
        } catch (error) {
            console.log(`❌ Failed to fetch posts: ${error.message}`);
            return false;
        }
        
        // Test 4: Load existing data
        console.log('\n📋 Test 4: Data Management');
        try {
            const { existingPosts, syncLog } = await automation.loadExistingData();
            console.log(`✅ Loaded ${existingPosts.length} existing posts`);
            console.log(`✅ Sync log: ${syncLog.totalSyncs || 0} previous syncs`);
        } catch (error) {
            console.log(`❌ Failed to load data: ${error.message}`);
            return false;
        }
        
        // Test 5: Run full automation (dry run)
        console.log('\n📋 Test 5: Full Automation Test');
        try {
            console.log('🚀 Running full automation...');
            await automation.run();
            console.log('✅ Full automation completed successfully');
        } catch (error) {
            console.log(`❌ Full automation failed: ${error.message}`);
            return false;
        }
        
        // Test 6: Verify output files
        console.log('\n📋 Test 6: Output Verification');
        try {
            const dataDir = path.join(__dirname, 'data');
            const postsFile = path.join(dataDir, 'linkedin-posts.json');
            const logFile = path.join(dataDir, 'linkedin-sync-log.json');
            
            // Check if files exist
            await fs.access(postsFile);
            await fs.access(logFile);
            
            // Check file contents
            const postsData = JSON.parse(await fs.readFile(postsFile, 'utf8'));
            const logData = JSON.parse(await fs.readFile(logFile, 'utf8'));
            
            console.log(`✅ Posts file created with ${postsData.length} posts`);
            console.log(`✅ Sync log updated: ${logData.totalSyncs} total syncs`);
            console.log(`✅ Last sync: ${logData.lastSync}`);
            
        } catch (error) {
            console.log(`❌ Output verification failed: ${error.message}`);
            return false;
        }
        
        console.log('\n🎉 All tests passed! OAuth integration is working correctly.');
        console.log('\n📊 Integration Summary:');
        console.log(`   - OAuth token: ✅ Valid`);
        console.log(`   - API access: ✅ Working`);
        console.log(`   - Data sync: ✅ Functional`);
        console.log(`   - File output: ✅ Created`);
        console.log(`   - New posts found: ${automation.newPostsFound}`);
        
        return true;
        
    } catch (error) {
        console.error('\n❌ Integration test failed:', error.message);
        return false;
    }
}

// Instructions for testing with a new post
function printTestInstructions() {
    console.log('\n📝 How to test with a new LinkedIn post:');
    console.log('1. Post something new on LinkedIn');
    console.log('2. Wait 1-2 minutes for LinkedIn to process it');
    console.log('3. Run this test script: node test-oauth-integration.js');
    console.log('4. Check if the new post appears in data/linkedin-posts.json');
    console.log('5. Check if a blog post was created in _posts/ directory');
    console.log('\n🔄 To test automation:');
    console.log('1. Run: node linkedin-oauth-automation.js');
    console.log('2. Check the output for new posts detected');
    console.log('3. Verify blog posts are created automatically');
}

// Run the test
if (require.main === module) {
    testOAuthIntegration().then(success => {
        if (success) {
            printTestInstructions();
            process.exit(0);
        } else {
            console.log('\n❌ Integration test failed. Please check your OAuth configuration.');
            process.exit(1);
        }
    }).catch(error => {
        console.error('❌ Test error:', error);
        process.exit(1);
    });
}

module.exports = testOAuthIntegration;