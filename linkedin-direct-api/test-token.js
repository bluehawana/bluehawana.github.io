/**
 * Test LinkedIn Access Token
 * Quick test to verify your LinkedIn access token works
 */

const { LinkedInDirectClient } = require('./linkedin-client');

async function testLinkedInToken() {
    console.log('🧪 Testing LinkedIn Access Token');
    console.log('=' * 50);
    
    // Get token from environment or command line
    const token = process.argv[2] || process.env.LINKEDIN_ACCESS_TOKEN;
    
    if (!token) {
        console.error('❌ No access token provided!');
        console.log('\nUsage:');
        console.log('  node test-token.js YOUR_ACCESS_TOKEN');
        console.log('  or set LINKEDIN_ACCESS_TOKEN environment variable');
        process.exit(1);
    }
    
    console.log(`🔑 Using token: ${token.substring(0, 20)}...`);
    
    try {
        // Initialize client
        const client = new LinkedInDirectClient(token);
        
        // Test 1: Basic connection
        console.log('\n1️⃣ Testing basic API connection...');
        const connectionTest = await client.testConnection();
        
        if (!connectionTest.success) {
            console.error('❌ Connection test failed:', connectionTest.error);
            return;
        }
        
        // Test 2: Get API info
        console.log('\n2️⃣ Testing API endpoints...');
        const apiInfo = await client.getAPIInfo();
        
        console.log('📊 API Endpoint Results:');
        Object.entries(apiInfo.endpointTests).forEach(([name, result]) => {
            const status = result.success ? '✅' : '❌';
            console.log(`  ${status} ${name}: ${result.success ? `${result.status} (${result.elementCount} items)` : result.error}`);
        });
        
        // Test 3: Get actual posts
        console.log('\n3️⃣ Fetching your LinkedIn posts...');
        const posts = await client.getAllUserContent(5);
        
        if (posts.length > 0) {
            console.log(`✅ Successfully retrieved ${posts.length} posts:`);
            
            posts.forEach((post, index) => {
                console.log(`\n📝 Post ${index + 1}:`);
                console.log(`Content: ${post.content.substring(0, 100)}...`);
                console.log(`Date: ${post.date}`);
                console.log(`Activity ID: ${post.activityId || 'None'}`);
                console.log(`URL: ${post.url}`);
                console.log(`Tags: ${post.tags.join(', ')}`);
                console.log(`Source: ${post.source}`);
            });
            
            // Check for your AOSP15 post
            const aospPost = posts.find(post => 
                post.content.toLowerCase().includes('aosp') || 
                post.content.toLowerCase().includes('mission completed')
            );
            
            if (aospPost) {
                console.log('\n🎯 Found your AOSP15 post!');
                console.log(`Content: ${aospPost.content}`);
                console.log(`Activity ID: ${aospPost.activityId}`);
            } else {
                console.log('\n⚠️ AOSP15 post not found in recent posts');
                console.log('This might mean:');
                console.log('- The post is older than the recent 5 posts');
                console.log('- LinkedIn API has restrictions on post visibility');
                console.log('- The post content doesn\'t match our search terms');
            }
            
        } else {
            console.log('⚠️ No posts retrieved. This could mean:');
            console.log('- LinkedIn API restrictions on personal posts');
            console.log('- Token doesn\'t have sufficient permissions');
            console.log('- Posts are not accessible via this API endpoint');
        }
        
        console.log('\n🎉 Token test completed!');
        
        // Summary
        console.log('\n📋 Summary:');
        console.log(`✅ Token valid: ${connectionTest.success}`);
        console.log(`✅ API accessible: ${apiInfo.success}`);
        console.log(`✅ Posts retrieved: ${posts.length}`);
        console.log(`✅ Posts with Activity IDs: ${posts.filter(p => p.activityId).length}`);
        
        if (posts.length > 0) {
            console.log('\n🚀 Ready for automation! Your token can access LinkedIn posts.');
        } else {
            console.log('\n⚠️ Token works but no posts accessible. May need different API approach.');
        }
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        
        if (error.response?.status === 401) {
            console.log('\n🔧 Token appears to be invalid or expired.');
            console.log('Try:');
            console.log('1. Generate a new access token');
            console.log('2. Check token permissions/scopes');
            console.log('3. Verify token hasn\'t expired');
        } else if (error.response?.status === 403) {
            console.log('\n🔧 Token valid but insufficient permissions.');
            console.log('Try:');
            console.log('1. Request additional scopes (w_member_social, r_member_social)');
            console.log('2. Check LinkedIn app permissions');
        }
        
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testLinkedInToken();
}

module.exports = { testLinkedInToken };