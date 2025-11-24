#!/usr/bin/env node

/**
 * LinkedIn Activity ID Sync System
 * 
 * Since LinkedIn API has restricted permissions, this script uses activity IDs
 * to manually sync and update your blog with LinkedIn posts
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 LinkedIn Activity ID Sync System');
console.log('===================================\n');

// Your LinkedIn profile info (from the successful API call)
const PROFILE_INFO = {
    name: "Hongzhi (Harvad) Li",
    profileUrl: "https://linkedin.com/in/hzl",
    personURN: "urn:li:person:ACoAAB8zZBwBuEWaKs5G_v6sYsJ8qTvT6eqD9-8"
};

/**
 * Add your LinkedIn activity IDs here as you post new content
 * To get an activity ID:
 * 1. Go to your LinkedIn post
 * 2. Copy the URL (e.g., linkedin.com/posts/activity-7364309907770126337)
 * 3. Extract the number after "activity-" 
 * 4. Add it to this array with associated metadata
 */
const ACTIVITY_POSTS = [
    {
        activityId: '7364309907770126337',
        title: 'Latest Project Update',
        content: `Excited to share my latest work on Android Auto development! 🚗📱 

Just completed a comprehensive CarPlayer IPTV application with advanced features:
• Smart network optimization for cellular hotspots
• Hybrid media engine (ExoPlayer + VLC fallback)  
• Android Auto native integration
• Professional automotive UI/UX

The app is now live on Firebase App Distribution for testing. Building the future of in-vehicle entertainment with modern Android technologies!

#AndroidAuto #AndroidDevelopment #IPTV #CarTech #Firebase #MobileDevelopment`,
        publishedAt: '2025-08-22T07:30:00.000Z',
        tags: ['android-auto', 'android-development', 'iptv', 'car-tech', 'firebase', 'mobile-development'],
        type: 'project_showcase'
    },
    // Add more posts here as you create new LinkedIn content
];

/**
 * Sync new posts to blog data
 */
async function syncActivityPosts() {
    console.log('📝 Processing LinkedIn activity posts...\n');
    
    const blogPosts = [];
    
    for (const post of ACTIVITY_POSTS) {
        console.log(`🎯 Processing activity: ${post.activityId}`);
        console.log(`📰 Title: ${post.title}`);
        console.log(`📅 Published: ${post.publishedAt}`);
        
        const blogPost = {
            id: `linkedin-${post.activityId}`,
            title: post.title,
            text: post.content,
            publishedAt: post.publishedAt,
            url: `https://www.linkedin.com/posts/activity-${post.activityId}`,
            linkedinUrl: `https://www.linkedin.com/posts/activity-${post.activityId}`,
            platform: 'linkedin',
            type: post.type || 'linkedin_post',
            tags: post.tags || [],
            activityId: post.activityId,
            author: {
                name: PROFILE_INFO.name,
                profileUrl: PROFILE_INFO.profileUrl
            },
            source: 'activity_id_sync'
        };
        
        blogPosts.push(blogPost);
        console.log('✅ Converted to blog format\n');
    }
    
    // Sort by publish date (newest first)
    blogPosts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
    return blogPosts;
}

/**
 * Update blog data files
 */
async function updateBlogData(posts) {
    console.log('💾 Updating blog data files...\n');
    
    // Update main posts file
    const postsFile = './data/linkedin-posts.json';
    fs.writeFileSync(postsFile, JSON.stringify(posts, null, 2));
    console.log(`✅ Updated ${postsFile} with ${posts.length} posts`);
    
    // Update sync info
    const syncInfo = {
        lastManualSync: new Date().toISOString(),
        lastSuccessfulSync: new Date().toISOString(),
        automationEnabled: true,
        syncInterval: "manual_activity_id_based",
        tokenStatus: "activity_id_method",
        apiVersion: "activity_id_sync",
        postsCount: posts.length,
        activityIds: posts.map(p => p.activityId),
        lastActivityId: posts[0]?.activityId || null,
        method: "manual_activity_id_sync"
    };
    
    const syncInfoFile = './data/linkedin-sync-info.json';
    fs.writeFileSync(syncInfoFile, JSON.stringify(syncInfo, null, 2));
    console.log(`✅ Updated sync info`);
    
    console.log('\n📊 SYNC STATISTICS');
    console.log('==================');
    console.log(`📝 Total posts: ${posts.length}`);
    console.log(`🎯 Activity IDs: ${posts.map(p => p.activityId).join(', ')}`);
    console.log(`📅 Date range: ${posts[posts.length - 1]?.publishedAt?.split('T')[0]} to ${posts[0]?.publishedAt?.split('T')[0]}`);
    console.log(`🏷️  Tags: ${[...new Set(posts.flatMap(p => p.tags))].join(', ')}`);
}

/**
 * Generate template for new posts
 */
function generateTemplate() {
    console.log('\n📋 NEW POST TEMPLATE');
    console.log('====================');
    console.log('When you create a new LinkedIn post, add it to ACTIVITY_POSTS array:');
    console.log('');
    console.log(`{
    activityId: 'YOUR_ACTIVITY_ID_HERE',
    title: 'Post Title',
    content: \`Your full LinkedIn post content here...
    
Include all text, emojis, and hashtags exactly as posted.
Use backticks for multi-line content.\`,
    publishedAt: '${new Date().toISOString()}',
    tags: ['tag1', 'tag2', 'tag3'],
    type: 'project_showcase' // or 'technical_update', 'learning', etc.
},`);
    console.log('');
    console.log('📋 How to get Activity ID:');
    console.log('1. Go to your LinkedIn post');
    console.log('2. Click "..." → "Copy link to post"');
    console.log('3. Extract number after "activity-" from URL');
    console.log('4. Add to ACTIVITY_POSTS array above');
    console.log('5. Run: node sync-linkedin-activity-ids.js');
}

/**
 * Create automated sync function for Netlify
 */
function createAutomatedFunction() {
    const netlifyFunction = `/**
 * Netlify Function: LinkedIn Activity ID Sync
 * Updates blog with manually curated LinkedIn posts using activity IDs
 */

const ACTIVITY_POSTS = [
    // This will be updated with your latest posts
    ${JSON.stringify(ACTIVITY_POSTS, null, 4)}
];

const PROFILE_INFO = ${JSON.stringify(PROFILE_INFO, null, 2)};

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const blogPosts = ACTIVITY_POSTS.map(post => ({
            id: \`linkedin-\${post.activityId}\`,
            title: post.title,
            text: post.content,
            publishedAt: post.publishedAt,
            url: \`https://www.linkedin.com/posts/activity-\${post.activityId}\`,
            linkedinUrl: \`https://www.linkedin.com/posts/activity-\${post.activityId}\`,
            platform: 'linkedin',
            type: post.type || 'linkedin_post',
            tags: post.tags || [],
            activityId: post.activityId,
            author: {
                name: PROFILE_INFO.name,
                profileUrl: PROFILE_INFO.profileUrl
            },
            source: 'netlify_activity_sync'
        })).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                posts: blogPosts,
                count: blogPosts.length,
                timestamp: new Date().toISOString(),
                method: 'activity_id_sync'
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};`;

    fs.writeFileSync('./netlify/functions/linkedin-activity-sync.js', netlifyFunction);
    console.log('🔧 Created automated Netlify function: linkedin-activity-sync.js');
}

/**
 * Main execution
 */
async function main() {
    try {
        console.log('🔄 Starting LinkedIn Activity ID sync...\n');
        
        // Process activity posts  
        const posts = await syncActivityPosts();
        
        if (posts.length === 0) {
            console.log('⚠️  No activity posts configured yet.');
            generateTemplate();
            return;
        }
        
        // Update blog data
        await updateBlogData(posts);
        
        // Create automated function
        createAutomatedFunction();
        
        console.log('\n🎉 LinkedIn Activity ID sync completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Your blog now shows your latest LinkedIn posts');
        console.log('2. When you create new LinkedIn posts:');
        console.log('   • Copy the activity ID from post URL');
        console.log('   • Add it to ACTIVITY_POSTS array in this file');
        console.log('   • Run this script again');
        console.log('3. The Netlify function will handle automated serving');
        console.log('\n🔗 Test your blog: https://bluehawana.com/pages/blog.html');
        
    } catch (error) {
        console.error('💥 Sync failed:', error);
        process.exit(1);
    }
}

// Show template on first run
if (ACTIVITY_POSTS.length === 0) {
    console.log('👋 Welcome to LinkedIn Activity ID Sync!');
    generateTemplate();
} else {
    main();
}