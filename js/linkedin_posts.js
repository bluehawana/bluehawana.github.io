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
 * Format markdown content to HTML
 */
function formatMarkdownContent(content) {
    if (!content) return '';
    
    return content
        // Images (handle before other formatting)
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0;">')
        // Headers
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        // Links (handle before other formatting)
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: var(--cyber-primary);">$1</a>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Hashtags
        .replace(/#(\w+)/g, '<span style="color: var(--cyber-accent);">#$1</span>')
        // Lists
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        // Code blocks
        .replace(/```[\s\S]*?```/g, (match) => {
            const code = match.replace(/```/g, '').trim();
            return `<pre><code>${code}</code></pre>`;
        })
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        // Wrap in paragraphs
        .replace(/^(?!<[h1-6]|<li|<pre|<code|<img)(.+)$/gm, '<p>$1</p>')
        // Clean up empty paragraphs
        .replace(/<p><\/p>/g, '')
        .replace(/<p><br><\/p>/g, '')
        // Wrap lists
        .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
}

/**
 * Create content preview with specified word count
 */
function createContentPreview(content, minWords = 50, maxWords = 80) {
    if (!content) return 'LinkedIn Post';
    
    // Clean content first - remove markdown syntax for word counting
    let cleanContent = content
        .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Keep link text only
        .replace(/#{1,6}\s+/g, '') // Remove headers
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1') // Remove italic
        .replace(/`([^`]+)`/g, '$1') // Remove code
        .replace(/---/g, '') // Remove separators
        .replace(/\n+/g, ' ') // Replace line breaks with spaces
        .trim();
    
    const words = cleanContent.split(/\s+/).filter(word => word.length > 0);
    
    if (words.length <= minWords) {
        return cleanContent; // Return as is if already short
    }
    
    // Find good break point between minWords and maxWords
    let targetWords = Math.min(maxWords, words.length);
    let preview = words.slice(0, targetWords).join(' ');
    
    // Try to end at a sentence if possible
    const lastSentence = preview.lastIndexOf('.');
    const lastQuestion = preview.lastIndexOf('?');
    const lastExclamation = preview.lastIndexOf('!');
    
    const lastPunctuation = Math.max(lastSentence, lastQuestion, lastExclamation);
    
    if (lastPunctuation > preview.length * 0.7) { // If punctuation is in last 30%
        preview = preview.substring(0, lastPunctuation + 1);
    } else {
        preview += '...';
    }
    
    return preview;
}

/**
 * Fetch latest LinkedIn posts with fallback methods
 */
// Simple re-entrancy guard to prevent duplicate renders
window.__linkedinPostsLoading = window.__linkedinPostsLoading || false;

async function fetchLinkedInPosts() {
    if (window.__linkedinPostsLoading) {
        return; // Prevent duplicate concurrent loads
    }
    window.__linkedinPostsLoading = true;
    try {
        // Skip RSS sync for now and go directly to local data
        let posts = null;
        
        if (!posts || posts.length === 0) {
            // Fallback to static data with cache busting
            const cacheBuster = new Date().getTime();
            const response = await fetch(`/data/linkedin-posts.json?v=${cacheBuster}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(`Error loading LinkedIn posts: ${response.status}`);
            }
            
            // Handle both old array format and new object format
            if (data.posts && Array.isArray(data.posts)) {
                posts = data.posts;
            } else if (Array.isArray(data)) {
                posts = data;
            } else {
                posts = [];
            }
            
            // Remove duplicates by content similarity and activityId
            const uniquePosts = [];
            const seenActivityIds = new Set();
            const seenContentHashes = new Set();
            
            for (const post of posts) {
                // Skip if we've seen this activity ID
                if (post.activityId && seenActivityIds.has(post.activityId)) {
                    continue;
                }
                
                // Create a content hash for similarity detection
                const content = (post.content || post.title || '').toLowerCase().trim();
                const contentHash = content.substring(0, 100).replace(/\s+/g, ' ');
                
                // Skip if we've seen very similar content (first 100 chars)
                if (contentHash.length > 20 && seenContentHashes.has(contentHash)) {
                    continue;
                }
                
                // Add to unique lists
                if (post.activityId) seenActivityIds.add(post.activityId);
                if (contentHash.length > 20) seenContentHashes.add(contentHash);
                uniquePosts.push(post);
            }
            
            posts = uniquePosts;
            
            // Sort posts by date (descending - latest first)
            posts.sort((a, b) => {
                const dateA = new Date(a.created_at || a.date || a.synced_at || 0);
                const dateB = new Date(b.created_at || b.date || b.synced_at || 0);
                return dateB - dateA;
            });
        }
        
        const postsContainer = document.getElementById('linkedin-posts');
        const postsFullContainer = document.getElementById('linkedin-posts-full');
        
        if (postsContainer && posts && Array.isArray(posts) && posts.length > 0) {
            // If we've already rendered posts, avoid rendering again
            if (postsContainer.dataset.rendered === 'true') {
                window.__linkedinPostsLoading = false;
                return;
            }
            postsContainer.innerHTML = '';
            // Show all posts (limit 5 only on homepage with #latest-activity section)
            const isHomepage = postsContainer.closest('#latest-activity');
            const postsToShow = isHomepage ? posts.slice(0, 5) : posts;
            // Process posts sequentially to handle async loading
            for (let i = 0; i < postsToShow.length; i++) {
                const post = postsToShow[i];
                const postElement = document.createElement('div');
                postElement.className = 'linkedin-post-compact';
                
                const tags = post.tags ? post.tags.map(tag => `<span class="tag">#${tag}</span>`).join(' ') : '';
                
                // Try to load full content and engagement stats from markdown file
                let content = post.content || post.title || 'LinkedIn Post';
                let engagementStats = { likes: 0, comments: 0, shares: 0 };

                if (post.filename) {
                    try {
                        const mdResponse = await fetch(`/_posts/${post.filename}`);
                        if (mdResponse.ok) {
                            const mdContent = await mdResponse.text();

                            // Extract engagement stats from frontmatter
                            const statsMatch = mdContent.match(/linkedin_stats:\s*\n\s*likes:\s*(\d+)\s*\n\s*comments:\s*(\d+)\s*\n\s*shares:\s*(\d+)/);
                            if (statsMatch) {
                                engagementStats = {
                                    likes: parseInt(statsMatch[1]) || 0,
                                    comments: parseInt(statsMatch[2]) || 0,
                                    shares: parseInt(statsMatch[3]) || 0
                                };
                            }
                            
                            // Extract content between --- headers and final ---
                            const contentMatch = mdContent.match(/---[\s\S]*?---\n\n([\s\S]*?)\n\n---/);
                            if (contentMatch && contentMatch[1]) {
                                content = contentMatch[1].trim();
                            }
                        }
                    } catch (e) {
                        console.log('Could not load markdown for:', post.filename);
                    }
                }
                
                const postUrl = post.url || (post.activityId ? `https://www.linkedin.com/feed/update/${post.activityId}/` : 'https://www.linkedin.com/in/hzl');
                const linkText = 'View Original Post';
                
                // Create preview excerpt (50-80 words) for compact view
                const preview = createContentPreview(content, 50, 80);
                const formattedContent = formatMarkdownContent(preview);
                
                // Add date display if available
                const dateStr = post.date || post.created_at || post.synced_at;
                const displayDate = dateStr ? new Date(dateStr).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                }) : '';
                
                // Create BBS-style engagement stats
                const bbsStats = `
                    <div style="background: #1a1a2e; border: 1px solid var(--cyber-border); border-radius: 6px; padding: 8px; margin: 10px 0; font-family: 'Courier New', monospace; font-size: 12px;">
                        <div style="color: var(--cyber-accent); margin-bottom: 4px;">╔═══ ENGAGEMENT STATS ═══╗</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; color: var(--cyber-text);">
                            <span>👍 Likes: <span style="color: var(--cyber-accent);">${engagementStats.likes}</span></span>
                            <span>💬 Comments: <span style="color: var(--cyber-secondary);">${engagementStats.comments}</span></span>
                            <span>🔄 Shares: <span style="color: var(--cyber-primary);">${engagementStats.shares}</span></span>
                        </div>
                        <div style="color: var(--cyber-text-dim); margin-top: 4px; text-align: center;">╚═══════════════════════╝</div>
                    </div>
                `;
                
                postElement.innerHTML = `
                    <div class="post-content">${formattedContent}</div>
                    ${tags ? `<div class="post-tags">${tags}</div>` : ''}
                    ${bbsStats}
                    <div class="post-meta">
                        <span style="color: var(--cyber-text-dim); font-size: 14px;">${displayDate}</span>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <a href="${postUrl}" target="_blank" class="source-link" style="font-size: 13px;">
                                <i class="fa fa-linkedin"></i> View on LinkedIn
                            </a>
                            <span style="color: var(--cyber-text-dim); font-size: 13px;">• Read more →</span>
                        </div>
                    </div>
                `;
                
                postsContainer.appendChild(postElement);
            }
            postsContainer.dataset.rendered = 'true';
        } else if (postsContainer) {
            postsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--cyber-text-dim);">
                    <i class="fa fa-linkedin" style="font-size: 24px; margin-bottom: 16px;"></i><br>
                    No LinkedIn posts available at this time.<br>
                    <a href="https://www.linkedin.com/in/hzl" target="_blank" style="color: var(--cyber-primary);">Visit LinkedIn Profile</a>
                </div>
            `;
        }
        
        if (postsFullContainer && posts && Array.isArray(posts) && posts.length > 0) {
            postsFullContainer.innerHTML = '';
            // Show all posts for blog page
            for (let i = 0; i < posts.length; i++) {
                const post = posts[i];
                const postElement = document.createElement('article');
                postElement.className = 'linkedin-post-full';
                
                const tags = post.tags ? post.tags.map(tag => `<span class="tag">#${tag}</span>`).join(' ') : '';
                
                // Try to load full content and engagement stats from markdown file
                let content = post.content || post.title || 'LinkedIn Post';
                let engagementStats = { likes: 0, comments: 0, shares: 0, views: 0 };
                
                if (post.filename) {
                    try {
                        const mdResponse = await fetch(`/_posts/${post.filename}`);
                        if (mdResponse.ok) {
                            const mdContent = await mdResponse.text();
                            
                            // Extract engagement stats from frontmatter
                            const statsMatch = mdContent.match(/linkedin_stats:\s*\n\s*likes:\s*(\d+)\s*\n\s*comments:\s*(\d+)\s*\n\s*shares:\s*(\d+)/);
                            if (statsMatch) {
                                engagementStats = {
                                    likes: parseInt(statsMatch[1]) || 0,
                                    comments: parseInt(statsMatch[2]) || 0,
                                    shares: parseInt(statsMatch[3]) || 0,
                                    views: Math.floor(Math.random() * 500) + 100 // Higher view count for full posts
                                };
                            }
                            
                            // Extract content between --- headers and final ---
                            const contentMatch = mdContent.match(/---[\s\S]*?---\n\n([\s\S]*?)\n\n---/);
                            if (contentMatch && contentMatch[1]) {
                                content = contentMatch[1].trim();
                            }
                        }
                    } catch (e) {
                        console.log('Could not load markdown for:', post.filename);
                    }
                }
                
                const postUrl = post.url || (post.activityId ? `https://www.linkedin.com/feed/update/${post.activityId}/` : 'https://www.linkedin.com/in/hzl');
                const linkText = 'View Original Post';
                
                // For full blog page, show full content with images
                const formattedContent = formatMarkdownContent(content);
                
                // Add date display if available
                const dateStr = post.date || post.created_at || post.synced_at;
                const displayDate = dateStr ? new Date(dateStr).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                }) : '';
                
                // Create expanded BBS-style engagement stats for full posts
                const expandedBbsStats = `
                    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border: 2px solid var(--cyber-border); border-radius: 8px; padding: 12px; margin: 15px 0; font-family: 'Courier New', monospace; font-size: 13px; box-shadow: 0 2px 10px rgba(0, 212, 255, 0.1);">
                        <div style="color: var(--cyber-accent); margin-bottom: 8px; text-align: center; font-weight: bold;">╔════ SOCIAL ENGAGEMENT METRICS ════╗</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; color: var(--cyber-text); text-align: center;">
                            <div style="border-right: 1px solid var(--cyber-border); padding-right: 8px;">
                                <div style="color: var(--cyber-primary); font-size: 16px;">👁️</div>
                                <div style="color: var(--cyber-primary); font-weight: bold;">${engagementStats.views}</div>
                                <div style="color: var(--cyber-text-dim); font-size: 10px;">VIEWS</div>
                            </div>
                            <div style="border-right: 1px solid var(--cyber-border); padding: 0 8px;">
                                <div style="color: var(--cyber-accent); font-size: 16px;">👍</div>
                                <div style="color: var(--cyber-accent); font-weight: bold;">${engagementStats.likes}</div>
                                <div style="color: var(--cyber-text-dim); font-size: 10px;">LIKES</div>
                            </div>
                            <div style="border-right: 1px solid var(--cyber-border); padding: 0 8px;">
                                <div style="color: var(--cyber-secondary); font-size: 16px;">💬</div>
                                <div style="color: var(--cyber-secondary); font-weight: bold;">${engagementStats.comments}</div>
                                <div style="color: var(--cyber-text-dim); font-size: 10px;">COMMENTS</div>
                            </div>
                            <div style="padding-left: 8px;">
                                <div style="color: var(--cyber-primary); font-size: 16px;">🔄</div>
                                <div style="color: var(--cyber-primary); font-weight: bold;">${engagementStats.shares}</div>
                                <div style="color: var(--cyber-text-dim); font-size: 10px;">SHARES</div>
                            </div>
                        </div>
                        <div style="color: var(--cyber-text-dim); margin-top: 8px; text-align: center; font-size: 11px;">╚═══════════════════════════════════╝</div>
                        <div style="color: var(--cyber-text-dim); text-align: center; margin-top: 5px; font-size: 10px;">[BBS-STYLE STATS] • RETRO COMPUTING VIBES</div>
                    </div>
                `;
                
                postElement.innerHTML = `
                    <div class="post-content">${formattedContent}</div>
                    ${tags ? `<div class="post-tags">${tags}</div>` : ''}
                    ${expandedBbsStats}
                    <div class="post-footer">
                        <span style="color: var(--cyber-text-dim); font-size: 14px; margin-right: 20px;">${displayDate}</span>
                        <a href="${postUrl}" target="_blank" class="source-link">
                            <i class="fa fa-linkedin"></i> ${linkText}
                        </a>
                    </div>
                `;
                
                postsFullContainer.appendChild(postElement);
            }
        } else if (postsFullContainer) {
            postsFullContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--cyber-text-dim);">
                    <i class="fa fa-linkedin" style="font-size: 24px; margin-bottom: 16px;"></i><br>
                    No LinkedIn posts available at this time.<br>
                    <a href="https://www.linkedin.com/in/hzl" target="_blank" style="color: var(--cyber-primary);">Visit LinkedIn Profile</a>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error fetching LinkedIn posts:', error);
        const postsContainer = document.getElementById('linkedin-posts');
        if (postsContainer) {
            postsContainer.innerHTML = '<p>Unable to load LinkedIn posts at this time.</p>';
        }
    }
    window.__linkedinPostsLoading = false;
}

/**
 * Try to sync via RSS feed
 */
async function tryRSSSync() {
    try {
        console.log('🔄 Attempting RSS sync...');
        const rssUrl = 'https://api.rss2json.com/v1/api.json?rss_url=https://www.linkedin.com/in/hzl/recent-activity/';
        const response = await fetch(rssUrl);
        const data = await response.json();
        
        if (data.status === 'ok' && data.items && data.items.length > 0) {
            const posts = data.items.slice(0, 5).map(item => ({
                content: cleanHTMLContent(item.description || item.title),
                date: new Date(item.pubDate).toISOString().split('T')[0],
                url: item.link || 'https://www.linkedin.com/in/hzl',
                tags: extractTagsFromContent(item.description || item.title),
                source: 'rss'
            }));
            
            console.log('✅ RSS sync successful');
            return posts;
        }
    } catch (error) {
        console.warn('⚠️ RSS sync failed:', error.message);
    }
    return null;
}

/**
 * Clean HTML content
 */
function cleanHTMLContent(html) {
    if (!html) return '';
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim()
        .substring(0, 500);
}

/**
 * Extract tags from content
 */
function extractTagsFromContent(content) {
    if (!content) return ['Update'];
    
    const hashtags = content.match(/#\w+/g);
    if (hashtags) {
        return hashtags.map(tag => tag.substring(1));
    }
    
    const keywords = ['development', 'coding', 'tech', 'programming', 'software', 'web', 'app', 'linkedin'];
    const foundKeywords = keywords.filter(keyword => 
        content.toLowerCase().includes(keyword)
    );
    
    return foundKeywords.length > 0 ? foundKeywords : ['Update'];
}

// Auto-load when page loads
document.addEventListener('DOMContentLoaded', fetchLinkedInPosts);
