/**
 * Smart LinkedIn URL converter with proper activity ID handling
 * Generate direct LinkedIn post URLs from activity IDs
 */
function convertToDirectLinkedInURL(url, postContent = '', postData = null) {
    // First check if the post data has an activityId field
    if (postData && postData.activityId) {
        return `https://www.linkedin.com/feed/update/urn:li:activity:${postData.activityId}/`;
    }
    
    // Extract activity ID from existing LinkedIn URLs
    const activityMatch = url.match(/activity[:\-](\d+)/);
    if (activityMatch) {
        const activityId = activityMatch[1];
        return `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`;
    }
    
    // Check if URL is already in the correct format
    if (url.includes('/feed/update/urn:li:activity:')) {
        return url;
    }
    
    // For posts without activity IDs, return profile URL as fallback
    if (url.includes('/in/hzl') || !url.includes('activity')) {
        console.warn(`Post missing activity ID, using profile fallback: ${postContent.substring(0, 50)}...`);
        return 'https://www.linkedin.com/in/hzl';
    }
    
    // Default fallback
    return url;
}

/**
 * Fetch latest LinkedIn posts from data file
 */
async function fetchLinkedInPosts() {
    try {
        const response = await fetch('/data/linkedin-posts.json');
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
                
                const postUrl = convertToDirectLinkedInURL(post.url, post.content, post);
                const linkText = postUrl.includes('/in/hzl') ? 'View LinkedIn Profile' : 'View Original Post';
                
                postElement.innerHTML = `
                    <div class="post-content">${post.content}</div>
                    ${tags ? `<div class="post-tags">${tags}</div>` : ''}
                    <div class="post-meta">
                        <a href="${postUrl}" target="_blank" class="source-link">
                            <i class="fa fa-linkedin"></i> ${linkText}
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
                
                const postUrl = convertToDirectLinkedInURL(post.url, post.content, post);
                const linkText = postUrl.includes('/in/hzl') ? 'View LinkedIn Profile' : 'View Original Post';
                
                postElement.innerHTML = `
                    <div class="post-content">${post.content}</div>
                    ${tags ? `<div class="post-tags">${tags}</div>` : ''}
                    <div class="post-footer">
                        <a href="${postUrl}" target="_blank" class="source-link">
                            <i class="fa fa-linkedin"></i> ${linkText}
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