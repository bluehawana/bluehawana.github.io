/**
 * Automated Content Monitoring System
 * Checks for new LinkedIn posts and GitHub projects every 30 minutes from 8 AM to 11:59 PM
 */

class ContentMonitor {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.checkInterval = 30 * 60 * 1000; // 30 minutes in milliseconds
        this.activeHours = { start: 8, end: 23 }; // 8 AM to 11:59 PM
        this.lastCheck = {
            linkedin: localStorage.getItem('last_linkedin_check') || new Date(0).toISOString(),
            github: localStorage.getItem('last_github_check') || new Date(0).toISOString()
        };
        
        // Initialize on page load
        this.init();
    }

    /**
     * Initialize the monitoring system
     */
    init() {
        console.log('🤖 Content Monitor initialized');
        this.startMonitoring();
        
        // Also check immediately if it's been more than 30 minutes
        this.checkIfUpdateNeeded();
    }

    /**
     * Check if current time is within active monitoring hours
     */
    isWithinActiveHours() {
        const now = new Date();
        const currentHour = now.getHours();
        return currentHour >= this.activeHours.start && currentHour <= this.activeHours.end;
    }

    /**
     * Start the monitoring system
     */
    startMonitoring() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        console.log('🚀 Starting automated content monitoring (30-min intervals, 8 AM - 11:59 PM)');
        
        this.intervalId = setInterval(() => {
            if (this.isWithinActiveHours()) {
                this.performScheduledCheck();
            } else {
                console.log('⏰ Outside active hours (8 AM - 11:59 PM), skipping check');
            }
        }, this.checkInterval);
        
        // Show status in console
        this.displayStatus();
    }

    /**
     * Stop the monitoring system
     */
    stopMonitoring() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        console.log('⏹️ Content monitoring stopped');
    }

    /**
     * Check if an immediate update is needed (on page load)
     */
    checkIfUpdateNeeded() {
        const now = new Date();
        const linkedinLastCheck = new Date(this.lastCheck.linkedin);
        const githubLastCheck = new Date(this.lastCheck.github);
        
        const timeSinceLinkedIn = now - linkedinLastCheck;
        const timeSinceGitHub = now - githubLastCheck;
        
        // If more than 30 minutes and within active hours, check now
        if (this.isWithinActiveHours()) {
            if (timeSinceLinkedIn > this.checkInterval) {
                console.log('🔍 LinkedIn content check overdue, checking now...');
                this.checkLinkedInUpdates();
            }
            
            if (timeSinceGitHub > this.checkInterval) {
                console.log('🔍 GitHub content check overdue, checking now...');
                this.checkGitHubUpdates();
            }
        }
    }

    /**
     * Perform scheduled content checks
     */
    async performScheduledCheck() {
        console.log('🔄 Performing scheduled content check...');
        
        try {
            // Check both LinkedIn and GitHub in parallel
            await Promise.allSettled([
                this.checkLinkedInUpdates(),
                this.checkGitHubUpdates()
            ]);
        } catch (error) {
            console.error('❌ Error during scheduled check:', error);
        }
    }

    /**
     * Check for new LinkedIn posts using intelligent detection
     */
    async checkLinkedInUpdates() {
        try {
            console.log('🔗 Starting automatic LinkedIn sync via Netlify Function...');
            
            // Call the Netlify function that handles LinkedIn API sync and GitHub updates
            const response = await fetch('/.netlify/functions/linkedin-sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Netlify function error: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ LinkedIn sync completed successfully!`);
                console.log(`📊 Total posts: ${result.postsCount}`);
                
                if (result.updateResult && result.updateResult.newPosts > 0) {
                    console.log(`✨ Found ${result.updateResult.newPosts} new posts!`);
                    this.notifyNewContent('linkedin', result.updateResult.newPosts);
                    
                    // Trigger page refresh to show new posts
                    window.dispatchEvent(new CustomEvent('linkedin-posts-synced', {
                        detail: { 
                            newPosts: result.updateResult.newPosts,
                            totalPosts: result.postsCount,
                            commitSha: result.updateResult.commitSha
                        }
                    }));
                    
                    // Refresh the page after a short delay to show new posts
                    setTimeout(() => {
                        console.log('🔄 Refreshing page to show new LinkedIn posts...');
                        window.location.reload();
                    }, 3000);
                } else {
                    console.log('📝 No new posts detected');
                }
            } else {
                throw new Error(result.error || 'LinkedIn sync failed');
            }
            
            this.lastCheck.linkedin = new Date().toISOString();
            localStorage.setItem('last_linkedin_check', this.lastCheck.linkedin);
            
        } catch (error) {
            console.error('❌ LinkedIn sync error:', error);
            
            // Fallback to local sync if Netlify function fails
            console.log('🔄 Falling back to local LinkedIn sync...');
            await this.fallbackLinkedInSync();
        }
    }
    
    /**
     * Fallback LinkedIn sync using local API (when Netlify function fails)
     */
    async fallbackLinkedInSync() {
        try {
            // Only check if we have a valid token
            if (!window.linkedInSync || !window.linkedInSync.isTokenValid()) {
                console.log('⚠️ LinkedIn not authenticated, skipping fallback sync');
                return;
            }

            // Use the enhanced sync function that automatically detects new posts
            const syncResult = await window.linkedInSync.syncLinkedInPosts();
            
            console.log(`📊 Fallback sync completed with ${syncResult.length} total posts`);
            console.log('⚠️ Note: Posts detected but not automatically saved. Manual update required.');
            
            // Generate JSON for manual copy-paste
            const jsonOutput = window.linkedInSync.generateUpdatedJSON(syncResult);
            console.log('📋 Updated posts JSON (copy to data/linkedin-posts.json):');
            console.log(jsonOutput);
            
        } catch (error) {
            console.error('❌ Fallback LinkedIn sync error:', error);
        }
    }

    /**
     * Find new and updated posts by comparing sync results with current data
     */
    findUpdatedPosts(syncedPosts, currentPosts) {
        const currentUrls = new Set(currentPosts.map(post => post.url));
        const currentContents = new Set(currentPosts.map(post => 
            post.content.substring(0, 150).toLowerCase().trim()
        ));

        const newPosts = [];
        const updatedPosts = [];

        for (const post of syncedPosts) {
            const contentPreview = post.content.substring(0, 150).toLowerCase().trim();
            
            // Check if this is a completely new post
            if (!currentContents.has(contentPreview)) {
                newPosts.push(post);
            } 
            // Check if this is an existing post with an updated URL (activity ID fix)
            else if (currentContents.has(contentPreview) && !currentUrls.has(post.url)) {
                const oldPost = currentPosts.find(p => 
                    p.content.substring(0, 150).toLowerCase().trim() === contentPreview
                );
                if (oldPost && oldPost.url !== post.url) {
                    updatedPosts.push({
                        old: oldPost,
                        new: post,
                        changeType: 'activity_id_updated'
                    });
                }
            }
        }

        return { newPosts, updatedPosts };
    }

    /**
     * Check for new GitHub projects
     */
    async checkGitHubUpdates() {
        try {
            console.log('🐙 Checking GitHub for new/updated repositories...');
            
            const response = await fetch('https://api.github.com/users/bluehawana/repos?sort=updated&per_page=10');
            const repos = await response.json();
            
            const lastGitHubCheck = new Date(this.lastCheck.github);
            const newRepos = repos.filter(repo => {
                const updatedAt = new Date(repo.updated_at);
                return updatedAt > lastGitHubCheck;
            });
            
            if (newRepos.length > 0) {
                console.log(`✨ Found ${newRepos.length} updated GitHub repositories!`);
                this.notifyNewContent('github', newRepos.length);
                
                // Trigger update event for UI
                window.dispatchEvent(new CustomEvent('new-github-repos', {
                    detail: { newRepos, allRepos: repos }
                }));
            } else {
                console.log('📁 No new GitHub repository updates found');
            }
            
            this.lastCheck.github = new Date().toISOString();
            localStorage.setItem('last_github_check', this.lastCheck.github);
            
        } catch (error) {
            console.error('❌ GitHub check failed:', error);
        }
    }

    /**
     * Get current LinkedIn posts from the data file
     */
    async getCurrentLinkedInPosts() {
        try {
            const response = await fetch('./data/linkedin-posts.json?v=' + Date.now());
            return await response.json();
        } catch (error) {
            console.error('Failed to load current LinkedIn posts:', error);
            return [];
        }
    }

    /**
     * Find new posts by comparing content or URLs
     */
    findNewPosts(newPosts, currentPosts) {
        if (!currentPosts || currentPosts.length === 0) return newPosts;
        
        const currentUrls = new Set(currentPosts.map(post => post.url));
        const currentContents = new Set(currentPosts.map(post => post.content.substring(0, 100)));
        
        return newPosts.filter(post => {
            const contentPreview = post.content.substring(0, 100);
            return !currentUrls.has(post.url) && !currentContents.has(contentPreview);
        });
    }

    /**
     * Show notification for new content
     */
    notifyNewContent(platform, count) {
        const message = `🆕 ${count} new ${platform} ${count === 1 ? 'item' : 'items'} detected!`;
        
        // Browser notification if supported and permitted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`New ${platform.charAt(0).toUpperCase() + platform.slice(1)} Content`, {
                body: message,
                icon: '/images/me1.png',
                tag: `${platform}-update`
            });
        }
        
        // Console notification
        console.log(`📢 ${message}`);
        
        // Custom event for UI updates
        window.dispatchEvent(new CustomEvent('content-notification', {
            detail: { platform, count, message }
        }));
    }

    /**
     * Display current monitoring status
     */
    displayStatus() {
        const now = new Date();
        const isActive = this.isWithinActiveHours();
        const nextCheck = new Date(now.getTime() + this.checkInterval);
        
        console.log('📊 Content Monitor Status:');
        console.log(`   🕐 Current time: ${now.toLocaleTimeString()}`);
        console.log(`   ✅ Active hours: ${this.activeHours.start}:00 - ${this.activeHours.end}:59`);
        console.log(`   🟢 Currently monitoring: ${isActive ? 'Yes' : 'No (outside active hours)'}`);
        console.log(`   ⏰ Next check: ${nextCheck.toLocaleTimeString()}`);
        console.log(`   🔗 Last LinkedIn check: ${new Date(this.lastCheck.linkedin).toLocaleString()}`);
        console.log(`   🐙 Last GitHub check: ${new Date(this.lastCheck.github).toLocaleString()}`);
    }

    /**
     * Manual trigger for immediate check
     */
    async triggerManualCheck() {
        console.log('🔄 Manual content check triggered...');
        await this.performScheduledCheck();
        this.displayStatus();
    }

    /**
     * Request notification permission
     */
    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('✅ Notification permission granted');
                new Notification('Content Monitor Active', {
                    body: 'You will now receive notifications for new content updates',
                    icon: '/images/me1.png'
                });
            } else {
                console.log('❌ Notification permission denied');
            }
        }
    }
}

// Initialize the content monitor when the script loads
const contentMonitor = new ContentMonitor();

// Make it globally available
window.contentMonitor = contentMonitor;

// Auto-request notification permission after 3 seconds
setTimeout(() => {
    contentMonitor.requestNotificationPermission();
}, 3000);

// Listen for visibility changes to pause/resume monitoring
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('🔕 Page hidden, monitoring continues in background');
    } else {
        console.log('👁️ Page visible, checking for missed updates...');
        contentMonitor.checkIfUpdateNeeded();
    }
});

// Add keyboard shortcut for manual check (Ctrl/Cmd + Shift + U)
document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'U') {
        event.preventDefault();
        contentMonitor.triggerManualCheck();
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContentMonitor;
}