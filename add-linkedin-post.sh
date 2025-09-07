#!/bin/bash

# Quick LinkedIn Post Adder
# Usage: ./add-linkedin-post.sh "https://linkedin.com/post-url"

if [ $# -eq 0 ]; then
    echo "🚀 Quick LinkedIn Post Adder"
    echo ""
    echo "Usage: ./add-linkedin-post.sh \"<linkedin-url>\""
    echo ""
    echo "Example:"
    echo "  ./add-linkedin-post.sh \"https://www.linkedin.com/feed/update/urn:li:activity:1234567890/\""
    exit 1
fi

URL="$1"

echo "🔄 Adding LinkedIn post to your blog..."
echo "📋 URL: $URL"

# Extract and add the post
node linkedin-post-extractor.js "$URL"

if [ $? -eq 0 ]; then
    echo ""
    echo "🔄 Committing to git..."
    
    # Add and commit the changes
    git add data/linkedin-posts.json
    git commit -m "Add LinkedIn post via auto-extraction

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    
    # Push to trigger deployment
    git push
    
    echo ""
    echo "🎉 Done! Your post is now live on bluehawana.com"
    echo "🌐 Visit: https://bluehawana.com/pages/blog"
else
    echo "❌ Failed to add post"
    exit 1
fi