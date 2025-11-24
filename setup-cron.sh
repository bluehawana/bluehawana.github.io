#!/bin/bash

# Simple cron setup for LinkedIn automation
echo "🔧 Setting up LinkedIn sync automation..."

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📁 Project directory: $PROJECT_DIR"

# Create cron job that runs every 6 hours
CRON_JOB="0 */6 * * * cd $PROJECT_DIR && node linkedin-sync-simple.js >> $PROJECT_DIR/sync.log 2>&1"

# Remove existing job if it exists
crontab -l 2>/dev/null | grep -v "linkedin-sync-simple.js" | crontab - 2>/dev/null || true

# Add the new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Cron job added!"
echo "📋 Job: $CRON_JOB"
echo ""
echo "🔍 View current cron jobs: crontab -l"
echo "📊 View sync logs: tail -f $PROJECT_DIR/sync.log"
echo "🔄 Run manually: cd $PROJECT_DIR && node linkedin-sync-simple.js"
echo ""
echo "⏰ Your LinkedIn posts will now sync automatically every 6 hours!"