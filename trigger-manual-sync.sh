#!/bin/bash

# Manual LinkedIn Sync Trigger Script
# This triggers the LinkedIn sync workflow manually via GitHub CLI
# Use this when automatic cron schedule doesn't trigger

echo "🚀 Triggering LinkedIn sync manually..."
echo ""
echo "This will run the sync immediately and download:"
echo "  - Your Volvo Cars post (Nov 24)"
echo "  - BankID/ICA Banken post (Nov 20)"
echo "  - Cloud infrastructure post (Nov 20)"
echo "  - CEO hairlines post (Nov 11)"
echo "  - All associated images"
echo ""

# Method 1: Using Git to create an empty commit (triggers workflow)
echo "Method 1: Creating empty commit to trigger workflow..."
git commit --allow-empty -m "🔄 Manual trigger: LinkedIn sync

Triggering sync to catch up on missing posts from September-November.

Expected to sync:
- Volvo Cars Q3 2025 financial analysis (Nov 24)
- BankID renewal and ICA Banken issues (Nov 20)
- Cloud infrastructure 99.99% uptime (Nov 20)
- CEO hairlines and monitors (Nov 11)

This will download posts and images automatically."

git push origin main

echo ""
echo "✅ Triggered! The workflow will start in a few seconds."
echo ""
echo "📊 Monitor progress:"
echo "   https://github.com/bluehawana/bluehawana.github.io/actions"
echo ""
echo "⏱️  Expected completion: ~3 minutes"
echo "🌐 Check website after: https://www.bluehawana.com"
echo ""
echo "Alternative: Trigger via GitHub website:"
echo "1. Go to: https://github.com/bluehawana/bluehawana.github.io/actions"
echo "2. Click 'LinkedIn Auto Sync' or 'Update LinkedIn Posts (OAuth)'"
echo "3. Click 'Run workflow' button"
echo "4. Select branch: main"
echo "5. Click 'Run workflow'"
