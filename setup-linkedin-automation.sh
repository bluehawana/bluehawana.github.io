#!/bin/bash

# LinkedIn RapidAPI Automation Setup Script
# This script sets up the 6-hour scheduled sync for LinkedIn posts

echo "🔧 Setting up LinkedIn RapidAPI Automation..."

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

echo "📁 Project directory: $PROJECT_DIR"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if the sync script exists
if [ ! -f "$PROJECT_DIR/linkedin-rapidapi-sync.js" ]; then
    echo "❌ linkedin-rapidapi-sync.js not found in $PROJECT_DIR"
    exit 1
fi

# Make the sync script executable
chmod +x "$PROJECT_DIR/linkedin-rapidapi-sync.js"

echo "✅ LinkedIn sync script is ready"

# Create a cron job entry
CRON_JOB="0 */6 * * * cd $PROJECT_DIR && /usr/local/bin/node linkedin-rapidapi-sync.js >> $PROJECT_DIR/automation.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "linkedin-rapidapi-sync.js"; then
    echo "⚠️  Cron job already exists. Updating..."
    # Remove existing job and add new one
    (crontab -l 2>/dev/null | grep -v "linkedin-rapidapi-sync.js"; echo "$CRON_JOB") | crontab -
else
    echo "📅 Adding new cron job..."
    # Add the cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
fi

echo "✅ Cron job added successfully!"
echo "📋 Cron job: $CRON_JOB"

# Test the sync script
echo "🧪 Testing the sync script..."
cd "$PROJECT_DIR"
node linkedin-rapidapi-sync.js

if [ $? -eq 0 ]; then
    echo "✅ Test sync completed successfully!"
else
    echo "❌ Test sync failed. Please check the logs."
    exit 1
fi

# Display status
echo ""
echo "🎉 LinkedIn RapidAPI Automation Setup Complete!"
echo ""
echo "📊 Status:"
echo "  • Sync script: $PROJECT_DIR/linkedin-rapidapi-sync.js"
echo "  • Schedule: Every 6 hours (0 */6 * * *)"
echo "  • Logs: $PROJECT_DIR/automation.log"
echo "  • Data: $PROJECT_DIR/_data/linkedin-posts.json"
echo "  • Posts: $PROJECT_DIR/_posts/"
echo ""
echo "🔍 To check cron jobs: crontab -l"
echo "🗑️  To remove cron job: crontab -e (then delete the line)"
echo "📊 To view logs: tail -f $PROJECT_DIR/automation.log"
echo "🔄 To run manually: cd $PROJECT_DIR && node linkedin-rapidapi-sync.js"
echo ""
echo "⏰ Next sync will run automatically every 6 hours!"