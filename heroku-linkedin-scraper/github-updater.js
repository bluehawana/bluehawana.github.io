/**
 * GitHub Repository Updater
 * Automatically commits scraped LinkedIn posts to your GitHub repo
 */

const { Octokit } = require('@octokit/rest');
const simpleGit = require('simple-git');

class GitHubUpdater {
    constructor() {
        this.octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });
        
        this.repoOwner = process.env.GITHUB_REPO_OWNER || 'bluehawana';
        this.repoName = process.env.GITHUB_REPO_NAME || 'bluehawana.github.io';
        this.filePath = 'data/linkedin-posts.json';
        this.branch = 'main';
    }

    /**
     * Update GitHub repository with new posts
     */
    async updateRepository(newPosts) {
        try {
            console.log(`🔄 Updating GitHub repo: ${this.repoOwner}/${this.repoName}`);
            
            // Step 1: Get current file content
            const currentContent = await this.getCurrentFileContent();
            
            // Step 2: Merge new posts with existing ones
            const mergedPosts = this.mergePosts(currentContent, newPosts);
            
            // Step 3: Check if there are actual changes
            if (this.postsAreEqual(currentContent, mergedPosts)) {
                console.log('📝 No new posts to update');
                return {
                    updated: false,
                    message: 'No changes detected'
                };
            }
            
            // Step 4: Update the file
            const updateResult = await this.updateFile(mergedPosts);
            
            console.log('✅ GitHub repository updated successfully');
            return {
                updated: true,
                newPosts: newPosts.length,
                totalPosts: mergedPosts.length,
                commitSha: updateResult.commit.sha,
                message: 'Repository updated with new LinkedIn posts'
            };
            
        } catch (error) {
            console.error('❌ GitHub update failed:', error);
            throw error;
        }
    }

    /**
     * Get current file content from GitHub
     */
    async getCurrentFileContent() {
        try {
            const response = await this.octokit.repos.getContent({
                owner: this.repoOwner,
                repo: this.repoName,
                path: this.filePath,
                ref: this.branch
            });
            
            const content = Buffer.from(response.data.content, 'base64').toString('utf8');
            return JSON.parse(content);
            
        } catch (error) {
            if (error.status === 404) {
                console.log('📄 File does not exist, will create new one');
                return [];
            }
            throw error;
        }
    }

    /**
     * Merge new posts with existing posts
     */
    mergePosts(existingPosts, newPosts) {
        if (!Array.isArray(existingPosts)) existingPosts = [];
        if (!Array.isArray(newPosts)) newPosts = [];
        
        // Create a map of existing posts by content hash for deduplication
        const existingPostsMap = new Map();
        existingPosts.forEach(post => {
            const hash = this.generatePostHash(post);
            existingPostsMap.set(hash, post);
        });
        
        // Add new posts if they don't already exist
        newPosts.forEach(post => {
            const hash = this.generatePostHash(post);
            if (!existingPostsMap.has(hash)) {
                existingPostsMap.set(hash, post);
            }
        });
        
        // Convert back to array and sort by date (newest first)
        const mergedPosts = Array.from(existingPostsMap.values())
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10); // Keep only 10 most recent posts
        
        return mergedPosts;
    }

    /**
     * Generate a hash for post deduplication
     */
    generatePostHash(post) {
        const content = (post.content || '').substring(0, 100).toLowerCase().trim();
        const date = post.date || '';
        return `${content}-${date}`.replace(/[^a-z0-9-]/g, '');
    }

    /**
     * Check if posts arrays are equal
     */
    postsAreEqual(posts1, posts2) {
        if (!Array.isArray(posts1) || !Array.isArray(posts2)) return false;
        if (posts1.length !== posts2.length) return false;
        
        const hashes1 = posts1.map(post => this.generatePostHash(post)).sort();
        const hashes2 = posts2.map(post => this.generatePostHash(post)).sort();
        
        return JSON.stringify(hashes1) === JSON.stringify(hashes2);
    }

    /**
     * Update file in GitHub repository
     */
    async updateFile(posts) {
        try {
            // Get current file SHA for update
            let fileSha = null;
            try {
                const currentFile = await this.octokit.repos.getContent({
                    owner: this.repoOwner,
                    repo: this.repoName,
                    path: this.filePath,
                    ref: this.branch
                });
                fileSha = currentFile.data.sha;
            } catch (error) {
                // File doesn't exist, will create new one
                console.log('📄 Creating new file');
            }
            
            // Prepare content
            const content = JSON.stringify(posts, null, 2);
            const encodedContent = Buffer.from(content).toString('base64');
            
            // Commit message
            const commitMessage = `🔄 Auto-update LinkedIn posts - ${new Date().toISOString().split('T')[0]}

- Found ${posts.length} posts
- Automated sync from Heroku scraper
- Last update: ${new Date().toLocaleString('sv-SE')}`;
            
            // Update or create file
            const updateParams = {
                owner: this.repoOwner,
                repo: this.repoName,
                path: this.filePath,
                message: commitMessage,
                content: encodedContent,
                branch: this.branch
            };
            
            if (fileSha) {
                updateParams.sha = fileSha;
            }
            
            const response = await this.octokit.repos.createOrUpdateFileContents(updateParams);
            
            console.log(`✅ File updated: ${response.data.commit.html_url}`);
            return response.data;
            
        } catch (error) {
            console.error('❌ File update failed:', error);
            throw error;
        }
    }

    /**
     * Create a pull request instead of direct commit (optional safer approach)
     */
    async createPullRequest(posts) {
        try {
            const branchName = `linkedin-update-${Date.now()}`;
            
            // Create new branch
            const mainBranch = await this.octokit.repos.getBranch({
                owner: this.repoOwner,
                repo: this.repoName,
                branch: this.branch
            });
            
            await this.octokit.git.createRef({
                owner: this.repoOwner,
                repo: this.repoName,
                ref: `refs/heads/${branchName}`,
                sha: mainBranch.data.commit.sha
            });
            
            // Update file in new branch
            const content = JSON.stringify(posts, null, 2);
            const encodedContent = Buffer.from(content).toString('base64');
            
            await this.octokit.repos.createOrUpdateFileContents({
                owner: this.repoOwner,
                repo: this.repoName,
                path: this.filePath,
                message: `Auto-update LinkedIn posts - ${new Date().toISOString()}`,
                content: encodedContent,
                branch: branchName
            });
            
            // Create pull request
            const pr = await this.octokit.pulls.create({
                owner: this.repoOwner,
                repo: this.repoName,
                title: `🔄 Auto-update LinkedIn posts`,
                head: branchName,
                base: this.branch,
                body: `Automated LinkedIn posts update from Heroku scraper.\n\nFound ${posts.length} posts.\n\nGenerated at: ${new Date().toISOString()}`
            });
            
            console.log(`✅ Pull request created: ${pr.data.html_url}`);
            return pr.data;
            
        } catch (error) {
            console.error('❌ Pull request creation failed:', error);
            throw error;
        }
    }

    /**
     * Test GitHub connection
     */
    async testConnection() {
        try {
            const response = await this.octokit.repos.get({
                owner: this.repoOwner,
                repo: this.repoName
            });
            
            console.log(`✅ GitHub connection successful: ${response.data.full_name}`);
            return true;
        } catch (error) {
            console.error('❌ GitHub connection failed:', error);
            return false;
        }
    }
}

/**
 * Main export function
 */
async function updateGitHubRepo(posts) {
    const updater = new GitHubUpdater();
    return await updater.updateRepository(posts);
}

module.exports = {
    updateGitHubRepo,
    GitHubUpdater
};