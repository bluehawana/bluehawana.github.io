/**
 * LinkedIn w_member_social Scope Testing Function
 * Tests what endpoints are accessible with the limited scope
 */

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

  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  
  if (!accessToken) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'LinkedIn access token not configured',
        timestamp: new Date().toISOString()
      })
    };
  }

  // Test results
  const results = {
    timestamp: new Date().toISOString(),
    scope: 'w_member_social',
    tests: []
  };

  // Endpoints to test with w_member_social scope
  const endpoints = [
    {
      name: 'OAuth2 Userinfo',
      url: 'https://api.linkedin.com/v2/userinfo',
      description: 'Basic user information via OpenID Connect'
    },
    {
      name: 'Me Endpoint',
      url: 'https://api.linkedin.com/v2/me',
      description: 'Current user profile (deprecated but sometimes works)'
    },
    {
      name: 'Email Address',
      url: 'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
      description: 'User email address'
    },
    {
      name: 'Profile Picture',
      url: 'https://api.linkedin.com/v2/me?projection=(id,profilePicture(displayImage~digitalmediaAsset:playableStreams))',
      description: 'Profile picture information'
    },
    {
      name: 'Share Creation Test',
      url: 'https://api.linkedin.com/v2/shares',
      method: 'POST',
      description: 'Test ability to create shares (w_member_social primary purpose)',
      testData: {
        distribution: {
          linkedInDistributionTarget: {}
        },
        text: {
          text: 'Test post from w_member_social scope testing'
        }
      },
      skipActualPost: true // Don't actually post, just test access
    },
    {
      name: 'UGC Post Creation Test',
      url: 'https://api.linkedin.com/v2/ugcPosts',
      method: 'POST',
      description: 'Test ability to create UGC posts',
      skipActualPost: true
    },
    {
      name: 'Posts API (Read)',
      url: 'https://api.linkedin.com/v2/posts?q=author&author=me',
      description: 'Attempt to read own posts'
    },
    {
      name: 'Shares API (Read)',
      url: 'https://api.linkedin.com/v2/shares?q=owners&owners=me',
      description: 'Attempt to read own shares'
    },
    {
      name: 'Activities API',
      url: 'https://api.linkedin.com/v2/activities?q=member',
      description: 'Attempt to read activities'
    },
    {
      name: 'Social Actions',
      url: 'https://api.linkedin.com/v2/socialActions',
      description: 'Social actions endpoint'
    }
  ];

  // Test each endpoint
  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint.name}`);
    
    try {
      const options = {
        method: endpoint.method || 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202406'
        }
      };

      // For POST requests that we want to test but not execute
      if (endpoint.method === 'POST' && endpoint.skipActualPost) {
        // Just test with OPTIONS to see if endpoint exists
        options.method = 'OPTIONS';
      }

      const response = await fetch(endpoint.url, options);
      
      const result = {
        endpoint: endpoint.name,
        url: endpoint.url,
        method: options.method,
        status: response.status,
        statusText: response.statusText,
        accessible: response.status === 200 || response.status === 201,
        description: endpoint.description
      };

      // Get response body if possible
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          result.response = data;
          
          // Extract useful information
          if (data.id) result.userId = data.id;
          if (data.sub) result.userSub = data.sub;
          if (data.email) result.email = data.email;
        } else {
          result.response = await response.text();
        }
      } catch (e) {
        result.response = 'Could not parse response';
      }

      results.tests.push(result);
      
    } catch (error) {
      results.tests.push({
        endpoint: endpoint.name,
        url: endpoint.url,
        error: error.message,
        accessible: false,
        description: endpoint.description
      });
    }
  }

  // Analyze results
  const analysis = analyzeResults(results.tests);
  results.analysis = analysis;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(results, null, 2)
  };
};

/**
 * Analyze test results and provide recommendations
 */
function analyzeResults(tests) {
  const accessible = tests.filter(t => t.accessible);
  const notAccessible = tests.filter(t => !t.accessible);
  
  const analysis = {
    summary: `${accessible.length} of ${tests.length} endpoints accessible with w_member_social`,
    accessibleEndpoints: accessible.map(t => t.endpoint),
    recommendations: []
  };

  // Check for user identification
  const hasUserInfo = tests.some(t => t.userId || t.userSub || t.email);
  if (!hasUserInfo) {
    analysis.recommendations.push(
      'Cannot retrieve user information with w_member_social alone. Consider adding "Sign In with LinkedIn" product for openid/profile scopes.'
    );
  }

  // Check for post creation ability
  const canCreatePosts = tests.some(t => 
    (t.endpoint.includes('Share Creation') || t.endpoint.includes('UGC Post')) && 
    (t.status === 200 || t.status === 403)
  );
  
  if (canCreatePosts) {
    analysis.recommendations.push(
      'Can create posts with w_member_social scope, but need user ID from profile/openid scopes.'
    );
  }

  // Check for read access
  const canReadPosts = tests.some(t => 
    t.endpoint.includes('Read') && t.accessible
  );
  
  if (!canReadPosts) {
    analysis.recommendations.push(
      'Cannot read posts with w_member_social. Use web scraping or manual activity ID collection as fallback.'
    );
  }

  // Overall recommendation
  if (accessible.length === 0) {
    analysis.recommendations.push(
      'Token might be invalid or expired. Regenerate access token with proper scopes.'
    );
  } else {
    analysis.recommendations.push(
      'w_member_social is working but limited. Implement hybrid approach: use API for posting, web scraping for reading.'
    );
  }

  return analysis;
}