/**
 * Cloudflare Worker for LinkedIn API Sync & GitHub Integration
 * Deploy this to Cloudflare Workers to handle LinkedIn automation
 * 
 * Environment Variables needed in Cloudflare:
 * - LINKEDIN_CLIENT_ID
 * - LINKEDIN_CLIENT_SECRET  
 * - LINKEDIN_ACCESS_TOKEN
 * - GITHUB_TOKEN
 * - GITHUB_REPO (bluehawana/bluehawana.github.io)
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for browser requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      switch (path) {
        case '/linkedin-sync':
          return await handleLinkedInSync(env, corsHeaders);
        case '/github-update':
          return await handleGitHubUpdate(request, env, corsHeaders);
        case '/automation-status':
          return await handleAutomationStatus(env, corsHeaders);
        case '/webhook/linkedin':
          return await handleLinkedInWebhook(request, env, corsHeaders);
        default:
          return new Response('Worker Online - Available endpoints: /linkedin-sync, /github-update, /automation-status', {
            headers: corsHeaders
          });
      }
    } catch (error) {
      console.error('Worker Error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * Sync LinkedIn posts and update GitHub repository
 */
async function handleLinkedInSync(env, corsHeaders) {
  console.log('Starting LinkedIn sync...');
  
  try {
    // 1. Fetch LinkedIn posts
    const linkedInPosts = await fetchLinkedInPosts(env);
    
    if (!linkedInPosts || linkedInPosts.length === 0) {
      throw new Error('No LinkedIn posts retrieved');
    }

    // 2. Process and enhance posts
    const processedPosts = await processLinkedInPosts(linkedInPosts);

    // 3. Update GitHub repository
    const updateResult = await updateGitHubRepo(processedPosts, env);

    // 4. Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'LinkedIn sync completed successfully',
      postsCount: processedPosts.length,
      timestamp: new Date().toISOString(),
      updateResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('LinkedIn sync failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Fetch LinkedIn posts using LinkedIn API v2
 */
async function fetchLinkedInPosts(env) {
  const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';
  
  try {
    // Get user profile first
    const profileResponse = await fetch(`${LINKEDIN_API_BASE}/people/~`, {
      headers: {
        'Authorization': `Bearer ${env.LINKEDIN_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!profileResponse.ok) {
      throw new Error(`LinkedIn API error: ${profileResponse.status}`);
    }

    const profile = await profileResponse.json();
    const personUrn = profile.id;

    // Fetch user's posts/shares
    const postsResponse = await fetch(
      `${LINKEDIN_API_BASE}/shares?q=owners&owners=urn:li:person:${personUrn}&count=50&sortBy=CREATED_TIME`,
      {
        headers: {
          'Authorization': `Bearer ${env.LINKEDIN_ACCESS_TOKEN}`,
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
async function updateGitHubRepo(posts, env) {
  const GITHUB_API_BASE = 'https://api.github.com';
  const repoPath = `repos/${env.GITHUB_REPO}/contents/data/linkedin-posts.json`;
  
  try {
    // 1. Get current file content and SHA
    const currentFileResponse = await fetch(`${GITHUB_API_BASE}/${repoPath}`, {
      headers: {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!currentFileResponse.ok) {
      throw new Error(`GitHub API error: ${currentFileResponse.status}`);
    }

    const currentFile = await currentFileResponse.json();
    const currentContent = JSON.parse(atob(currentFile.content));

    // 2. Merge new posts with existing ones (avoid duplicates)
    const mergedPosts = mergePostsWithoutDuplicates(currentContent, posts);

    // 3. Create updated content
    const updatedContent = JSON.stringify(mergedPosts, null, 2);
    const encodedContent = btoa(updatedContent);

    // 4. Update file in GitHub
    const updateResponse = await fetch(`${GITHUB_API_BASE}/${repoPath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: '🤖 Automated LinkedIn posts sync via Cloudflare Worker',
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

    return {
      success: true,
      postsUpdated: mergedPosts.length,
      newPosts: posts.length,
      commitSha: (await updateResponse.json()).commit.sha
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

/**
 * Handle GitHub update requests
 */
async function handleGitHubUpdate(request, env, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { posts } = await request.json();
    const result = await updateGitHubRepo(posts, env);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle automation status requests
 */
async function handleAutomationStatus(env, corsHeaders) {
  try {
    // Check LinkedIn API status
    const linkedInStatus = await checkLinkedInAPIStatus(env);
    
    // Check GitHub API status  
    const gitHubStatus = await checkGitHubAPIStatus(env);
    
    const status = {
      timestamp: new Date().toISOString(),
      linkedIn: linkedInStatus,
      gitHub: gitHubStatus,
      worker: {
        status: 'operational',
        version: '1.0.0',
        region: 'cloudflare-edge'
      }
    };

    return new Response(JSON.stringify(status), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Check LinkedIn API connectivity
 */
async function checkLinkedInAPIStatus(env) {
  try {
    const response = await fetch('https://api.linkedin.com/v2/people/~', {
      headers: {
        'Authorization': `Bearer ${env.LINKEDIN_ACCESS_TOKEN}`
      }
    });
    
    return {
      status: response.ok ? 'connected' : 'error',
      statusCode: response.status,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Check GitHub API connectivity
 */
async function checkGitHubAPIStatus(env) {
  try {
    const response = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}`, {
      headers: {
        'Authorization': `token ${env.GITHUB_TOKEN}`
      }
    });
    
    return {
      status: response.ok ? 'connected' : 'error',
      statusCode: response.status,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Handle LinkedIn webhook notifications (for real-time updates)
 */
async function handleLinkedInWebhook(request, env, corsHeaders) {
  try {
    const webhook = await request.json();
    
    // Trigger sync when new LinkedIn activity is detected
    if (webhook.eventType === 'SHARE' || webhook.eventType === 'POST') {
      console.log('LinkedIn webhook triggered, starting sync...');
      return await handleLinkedInSync(env, corsHeaders);
    }
    
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}