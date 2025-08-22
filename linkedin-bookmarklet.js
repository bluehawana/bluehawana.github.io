/**
 * LinkedIn Activity ID Bookmarklet
 * 
 * This bookmarklet can be saved in your browser bookmarks and clicked
 * while on LinkedIn to automatically extract activity IDs from visible posts
 */

javascript:(function(){
    console.log('🔍 LinkedIn Activity ID Extractor Bookmarklet');
    
    // Find all LinkedIn posts on the current page
    const posts = [];
    
    // Different selectors for LinkedIn post elements
    const postSelectors = [
        'article[data-urn]',                    // Main post articles with URNs
        '.feed-shared-update-v2',               // Feed updates
        '.share-update-card',                   // Share cards
        '[data-urn*="activity"]',               // Any element with activity URN
        'a[href*="posts/activity-"]',           // Direct links to activities
        'a[href*="feed/update/urn:li:activity"]' // Feed update links
    ];
    
    // Function to extract activity ID from various formats
    function extractActivityId(text) {
        if (!text) return null;
        
        const patterns = [
            /urn:li:activity:(\d+)/,           // URN format
            /activity-(\d+)/,                  // URL format
            /posts\/.*?-(\d+)/,               // Alternative URL format
            /feed\/update\/urn:li:activity:(\d+)/ // Feed format
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1];
            }
        }
        
        return null;
    }
    
    // Search for posts using different selectors
    for (const selector of postSelectors) {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(element => {
            let activityId = null;
            let postUrl = null;
            let postText = '';
            
            // Try to get activity ID from data attributes
            if (element.dataset.urn) {
                activityId = extractActivityId(element.dataset.urn);
            }
            
            // Try to get from href attributes
            if (!activityId) {
                const links = element.querySelectorAll('a[href*="activity"], a[href*="posts"]');
                for (const link of links) {
                    activityId = extractActivityId(link.href);
                    if (activityId) {
                        postUrl = link.href;
                        break;
                    }
                }
            }
            
            // Try to get from any text content
            if (!activityId) {
                activityId = extractActivityId(element.outerHTML);
            }
            
            // Get post text content
            const textElements = element.querySelectorAll('.feed-shared-text, .share-update-card__description, .update-components-text');
            if (textElements.length > 0) {
                postText = Array.from(textElements).map(el => el.textContent.trim()).join(' ');
            }
            
            if (activityId && !posts.find(p => p.id === activityId)) {
                posts.push({
                    id: activityId,
                    url: postUrl || `https://www.linkedin.com/posts/activity-${activityId}`,
                    text: postText.substring(0, 200) + (postText.length > 200 ? '...' : ''),
                    element: element
                });
            }
        });
    }
    
    // Create results display
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 10000;
        overflow-y: auto;
        padding: 20px;
        font-family: 'Courier New', monospace;
    `;
    
    const container = document.createElement('div');
    container.style.cssText = `
        max-width: 800px;
        margin: 0 auto;
        background: #111;
        border: 2px solid #00d4ff;
        border-radius: 10px;
        padding: 30px;
        color: white;
    `;
    
    let html = `
        <h2 style="color: #00d4ff; margin-bottom: 20px;">🔍 LinkedIn Activity IDs Found</h2>
        <p style="color: #cccccc; margin-bottom: 20px;">Found ${posts.length} posts with activity IDs</p>
    `;
    
    if (posts.length > 0) {
        html += '<div style="margin-bottom: 20px;">';
        
        posts.forEach((post, index) => {
            html += `
                <div style="background: #1a1a1a; border: 1px solid #333; border-radius: 5px; padding: 15px; margin-bottom: 10px;">
                    <div style="color: #50fa7b; font-weight: bold; margin-bottom: 5px;">Activity ID: ${post.id}</div>
                    <div style="color: #bd93f9; font-size: 12px; margin-bottom: 5px;">${post.url}</div>
                    <div style="color: #cccccc; font-size: 11px;">${post.text}</div>
                    <button onclick="copyToClipboard('${post.id}')" style="background: #50fa7b; color: black; border: none; padding: 5px 10px; border-radius: 3px; margin: 5px 5px 0 0; cursor: pointer; font-size: 11px;">Copy ID</button>
                    <button onclick="copyToClipboard('${post.url}')" style="background: #bd93f9; color: black; border: none; padding: 5px 10px; border-radius: 3px; margin: 5px 5px 0 0; cursor: pointer; font-size: 11px;">Copy URL</button>
                </div>
            `;
        });
        
        html += '</div>';
        
        // Generate copy-all buttons
        const allIds = posts.map(p => p.id).join('\\n');
        const allUrls = posts.map(p => p.url).join('\\n');
        const syncCode = posts.map((post, i) => `{
    activityId: '${post.id}',
    title: 'LinkedIn Post ${i + 1}',
    content: \`${post.text.replace(/`/g, '\\`')}\`,
    publishedAt: '${new Date().toISOString()}',
    tags: ['linkedin-post'],
    type: 'linkedin_post'
}`).join(',\\n');
        
        html += `
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333;">
                <button onclick="copyToClipboard('${allIds}')" style="background: #00d4ff; color: black; border: none; padding: 10px 15px; border-radius: 5px; margin: 5px; cursor: pointer;">📋 Copy All IDs</button>
                <button onclick="copyToClipboard('${allUrls}')" style="background: #00d4ff; color: black; border: none; padding: 10px 15px; border-radius: 5px; margin: 5px; cursor: pointer;">🔗 Copy All URLs</button>
                <button onclick="copyToClipboard('[${syncCode}]')" style="background: #ff9800; color: black; border: none; padding: 10px 15px; border-radius: 5px; margin: 5px; cursor: pointer;">⚡ Copy Sync Code</button>
            </div>
        `;
    } else {
        html += '<p style="color: #ff073a;">❌ No activity IDs found on this page. Try scrolling down to load more posts, or navigate to your profile activity page.</p>';
    }
    
    html += `
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333; text-align: center;">
            <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: #ff073a; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">✕ Close</button>
        </div>
    `;
    
    container.innerHTML = html;
    modal.appendChild(container);
    document.body.appendChild(modal);
    
    // Add copy function to window
    window.copyToClipboard = function(text) {
        navigator.clipboard.writeText(text).then(() => {
            alert('✅ Copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            // Fallback method
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            alert('✅ Copied to clipboard!');
        });
    };
    
    console.log(`✅ Found ${posts.length} LinkedIn posts with activity IDs`);
    console.log('Activity IDs:', posts.map(p => p.id));
    
})();