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
        if (!postsContainer) return;
        
        postsContainer.innerHTML = '';
        
        // Show latest 5 posts
        posts.slice(0, 5).forEach(post => {
            const postElement = document.createElement('div');
            postElement.className = 'linkedin-post';
            
            postElement.innerHTML = `
                <p>${post.content}</p>
                <div class="post-date">
                    <small>${new Date(post.date).toLocaleDateString()} • <a href="${post.url}" target="_blank" class="linkedin-link">View on LinkedIn</a></small>
                </div>
            `;
            
            postsContainer.appendChild(postElement);
        });
        
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