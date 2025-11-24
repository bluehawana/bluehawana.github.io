#!/usr/bin/env node

/**
 * LinkedIn Activity ID Post Fetcher
 * 
 * This script fetches specific LinkedIn posts using their activity IDs
 * Example activity ID: 7364309907770126337 (from activity:7364309907770126337)
 */

const fs = require('fs');

// Your LinkedIn credentials
const ACCESS_TOKEN = 'AQULGG2IEKG3GUy6Kc5ULityv2_RQ0CiSszYfMDasZS0b2hC_EkQrrhzn5Jhu3mowen3SC1dVxRWVeGzP_bqqkH9Kd0ph9X_VsfS79Xd8LG4L-gZjD75i82kNjyvbvk8OibJyjx1uxRl9Pz_QLpUbs0t-7Y6flWeL3ll4rq5QQrDX0Vv54M7iHFrZmo-UrxzYUWxVe52iEW-xaYfb-hh-ydNk1GsFbOtFmwI0inpOjC7jOqNMj-z2v8EpTTTEHno0B0s6wsIm0q9VARKpXIzx7ErI6G---wiiMfOTyh0je_C-q_Q6RFGbSzRZ8eRhl6BeBgaG0ckGsJJXiA4jRiWWgdmh0GT3A';

console.log('🔍 LinkedIn Activity ID Post Fetcher');
console.log('===================================\n');

// List of your recent LinkedIn activity IDs
// Add your actual activity IDs here
const activityIds = [
    '7364309907770126337', // Example ID you provided
    // Add more activity IDs from your recent LinkedIn posts
];

async function makeRequest(url, headers = {}) {
    const fetch = (await import('node-fetch')).default;
    
    console.log(`📡 Fetching: ${url}`);
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            ...headers
        }
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    
    if (!response.ok) {
        console.log(`❌ Error: ${responseText}`);
        return null;
    }

    const data = JSON.parse(responseText);
    console.log('✅ Success!');
    return data;
}

async function fetchPostByActivityId(activityId) {
    console.log(`\n🎯 Fetching post with Activity ID: ${activityId}`);
    console.log('=' .repeat(60));
    
    // Try different URL formats for LinkedIn activity posts
    const urlFormats = [
        // Community Management API - using activity ID as URN
        `https://api.linkedin.com/rest/posts/urn:li:activity:${activityId}`,
        
        // Community Management API - direct activity ID
        `https://api.linkedin.com/rest/posts/${activityId}`,
        
        // v2 API - activity format
        `https://api.linkedin.com/v2/activities/urn:li:activity:${activityId}`,
        
        // v2 API - share format
        `https://api.linkedin.com/v2/shares/urn:li:share:${activityId}`,
        
        // v2 API - post format  
        `https://api.linkedin.com/v2/posts/urn:li:post:${activityId}`,
        
        // Social API - activity lookup
        `https://api.linkedin.com/v2/socialActions/urn:li:activity:${activityId}`,
    ];
    
    const headers = [
        // Community Management API headers
        {
            'LinkedIn-Version': '202505',
            'X-Restli-Protocol-Version': '2.0.0'
        },
        // Standard v2 API headers
        {}
    ];
    
    for (let i = 0; i < urlFormats.length; i++) {
        const url = urlFormats[i];
        const header = i < 2 ? headers[0] : headers[1]; // Use CM API headers for first 2 URLs
        
        try {
            console.log(`\n🔍 Attempt ${i + 1}: ${url.split('/').pop()}`);
            
            const result = await makeRequest(url, header);
            
            if (result) {
                console.log(`✅ Found post data!`);
                console.log(`📊 Keys: ${Object.keys(result).join(', ')}`);
                
                // Save the successful response
                const filename = `linkedin-activity-${activityId}.json`;
                fs.writeFileSync(filename, JSON.stringify(result, null, 2));
                console.log(`💾 Saved to: ${filename}`);
                
                return {
                    activityId: activityId,
                    data: result,
                    source: url,
                    method: i < 2 ? 'Community Management API' : 'v2 API'
                };
            }
            
        } catch (error) {
            console.log(`💥 Error: ${error.message}`);
        }
        
        // Rate limit delay
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`❌ Could not fetch post with activity ID: ${activityId}`);
    return null;
}

async function searchForRecentPosts() {
    console.log('\n🔍 Searching for recent posts using different methods...\n');
    
    // Try to find recent posts using various search methods
    const searchMethods = [
        {
            name: 'Member Profile Posts',
            url: 'https://api.linkedin.com/v2/shares?q=owners&owners[0]=urn:li:person:ACoAAB8zZBwBuEWaKs5G_v6sYsJ8qTvT6eqD9-8&count=20&sortBy=CREATED_TIME',
            headers: {}
        },
        {
            name: 'Community Management - My Posts',  
            url: 'https://api.linkedin.com/rest/posts?q=author&author=urn:li:person:ACoAAB8zZBwBuEWaKs5G_v6sYsJ8qTvT6eqD9-8&count=20',
            headers: {
                'LinkedIn-Version': '202505',
                'X-Restli-Protocol-Version': '2.0.0'
            }
        },
        {
            name: 'Posts by Member',
            url: 'https://api.linkedin.com/rest/posts?q=authors&authors=List(urn:li:person:ACoAAB8zZBwBuEWaKs5G_v6sYsJ8qTvT6eqD9-8)&count=20',
            headers: {
                'LinkedIn-Version': '202505',
                'X-Restli-Protocol-Version': '2.0.0'
            }
        }
    ];
    
    const foundPosts = [];
    
    for (const method of searchMethods) {
        console.log(`\n🔍 Trying: ${method.name}`);
        console.log('-'.repeat(40));
        
        try {
            const result = await makeRequest(method.url, method.headers);
            
            if (result) {
                const filename = `search-${method.name.toLowerCase().replace(/\s+/g, '-')}.json`;
                fs.writeFileSync(filename, JSON.stringify(result, null, 2));
                console.log(`💾 Search results saved to: ${filename}`);
                
                // Look for activity IDs in the response
                const activityIds = extractActivityIds(result);
                if (activityIds.length > 0) {
                    console.log(`🎯 Found ${activityIds.length} activity IDs: ${activityIds.slice(0, 3).join(', ')}...`);
                    foundPosts.push(...activityIds);
                }
            }
            
        } catch (error) {
            console.log(`❌ ${method.name} failed: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return foundPosts;
}

function extractActivityIds(data) {
    const activityIds = [];
    
    // Recursive function to find activity IDs in nested objects
    function findIds(obj) {
        if (typeof obj !== 'object' || obj === null) return;
        
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                // Look for URN patterns with activity IDs
                const urnMatch = value.match(/urn:li:activity:(\d+)/);
                if (urnMatch) {
                    activityIds.push(urnMatch[1]);
                }
                
                // Look for share URNs
                const shareMatch = value.match(/urn:li:share:(\d+)/);
                if (shareMatch) {
                    activityIds.push(shareMatch[1]);
                }
            } else if (Array.isArray(value)) {
                value.forEach(findIds);
            } else if (typeof value === 'object') {
                findIds(value);
            }
        }
    }
    
    findIds(data);
    
    // Remove duplicates
    return [...new Set(activityIds)];
}

async function convertToBloyPosts(postData) {
    const blogPosts = [];
    
    for (const post of postData) {
        if (post && post.data) {
            const blogPost = {
                id: post.activityId,
                text: extractPostText(post.data),
                publishedAt: extractPublishDate(post.data),
                url: `https://www.linkedin.com/posts/activity-${post.activityId}`,
                platform: 'linkedin',
                type: 'linkedin_post',
                tags: extractHashtags(extractPostText(post.data)),
                source: post.method
            };
            
            blogPosts.push(blogPost);
        }
    }
    
    return blogPosts;
}

function extractPostText(data) {
    // Try different possible text fields
    if (data.commentary) return data.commentary;
    if (data.text && data.text.text) return data.text.text;
    if (data.content && data.content.commentary) return data.content.commentary;
    if (data.specific && data.specific.com && data.specific.com.linkedin && data.specific.com.linkedin.common) {
        const common = data.specific.com.linkedin.common;
        if (common.commentary) return common.commentary;
        if (common.text) return common.text;
    }
    return 'LinkedIn post content';
}

function extractPublishDate(data) {
    if (data.createdAt) return new Date(data.createdAt).toISOString();
    if (data.created && data.created.time) return new Date(data.created.time).toISOString();
    if (data.publishedAt) return new Date(data.publishedAt).toISOString();
    return new Date().toISOString();
}

function extractHashtags(text) {
    const hashtags = text.match(/#\w+/g);
    return hashtags ? hashtags.map(tag => tag.slice(1).toLowerCase()) : [];
}

async function main() {
    try {
        console.log('🚀 Starting LinkedIn post fetch process...\n');
        
        // Step 1: Try to fetch posts using known activity IDs
        const fetchedPosts = [];
        
        if (activityIds.length > 0) {
            console.log(`📝 Fetching ${activityIds.length} specific activity IDs...`);
            
            for (const activityId of activityIds) {
                const post = await fetchPostByActivityId(activityId);
                if (post) {
                    fetchedPosts.push(post);
                }
                
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } else {
            console.log('⚠️  No specific activity IDs provided. Searching for recent posts...');
        }
        
        // Step 2: Search for additional posts
        console.log('\n🔍 Searching for additional recent posts...');
        const foundActivityIds = await searchForRecentPosts();
        
        if (foundActivityIds.length > 0) {
            console.log(`\n🎯 Found ${foundActivityIds.length} additional activity IDs to fetch...`);
            
            // Fetch the first few discovered posts
            for (const activityId of foundActivityIds.slice(0, 5)) {
                if (!activityIds.includes(activityId)) { // Avoid duplicates
                    const post = await fetchPostByActivityId(activityId);
                    if (post) {
                        fetchedPosts.push(post);
                    }
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        
        // Step 3: Convert to blog format and save
        if (fetchedPosts.length > 0) {
            console.log(`\n🎉 Successfully fetched ${fetchedPosts.length} LinkedIn posts!`);
            
            const blogPosts = await convertToBloyPosts(fetchedPosts);
            
            // Update blog data file
            const postsFile = './data/linkedin-posts.json';
            fs.writeFileSync(postsFile, JSON.stringify(blogPosts, null, 2));
            console.log(`✅ Updated ${postsFile} with ${blogPosts.length} real LinkedIn posts`);
            
            // Update sync info
            const syncInfo = {
                lastManualSync: new Date().toISOString(),
                lastSuccessfulSync: new Date().toISOString(),
                automationEnabled: true,
                syncInterval: "30 minutes",
                tokenStatus: "valid",
                apiVersion: "activity-id-based",
                postsCount: blogPosts.length,
                activityIds: fetchedPosts.map(p => p.activityId)
            };
            
            fs.writeFileSync('./data/linkedin-sync-info.json', JSON.stringify(syncInfo, null, 2));
            console.log('✅ Updated sync info');
            
        } else {
            console.log('❌ No posts could be fetched. Check activity IDs and API permissions.');
            
            // Provide instructions for getting activity IDs
            console.log('\n📋 To add your LinkedIn posts:');
            console.log('1. Go to your LinkedIn profile');
            console.log('2. Copy the URL of a specific post (e.g., linkedin.com/posts/activity-7364309907770126337)');
            console.log('3. Extract the number after "activity-" (e.g., 7364309907770126337)');
            console.log('4. Add these numbers to the activityIds array in this script');
            console.log('5. Run the script again');
        }
        
        console.log('\n🎉 LinkedIn post fetch completed!');
        
    } catch (error) {
        console.error('💥 Fetch process failed:', error);
        process.exit(1);
    }
}

main();