/**
 * Quick test script to validate LinkedIn API sync functionality
 * Run this from browser console or via Node.js
 */

// Load the configuration
const ACCESS_TOKEN = 'AQXPq0nVBlhAfLxvHL1t0yKGqbpF767sq28qpTPUp6pgiHS92wzbEybkimwgMVt1vZ9Hv7rBShwkkogH5M_gV8cb_oMX5wBfarfBCyWz11SZx0rFYQJzgI7H34O2Z4HD4kx_pjBd0QmmMhSgdC1JBdyl3fW7H2bK_5hlKsspEXpmcTU4B5oimLpCJLGAUYLczOsLdnPL1IUkD2gDxWKmKZlXns7dAzhMqvLfS2sAX-xWbLG0Zq6rtpKVy1LVKBDxkDHkqmnJ8YCq5VtYgk49xZsApUKSAhOZ9t9EKqDOfZRSgWSdtVMUEc0oA0ynoGHLteaK4Hg9iJq6odq1z1YT1Vs0vw5FFA';

// Test functions
async function testProfileAPI() {
    console.log('🔍 Testing LinkedIn Profile API...');
    
    try {
        const response = await fetch('https://api.linkedin.com/rest/people/~?projection=(id,firstName,lastName)', {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'LinkedIn-Version': '202505',
                'X-Restli-Protocol-Version': '2.0.0'
            }
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const error = await response.text();
            console.error('❌ API Error:', error);
            return false;
        }
        
        const profile = await response.json();
        console.log('✅ Profile API Success:', profile);
        return profile;
        
    } catch (error) {
        console.error('❌ Profile API Failed:', error);
        return false;
    }
}

async function testSharesAPI() {
    console.log('📝 Testing LinkedIn Shares API...');
    
    try {
        // First get profile to get user ID
        const profile = await testProfileAPI();
        if (!profile) return false;
        
        const userId = profile.id;
        console.log('User ID:', userId);
        
        const response = await fetch(`https://api.linkedin.com/rest/shares?q=owners&owners=urn:li:person:${userId}&count=10`, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'LinkedIn-Version': '202505',
                'X-Restli-Protocol-Version': '2.0.0'
            }
        });
        
        console.log('Shares Response status:', response.status);
        
        if (!response.ok) {
            const error = await response.text();
            console.error('❌ Shares API Error:', error);
            return false;
        }
        
        const shares = await response.json();
        console.log('✅ Shares API Success:', shares);
        console.log(`Found ${shares.elements?.length || 0} shares`);
        
        return shares;
        
    } catch (error) {
        console.error('❌ Shares API Failed:', error);
        return false;
    }
}

async function testPostsAPI() {
    console.log('📋 Testing LinkedIn Posts API...');
    
    try {
        // First get profile to get user ID
        const profile = await testProfileAPI();
        if (!profile) return false;
        
        const userId = profile.id;
        
        const response = await fetch(`https://api.linkedin.com/rest/posts?q=author&author=urn:li:person:${userId}&count=10`, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'LinkedIn-Version': '202505',
                'X-Restli-Protocol-Version': '2.0.0'
            }
        });
        
        console.log('Posts Response status:', response.status);
        
        if (!response.ok) {
            const error = await response.text();
            console.error('❌ Posts API Error:', error);
            return false;
        }
        
        const posts = await response.json();
        console.log('✅ Posts API Success:', posts);
        console.log(`Found ${posts.elements?.length || 0} posts`);
        
        return posts;
        
    } catch (error) {
        console.error('❌ Posts API Failed:', error);
        return false;
    }
}

async function runAllTests() {
    console.log('🚀 Starting LinkedIn API Tests...');
    console.log('=' * 50);
    
    const results = {
        profile: await testProfileAPI(),
        shares: await testSharesAPI(),
        posts: await testPostsAPI()
    };
    
    console.log('=' * 50);
    console.log('📊 Test Results Summary:');
    console.log('Profile API:', results.profile ? '✅ Success' : '❌ Failed');
    console.log('Shares API:', results.shares ? '✅ Success' : '❌ Failed');
    console.log('Posts API:', results.posts ? '✅ Success' : '❌ Failed');
    
    // Count total posts found
    let totalPosts = 0;
    if (results.shares?.elements) totalPosts += results.shares.elements.length;
    if (results.posts?.elements) totalPosts += results.posts.elements.length;
    
    console.log(`📈 Total posts found: ${totalPosts}`);
    
    if (totalPosts === 0) {
        console.log('⚠️ No posts found. This could mean:');
        console.log('   - LinkedIn API restrictions for personal posts');
        console.log('   - Insufficient permissions on the app');
        console.log('   - Posts are not accessible via API');
        console.log('   - Account has no recent posts');
    }
    
    return results;
}

// Export for use in browser
if (typeof window !== 'undefined') {
    window.testLinkedInAPI = {
        testProfileAPI,
        testSharesAPI,
        testPostsAPI,
        runAllTests
    };
    
    // Auto-run tests when script loads
    console.log('🔧 LinkedIn API Test Suite Loaded');
    console.log('Run window.testLinkedInAPI.runAllTests() to start testing');
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testProfileAPI,
        testSharesAPI,
        testPostsAPI,
        runAllTests
    };
}