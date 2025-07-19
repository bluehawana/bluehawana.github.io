/**
 * Netlify Function for Automation Status Monitoring
 * Checks LinkedIn API, GitHub API connectivity and system health
 */

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    // Check LinkedIn API status
    const linkedInStatus = await checkLinkedInAPIStatus();
    
    // Check GitHub API status  
    const gitHubStatus = await checkGitHubAPIStatus();
    
    // Check Netlify function status
    const netlifyStatus = {
      status: 'operational',
      version: '1.0.0',
      platform: 'netlify-functions',
      region: context.region || 'unknown',
      timestamp: new Date().toISOString()
    };

    const status = {
      timestamp: new Date().toISOString(),
      linkedIn: linkedInStatus,
      gitHub: gitHubStatus,
      netlify: netlifyStatus,
      overall: determineOverallStatus(linkedInStatus, gitHubStatus)
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(status)
    };

  } catch (error) {
    console.error('Status check failed:', error);
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
 * Check LinkedIn API connectivity
 */
async function checkLinkedInAPIStatus() {
  try {
    const response = await fetch('https://api.linkedin.com/v2/people/~', {
      headers: {
        'Authorization': `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
        'Accept': 'application/json'
      }
    });
    
    return {
      status: response.ok ? 'connected' : 'error',
      statusCode: response.status,
      lastChecked: new Date().toISOString(),
      hasToken: !!process.env.LINKEDIN_ACCESS_TOKEN
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      lastChecked: new Date().toISOString(),
      hasToken: !!process.env.LINKEDIN_ACCESS_TOKEN
    };
  }
}

/**
 * Check GitHub API connectivity
 */
async function checkGitHubAPIStatus() {
  try {
    const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO}`, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    return {
      status: response.ok ? 'connected' : 'error',
      statusCode: response.status,
      lastChecked: new Date().toISOString(),
      repository: process.env.GITHUB_REPO,
      hasToken: !!process.env.GITHUB_TOKEN
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      lastChecked: new Date().toISOString(),
      repository: process.env.GITHUB_REPO,
      hasToken: !!process.env.GITHUB_TOKEN
    };
  }
}

/**
 * Determine overall system status
 */
function determineOverallStatus(linkedInStatus, gitHubStatus) {
  if (linkedInStatus.status === 'connected' && gitHubStatus.status === 'connected') {
    return 'operational';
  } else if (linkedInStatus.status === 'error' && gitHubStatus.status === 'error') {
    return 'major_outage';
  } else {
    return 'partial_outage';
  }
}