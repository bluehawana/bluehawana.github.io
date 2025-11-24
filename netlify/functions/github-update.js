/**
 * Netlify Function for Manual GitHub Repository Updates
 * Allows manual posting of LinkedIn content to GitHub repository
 */

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const { posts } = JSON.parse(event.body);
    
    if (!posts || !Array.isArray(posts)) {
      throw new Error('Invalid posts data provided');
    }

    // Update GitHub repository
    const result = await updateGitHubRepo(posts);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('GitHub update failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

/**
 * Update GitHub repository with provided posts
 */
async function updateGitHubRepo(posts) {
  const GITHUB_API_BASE = 'https://api.github.com';
  const repoPath = `repos/${process.env.GITHUB_REPO}/contents/data/linkedin-posts.json`;
  
  try {
    // 1. Get current file content and SHA
    const currentFileResponse = await fetch(`${GITHUB_API_BASE}/${repoPath}`, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!currentFileResponse.ok) {
      throw new Error(`GitHub API error: ${currentFileResponse.status}`);
    }

    const currentFile = await currentFileResponse.json();
    const currentContent = JSON.parse(Buffer.from(currentFile.content, 'base64').toString());

    // 2. Merge new posts with existing ones (avoid duplicates)
    const mergedPosts = mergePostsWithoutDuplicates(currentContent, posts);

    // 3. Create updated content
    const updatedContent = JSON.stringify(mergedPosts, null, 2);
    const encodedContent = Buffer.from(updatedContent).toString('base64');

    // 4. Update file in GitHub
    const updateResponse = await fetch(`${GITHUB_API_BASE}/${repoPath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: '🔄 Manual LinkedIn posts update via Netlify Function',
        content: encodedContent,
        sha: currentFile.sha,
        committer: {
          name: 'Manual Update Bot',
          email: 'manual-update@bluehawana.com'
        }
      })
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`GitHub update failed: ${updateResponse.status} - ${errorText}`);
    }

    const updateResult = await updateResponse.json();
    return {
      success: true,
      postsUpdated: mergedPosts.length,
      newPosts: posts.length,
      commitSha: updateResult.commit.sha,
      commitUrl: updateResult.commit.html_url,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('GitHub update error:', error);
    throw error;
  }
}

/**
 * Merge new posts with existing ones, avoiding duplicates
 */
function mergePostsWithoutDuplicates(existingPosts, newPosts) {
  const merged = [...existingPosts];
  
  for (const newPost of newPosts) {
    // Check if post already exists (by activity ID or content similarity)
    const exists = merged.some(existing => 
      existing.activityId === newPost.activityId ||
      existing.content === newPost.content ||
      existing.url === newPost.url
    );
    
    if (!exists) {
      merged.unshift(newPost); // Add to beginning (newest first)
    }
  }
  
  // Limit to most recent 25 posts
  return merged.slice(0, 25);
}