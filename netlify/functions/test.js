exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'Test function works!',
      timestamp: new Date().toISOString(),
      functions_directory: 'netlify/functions'
    })
  };
};