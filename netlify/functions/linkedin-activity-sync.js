/**
 * Netlify Function: LinkedIn Activity ID Sync
 * Updates blog with manually curated LinkedIn posts using activity IDs
 */

const ACTIVITY_POSTS = [
    // This will be updated with your latest posts
    [
    {
        "activityId": "7364309907770126337",
        "title": "Latest Project Update",
        "content": "Excited to share my latest work on Android Auto development! 🚗📱 \n\nJust completed a comprehensive CarPlayer IPTV application with advanced features:\n• Smart network optimization for cellular hotspots\n• Hybrid media engine (ExoPlayer + VLC fallback)  \n• Android Auto native integration\n• Professional automotive UI/UX\n\nThe app is now live on Firebase App Distribution for testing. Building the future of in-vehicle entertainment with modern Android technologies!\n\n#AndroidAuto #AndroidDevelopment #IPTV #CarTech #Firebase #MobileDevelopment",
        "publishedAt": "2025-08-22T07:30:00.000Z",
        "tags": [
            "android-auto",
            "android-development",
            "iptv",
            "car-tech",
            "firebase",
            "mobile-development"
        ],
        "type": "project_showcase"
    }
]
];

const PROFILE_INFO = {
  "name": "Hongzhi (Harvad) Li",
  "profileUrl": "https://linkedin.com/in/hzl",
  "personURN": "urn:li:person:ACoAAB8zZBwBuEWaKs5G_v6sYsJ8qTvT6eqD9-8"
};

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
};