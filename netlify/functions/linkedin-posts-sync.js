/**
 * LinkedIn Posts Sync Function (Fully Automated)
 * Uses third-party APIs for true automation - NO MANUAL INTERVENTION
 */

const { AutomatedLinkedInSync } = require('../../automated-linkedin-sync');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🚀 Starting automated LinkedIn sync via Netlify function...');
    
    // Create automated sync instance
    const sync = new AutomatedLinkedInSync();
    
    // Perform full automated sync
    const result = await sync.performSync();
    
    if (result.success) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          ...result,
          syncTime: new Date().toISOString(),
          method: 'Fully Automated',
          message: result.newPosts > 0 
            ? `🎉 Successfully synced ${result.newPosts} new LinkedIn posts to blog!`
            : '✅ All LinkedIn posts are up to date'
        })
      };
    } else {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          ...result,
          syncTime: new Date().toISOString(),
          method: 'Fully Automated'
        })
      };
    }

  } catch (error) {
    console.error('🔥 Automated sync failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'automation_failed',
        message: 'Automated LinkedIn sync failed',
        details: error.message,
        recommendations: [
          'Check if third-party API keys are configured',
          'Verify API rate limits haven\'t been exceeded', 
          'Check network connectivity to third-party services',
          'Review sync logs for detailed error information'
        ],
        syncTime: new Date().toISOString()
      })
    };
  }
};

// This function now uses the fully automated sync system
// No more manual intervention required!