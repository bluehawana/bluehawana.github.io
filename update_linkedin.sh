#!/bin/bash

# Enhanced LinkedIn Posts Update Script
# Usage: ./update-linkedin.sh "Your new LinkedIn post content here" "Category1,Category2" [url]

if [ $# -eq 0 ]; then
    echo "🔗 LinkedIn Posts Update Script"
    echo "Usage: $0 \"Your LinkedIn post content\" \"tag1,tag2,tag3\" [linkedin_url]"
    echo ""
    echo "Examples:"
    echo "  $0 \"Just deployed a new React app with TypeScript!\" \"React,TypeScript,WebDev\""
    echo "  $0 \"Great meeting with clients today\" \"Business,Consulting\" \"https://www.linkedin.com/feed/update/urn:li:activity:123456789/\""
    echo ""
    echo "🚀 Quick Actions:"
    echo "  ./update-linkedin.sh --sync    # Sync from RSS feed"
    echo "  ./update-linkedin.sh --admin   # Open admin interface"
    echo "  ./update-linkedin.sh --status  # Show current posts"
    exit 1
fi

# Handle special commands
if [ "$1" = "--sync" ]; then
    echo "🔄 Attempting LinkedIn RSS sync..."
    
    # Try RSS2JSON service
    RSS_RESPONSE=$(curl -s "https://api.rss2json.com/v1/api.json?rss_url=https://www.linkedin.com/in/hzl/recent-activity/")
    
    if echo "$RSS_RESPONSE" | grep -q '"status":"ok"'; then
        echo "✅ RSS feed accessible, but LinkedIn has restricted content"
        echo "📝 Please use manual method instead:"
        echo "   ./update_linkedin.sh \"Your latest post content\" \"tags\""
    else
        echo "⚠️ RSS sync not available - LinkedIn has restricted RSS feeds"
        echo ""
        echo "🔧 Alternative methods:"
        echo "1. Manual update: ./update_linkedin.sh \"post content\" \"tags\""
        echo "2. Admin interface: ./update_linkedin.sh --admin"
        echo "3. Direct edit: edit data/linkedin-posts.json"
    fi
    exit 0
fi

if [ "$1" = "--admin" ]; then
    echo "🔧 Opening LinkedIn admin interface..."
    if command -v open &> /dev/null; then
        open "pages/linkedin-admin.html"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "pages/linkedin-admin.html"
    else
        echo "Please open pages/linkedin-admin.html in your browser"
    fi
    exit 0
fi

if [ "$1" = "--status" ]; then
    echo "📊 Current LinkedIn Posts Status:"
    if [ -f "data/linkedin-posts.json" ]; then
        echo "Posts count: $(jq length data/linkedin-posts.json)"
        echo "Latest post: $(jq -r '.[0].content[0:100]' data/linkedin-posts.json)..."
        echo "Last update: $(jq -r '.[0].date' data/linkedin-posts.json)"
    else
        echo "No posts file found"
    fi
    exit 0
fi

CONTENT="$1"
TAGS="$2"
DATE=$(date +%Y-%m-%d)

# Convert comma-separated tags to JSON array
if [ -n "$TAGS" ]; then
    TAGS_JSON=$(echo "$TAGS" | sed 's/,/","/g' | sed 's/^/"/' | sed 's/$/"/')
    TAGS_JSON="[$TAGS_JSON]"
else
    TAGS_JSON='["Update"]'
fi

# Read existing posts
if [ -f "data/linkedin-posts.json" ]; then
    EXISTING_POSTS=$(cat data/linkedin-posts.json)
else
    EXISTING_POSTS="[]"
fi

# Create new post
NEW_POST=$(cat << EOF
{
  "content": "$CONTENT",
  "date": "$DATE",
  "url": "https://www.linkedin.com/in/hzl",
  "tags": $TAGS_JSON
}
EOF
)

# Add new post to beginning and keep only latest 5
UPDATED_POSTS=$(echo "$EXISTING_POSTS" | jq --argjson new_post "$NEW_POST" '. = [$new_post] + . | .[0:5]')

# Write back to file
echo "$UPDATED_POSTS" > data/linkedin-posts.json

echo "✅ LinkedIn post added successfully!"
echo "📝 Content: $CONTENT"
echo "🏷️  Tags: $TAGS"
echo "📅 Date: $DATE"
echo ""
echo "💡 To publish: git add data/linkedin-posts.json && git commit -m 'Add new LinkedIn post' && git push"