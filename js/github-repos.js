/**
 * Fetch latest GitHub repositories for bluehawana
 */
async function fetchLatestRepos() {
    try {
        const response = await fetch('https://api.github.com/users/bluehawana/repos?sort=updated&per_page=5');
        const repos = await response.json();
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }
        
        const repoContainer = document.getElementById('github-repos');
        if (!repoContainer) return;
        
        repoContainer.innerHTML = '';
        
        repos.forEach(repo => {
            const repoElement = document.createElement('div');
            repoElement.className = 'repo-item';
            
            // Skip forked repos and focus on original work
            if (repo.fork) return;
            
            repoElement.innerHTML = `
                <div class="repo-card">
                    <h4><a href="${repo.html_url}" target="_blank">${repo.name}</a></h4>
                    <p class="repo-description">${repo.description || 'No description available'}</p>
                    <div class="repo-meta">
                        <span class="language">${repo.language || 'Unknown'}</span>
                        <span class="stars">⭐ ${repo.stargazers_count}</span>
                        <span class="updated">Updated: ${new Date(repo.updated_at).toLocaleDateString()}</span>
                    </div>
                </div>
            `;
            
            repoContainer.appendChild(repoElement);
        });
        
    } catch (error) {
        console.error('Error fetching GitHub repos:', error);
        const repoContainer = document.getElementById('github-repos');
        if (repoContainer) {
            repoContainer.innerHTML = '<p>Unable to load repositories at this time.</p>';
        }
    }
}

// Auto-load when page loads
document.addEventListener('DOMContentLoaded', fetchLatestRepos);