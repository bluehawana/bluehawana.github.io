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
            // Show latest 3 posts for homepage
            posts.slice(0, 3).forEach(post => {
                const postElement = document.createElement('div');
                postElement.className = 'linkedin-post-compact';
                
                const tags = post.tags ? post.tags.map(tag => `<span class="tag">#${tag}</span>`).join(' ') : '';
                
                postElement.innerHTML = `
                    <div class="post-content">${post.content}</div>
                    ${tags ? `<div class="post-tags">${tags}</div>` : ''}
                    <div class="post-meta">
                        <span class="post-date">${new Date(post.date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                        })}</span>
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
                    <div class="post-header">
                        <div class="post-date">${new Date(post.date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}</div>
                    </div>
                    <div class="post-content">${post.content}</div>
                    ${tags ? `<div class="post-tags">${tags}</div>` : ''}
                    <div class="post-footer">
                        <a href="${post.url}" target="_blank" class="source-link">
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