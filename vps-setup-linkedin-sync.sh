#!/bin/bash

# VPS LinkedIn Sync Setup Script
# This script sets up automated LinkedIn post syncing on your RackNerd VPS
# Run this on your VPS: harvad@107.175.235.220

set -e

echo "🚀 Setting up LinkedIn Sync Service on VPS..."

# Create linkedin-sync directory
SYNC_DIR="/home/harvad/linkedin-sync"
mkdir -p "$SYNC_DIR"
cd "$SYNC_DIR"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "📦 Installing Git..."
    sudo apt-get update
    sudo apt-get install -y git
fi

# Clone or update the repository
if [ -d "bluehawana.github.io" ]; then
    echo "📥 Updating existing repository..."
    cd bluehawana.github.io
    git pull origin main
else
    echo "📥 Cloning repository..."
    git clone https://github.com/bluehawana/bluehawana.github.io.git
    cd bluehawana.github.io
fi

# Install dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "📦 Installing dependencies..."
    npm install --production
fi

# Create environment file
echo "⚙️ Setting up environment variables..."
cat > .env.local << 'EOF'
# Add your API keys here
SCRAPINGDOG_API_KEY=your_scrapingdog_api_key_here
LINKEDIN_ACCESS_TOKEN=your_linkedin_access_token_here
LINKEDIN_PROFILE_ID=hzl
SYNC_INTERVAL_MINUTES=30
MAX_POSTS_TO_SYNC=10
EOF

echo "📝 Please edit .env.local and add your API keys:"
echo "   nano $SYNC_DIR/bluehawana.github.io/.env.local"

# Create sync script
cat > "$SYNC_DIR/run-sync.sh" << 'EOF'
#!/bin/bash
# LinkedIn Sync Runner
cd /home/harvad/linkedin-sync/bluehawana.github.io

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Run the sync script
echo "[$(date)] Running LinkedIn sync..."
node automated-linkedin-sync.js >> /home/harvad/linkedin-sync/sync.log 2>&1

# Push changes to GitHub if any
if [ -n "$(git status --porcelain)" ]; then
    git config --local user.email "action@github.com"
    git config --local user.name "VPS Sync Bot"
    git add _data/ data/ _posts/
    git commit -m "🔄 VPS sync - $(date '+%Y-%m-%d %H:%M:%S')" || true
    git push origin main
    echo "[$(date)] Changes pushed to GitHub"
else
    echo "[$(date)] No new posts to sync"
fi
EOF

chmod +x "$SYNC_DIR/run-sync.sh"

# Set up cron job to run every 30 minutes
echo "⏰ Setting up cron job..."
CRON_JOB="*/30 * * * * $SYNC_DIR/run-sync.sh"

# Remove existing cron job if it exists
crontab -l 2>/dev/null | grep -v "run-sync.sh" | crontab - || true

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit the API keys in: $SYNC_DIR/bluehawana.github.io/.env.local"
echo "2. Test the sync manually: $SYNC_DIR/run-sync.sh"
echo "3. Check logs: tail -f $SYNC_DIR/sync.log"
echo ""
echo "🔄 The sync will run automatically every 30 minutes"
echo "📊 View cron jobs: crontab -l"
