#!/bin/bash

# Manual LinkedIn Sync Script
# Run this whenever you want to sync your latest LinkedIn posts

echo "🔗 Manual LinkedIn Post Sync"
echo "=============================="

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local file not found"
    echo "   Please create it from .env.example and add your API key"
    exit 1
fi

# Run the sync
echo "🚀 Running LinkedIn sync..."
node automated-linkedin-sync.js sync

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Sync completed successfully!"
    echo "📝 Check your blog at: bluehawana.com/pages/blog"
    
    # Auto-commit and push changes
    echo "📤 Committing changes to git..."
    git add -A
    git commit -m "📝 Manual LinkedIn sync - $(date)"
    git push origin main
    echo "🚀 Changes pushed to GitHub - website will rebuild!"
else
    echo ""
    echo "❌ Sync failed - check the error messages above"
    exit 1
fi