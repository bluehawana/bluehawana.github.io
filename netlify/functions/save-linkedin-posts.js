/**
 * Netlify Function to save LinkedIn posts
 * Handles POST requests to update the LinkedIn posts JSON file
 */

const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
        // Parse the request body
        const posts = JSON.parse(event.body);
        
        // Validate the posts data
        if (!Array.isArray(posts)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Posts must be an array' })
            };
        }

        // Validate each post has required fields
        for (const post of posts) {
            if (!post.content || !post.date || !post.url) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Each post must have content, date, and url' })
                };
            }
        }

        // Add timestamp for tracking
        const updatedData = {
            lastUpdated: new Date().toISOString(),
            posts: posts.slice(0, 10) // Limit to 10 most recent posts
        };

        // In Netlify Functions, we can't write to the file system directly
        // Instead, we'll return the data and let the client handle it
        // For a full solution, you'd need to integrate with GitHub API or a database

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Posts processed successfully',
                data: updatedData,
                note: 'File system write not available in Netlify Functions. Consider using GitHub API or database.'
            })
        };

    } catch (error) {
        console.error('Error processing LinkedIn posts:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};