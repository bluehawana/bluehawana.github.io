#!/bin/bash

# Script to easily update LinkedIn posts
# Usage: ./update-linkedin.sh "Your new LinkedIn post content here" "Category1,Category2"

if [ $# -eq 0 ]; then
    echo "Usage: $0 \"Your LinkedIn post content\" \"tag1,tag2,tag3\""
    echo "Example: $0 \"Just deployed a new React app with TypeScript!\" \"React,TypeScript,WebDev\""
    exit 1
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