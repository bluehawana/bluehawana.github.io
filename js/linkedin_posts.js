/**
 * Smart LinkedIn URL converter with content-based mapping
 * Extract activity ID from LinkedIn URLs and generate clean feed URL
 */
function convertToDirectLinkedInURL(url, postContent = '') {
    // Extract activity ID from LinkedIn URLs
    const activityMatch = url.match(/activity-(\d+)-/);
    if (activityMatch) {
        const activityId = activityMatch[1];
        return `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`;
    }
    
    // Smart mapping for posts without activity IDs
    const contentMappings = {
        "Undoubtedly, this is the finest beach": null, // TODO: Find activity ID
        "Unleash your inner racer": null, // TODO: Find activity ID  
        "I've been following Sander Van Vugt": null, // TODO: Find activity ID
        "Experience the power of Linux containers": null // TODO: Find activity ID
    };
    
    // Check if we have a mapping for this post
    const postStart = postContent.substring(0, 50);
    for (const [key, activityId] of Object.entries(contentMappings)) {
        if (postStart.includes(key)) {
            if (activityId) {
                return `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`;
            } else {
                // For now, return the original URL but we know we need to find the activity ID
                console.warn(`Missing LinkedIn activity ID for post: ${key}`);
                return url;
            }
        }
    }
    
    // If already in direct format or no activity ID found, return as is
    return url;
}

/**
 * Fetch latest LinkedIn posts from data file
 */
async function fetchLinkedInPosts() {
    try {
        const response = await fetch('./data/linkedin-posts.json');
        const posts = await response.json();
        
        if (!response.ok) {
            throw new Error(`Error loading LinkedIn posts: ${response.status}`);
        }
        
        const postsContainer = document.getElementById('linkedin-posts');
        const postsFullContainer = document.getElementById('linkedin-posts-full');
        
        if (postsContainer) {
            postsContainer.innerHTML = '';
            // Show all posts (limit 5 only on homepage with #latest-activity section)
            const isHomepage = postsContainer.closest('#latest-activity');
            const postsToShow = isHomepage ? posts.slice(0, 5) : posts;
            postsToShow.forEach(post => {
                const postElement = document.createElement('div');
                postElement.className = 'linkedin-post-compact';
                
                const tags = post.tags ? post.tags.map(tag => `<span class="tag">#${tag}</span>`).join(' ') : '';
                
                postElement.innerHTML = `
                    <div class="post-content">${post.content}</div>
                    ${tags ? `<div class="post-tags">${tags}</div>` : ''}
                    <div class="post-meta">
                        <a href="${convertToDirectLinkedInURL(post.url, post.content)}" target="_blank" class="source-link">
                            <i class="fa fa-linkedin"></i> View Original Post
                        </a>
                    </div>
                `;
                
                postsContainer.appendChild(postElement);
            });
        }
        
        if (postsFullContainer) {
            postsFullContainer.innerHTML = '';
            // Show all posts for blog page
            posts.forEach(post => {
                const postElement = document.createElement('article');
                postElement.className = 'linkedin-post-full';
                
                const tags = post.tags ? post.tags.map(tag => `<span class="tag">#${tag}</span>`).join(' ') : '';
                
                postElement.innerHTML = `
                    <div class="post-content">${post.content}</div>
                    ${tags ? `<div class="post-tags">${tags}</div>` : ''}
                    <div class="post-footer">
                        <a href="${convertToDirectLinkedInURL(post.url, post.content)}" target="_blank" class="source-link">
                            <i class="fa fa-linkedin"></i> View Original Post
                        </a>
                    </div>
                `;
                
                postsFullContainer.appendChild(postElement);
            });
        }
        
    } catch (error) {
        console.error('Error fetching LinkedIn posts:', error);
        const postsContainer = document.getElementById('linkedin-posts');
        if (postsContainer) {
            postsContainer.innerHTML = '<p>Unable to load LinkedIn posts at this time.</p>';
        }
    }
}

// Auto-load when page loads
document.addEventListener('DOMContentLoaded', fetchLinkedInPosts);