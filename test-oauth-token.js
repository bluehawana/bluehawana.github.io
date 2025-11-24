/**
 * OAuth 2.0 Access Token Test Script
 * Tests the LinkedIn API access token and available scopes
 */

const ACCESS_TOKEN = 'AQXAaMANteu-XQoVzKWDcARMLIkUOV6n92tstpvl9noU6niFW0PWud7eD6r5uUnGDHIIdiPMN4SNk3tVbmK-pQewkWkO5BZqd3KJUxVGMxav-qgivdROWMV-z_V97d1bgDI-PScFAsGk8Pun6XasiEhxARRhLbvuDvF92mea89aZgHrx-Vc-q8bOL-_8GgNbzkUeFX3sJQrmbKWbjhaZA2I0QYVeePmbIkJclfVD53GXIoTdkEbH19FSYu5Q2BM3AyIHhFLnpoIi_3xncAUDkFZtLwieDJ9cqaQJYVXD0b2Sk9Hm92aILKJDaS24yymZyvsnJfniVCAApYMk_Px8U96cYFEfmg';

async function testOAuthToken() {
    console.log('🔍 Testing OAuth 2.0 Access Token...');
    
    const headers = {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
    };

    // Test 1: Get user profile (openid + profile scopes)
    try {
        console.log('\n📋 Test 1: User Profile (openid + profile scopes)');
        const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers
        });
        
        if (profileResponse.ok) {
            const profile = await profileResponse.json();
            console.log('✅ Profile retrieved successfully');
            console.log('👤 Name:', profile.name);
            console.log('📧 Email:', profile.email);
            console.log('🖼️ Picture:', profile.picture ? 'Available' : 'Not available');
        } else {
            console.log('❌ Profile request failed:', profileResponse.status, profileResponse.statusText);
        }
    } catch (error) {
        console.log('❌ Profile request error:', error.message);
    }

    // Test 2: Get member social posts (w_member_social scope)
    try {
        console.log('\n📱 Test 2: Member Social Posts (w_member_social scope)');
        const postsResponse = await fetch('https://api.linkedin.com/v2/shares?q=owners&owners=urn:li:person:MEMBER_ID&count=5', {
            headers
        });
        
        if (postsResponse.ok) {
            const posts = await postsResponse.json();
            console.log('✅ Posts endpoint accessible');
            console.log('📊 Posts found:', posts.elements ? posts.elements.length : 0);
        } else {
            console.log('❌ Posts request failed:', postsResponse.status, postsResponse.statusText);
            if (postsResponse.status === 403) {
                console.log('ℹ️ This might be expected - need member ID for posts');
            }
        }
    } catch (error) {
        console.log('❌ Posts request error:', error.message);
    }

    // Test 3: Get current user's member ID
    try {
        console.log('\n🆔 Test 3: Get Member ID');
        const meResponse = await fetch('https://api.linkedin.com/v2/people/(id~)', {
            headers
        });
        
        if (meResponse.ok) {
            const me = await meResponse.json();
            console.log('✅ Member ID retrieved successfully');
            console.log('🆔 Member ID:', me.id);
            console.log('👤 First Name:', me.firstName?.localized?.en_US);
            console.log('👤 Last Name:', me.lastName?.localized?.en_US);
            
            // Store member ID for future use
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('linkedin_member_id', me.id);
                console.log('💾 Member ID saved to localStorage');
            }
        } else {
            console.log('❌ Member ID request failed:', postsResponse.status, postsResponse.statusText);
        }
    } catch (error) {
        console.log('❌ Member ID request error:', error.message);
    }

    // Test 4: Token introspection (check scopes)
    try {
        console.log('\n🔍 Test 4: Token Introspection');
        const introspectResponse = await fetch('https://api.linkedin.com/oauth/v2/introspectToken', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `token=${ACCESS_TOKEN}`
        });
        
        if (introspectResponse.ok) {
            const tokenInfo = await introspectResponse.json();
            console.log('✅ Token introspection successful');
            console.log('🔑 Active:', tokenInfo.active);
            console.log('📅 Expires at:', new Date(tokenInfo.exp * 1000).toLocaleString());
            console.log('🎯 Scopes:', tokenInfo.scope);
        } else {
            console.log('❌ Token introspection failed:', introspectResponse.status);
        }
    } catch (error) {
        console.log('❌ Token introspection error:', error.message);
    }

    console.log('\n🏁 OAuth token testing complete!');
}

// Run the test
if (typeof window !== 'undefined') {
    // Browser environment
    testOAuthToken();
} else {
    // Node.js environment
    const fetch = require('node-fetch');
    testOAuthToken();
}