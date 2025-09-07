#!/bin/bash
# LinkedIn Auto-Sync Service
# Run this script to start local monitoring

echo "🤖 Starting LinkedIn Auto-Sync Service..."
echo "========================================"

# Install dependencies if needed
if [ ! -d "node_modules/puppeteer-core" ]; then
    echo "📦 Installing dependencies..."
    npm install --save-dev puppeteer-core
fi

# Start the monitoring service
echo "🔄 Starting automated LinkedIn monitoring..."
echo "💡 Your website will update automatically when you post on LinkedIn"
echo "🛑 Press Ctrl+C to stop monitoring"
echo ""

node automated-linkedin-sync.js