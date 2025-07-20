/**
 * Netlify Function for LinkedIn API Sync & GitHub Integration
 * Handles LinkedIn post synchronization and GitHub repository updates
 */

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';
const GITHUB_API_BASE = 'https://api.github.com';

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  try {
    console.log('Starting LinkedIn sync...');
    
    // 1. Fetch LinkedIn posts
    const linkedInPosts = await fetchLinkedInPosts();
    
    if (!linkedInPosts || linkedInPosts.length === 0) {
      throw new Error('No LinkedIn posts retrieved');
    }

    // 2. Process and enhance posts
    const processedPosts = await processLinkedInPosts(linkedInPosts);

    // 3. Update GitHub repository
    const updateResult = await updateGitHubRepo(processedPosts);

    // 4. Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'LinkedIn sync completed successfully',
        postsCount: processedPosts.length,
        timestamp: new Date().toISOString(),
        updateResult
      })
    };

  } catch (error) {
    console.error('LinkedIn sync failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

/**
 * Fetch LinkedIn posts using LinkedIn API v2
 */
async function fetchLinkedInPosts() {
  try {
    // Get user profile first
    const profileResponse = await fetch(`${LINKEDIN_API_BASE}/userinfo`, {
      headers: {
        'Authorization': `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!profileResponse.ok) {
      throw new Error(`LinkedIn API error: ${profileResponse.status}`);
    }

    const profile = await profileResponse.json();
    const personUrn = profile.sub; // OpenID Connect uses 'sub' field for user ID

    // Fetch user's posts/shares
    const postsResponse = await fetch(
      `${LINKEDIN_API_BASE}/shares?q=owners&owners=urn:li:person:${personUrn}&count=50&sortBy=CREATED_TIME`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!postsResponse.ok) {
      throw new Error(`LinkedIn posts API error: ${postsResponse.status}`);
    }

    const postsData = await postsResponse.json();
    return postsData.elements || [];

  } catch (error) {
    console.error('Error fetching LinkedIn posts:', error);
    throw error;
  }
}

/**
 * Process and convert LinkedIn posts to our format
 */
async function processLinkedInPosts(rawPosts) {
  const processedPosts = [];

  for (const post of rawPosts) {
    try {
      // Extract activity ID from post URN
      const activityId = extractActivityId(post.activity);
      
      // Get post content
      const content = extractPostContent(post);
      
      // Generate tags from content
      const tags = generateTags(content);
      
      // Create LinkedIn URL
      const linkedInUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`;
      
      // Get post date
      const date = new Date(post.created?.time || Date.now()).toISOString().split('T')[0];

      processedPosts.push({
        content: content,
        date: date,
        url: linkedInUrl,
        tags: tags,
        activityId: activityId,
        timestamp: post.created?.time
      });

    } catch (error) {
      console.error('Error processing post:', error);
      // Continue with other posts
    }
  }

  // Sort by date (newest first)
  return processedPosts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

/**
 * Extract activity ID from LinkedIn URN
 */
function extractActivityId(activityUrn) {
  if (!activityUrn) return null;
  
  // URN format: urn:li:activity:1234567890
  const match = activityUrn.match(/urn:li:activity:(\d+)/);
  return match ? match[1] : null;
}

/**
 * Extract post content text
 */
function extractPostContent(post) {
  // Check different possible content fields
  if (post.text?.text) {
    return post.text.text;
  }
  
  if (post.content?.title) {
    return post.content.title;
  }
  
  if (post.commentary) {
    return post.commentary;
  }
  
  return 'LinkedIn post content';
}

/**
 * Generate tags from post content
 */
function generateTags(content) {
  const tags = [];
  const lowercaseContent = content.toLowerCase();
  
  // Technical tags
  const techKeywords = {
    'java': 'Java',
    'spring boot': 'SpringBoot', 
    'react': 'React',
    'kubernetes': 'Kubernetes',
    'docker': 'Docker',
    'aws': 'AWS',
    'azure': 'Azure',
    'linkedin': 'LinkedIn',
    'github': 'GitHub',
    'api': 'API',
    'microservices': 'Microservices',
    'ai': 'AI',
    'machine learning': 'MachineLearning',
    'cloud': 'Cloud',
    'database': 'Database',
    'postgresql': 'PostgreSQL',
    'mysql': 'MySQL',
    'mongodb': 'MongoDB'
  };

  // Business tags
  const businessKeywords = {
    'consulting': 'Consulting',
    'business': 'Business',
    'enterprise': 'Enterprise',
    'strategy': 'Strategy',
    'innovation': 'Innovation',
    'digital transformation': 'DigitalTransformation',
    'china': 'China',
    'sweden': 'Sweden',
    'international': 'International',
    'cross-cultural': 'CrossCultural'
  };

  const allKeywords = { ...techKeywords, ...businessKeywords };

  for (const [keyword, tag] of Object.entries(allKeywords)) {
    if (lowercaseContent.includes(keyword)) {
      tags.push(tag);
    }
  }

  return tags.length > 0 ? tags : ['TechUpdate'];
}

/**
 * Update GitHub repository with new posts
 */
async function updateGitHubRepo(posts) {
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
        message: '🤖 Automated LinkedIn posts sync via Netlify Function',
        content: encodedContent,
        sha: currentFile.sha,
        committer: {
          name: 'LinkedIn Sync Bot',
          email: 'bot@bluehawana.com'
        }
      })
    });

    if (!updateResponse.ok) {
      throw new Error(`GitHub update failed: ${updateResponse.status}`);
    }

    const updateResult = await updateResponse.json();
    return {
      success: true,
      postsUpdated: mergedPosts.length,
      newPosts: posts.length,
      commitSha: updateResult.commit.sha
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
      existing.content === newPost.content
    );
    
    if (!exists) {
      merged.unshift(newPost); // Add to beginning (newest first)
    }
  }
  
  // Limit to most recent 20 posts
  return merged.slice(0, 20);
}