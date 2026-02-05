#!/bin/bash
# Build script for Cloudflare Pages deployment
# This script prepares the cf-deploy directory with all necessary static assets

echo "🚀 Starting build process..."

# 1. Clean previous build
echo "🧹 Cleaning up cf-deploy..."
rm -rf cf-deploy
mkdir -p cf-deploy

# 2. Copy main entry point
echo "📄 Copying index.html..."
cp index.html cf-deploy/

# 3. Copy assets
echo "🎨 Copying CSS..."
mkdir -p cf-deploy/css
cp -r css/* cf-deploy/css/

echo "📜 Copying JS..."
mkdir -p cf-deploy/js
cp -r js/* cf-deploy/js/

echo "🖼️ Copying Images..."
mkdir -p cf-deploy/images
cp -r images/* cf-deploy/images/

echo "📂 Copying Pages..."
mkdir -p cf-deploy/pages
cp -r pages/* cf-deploy/pages/

echo "🏗️ Copying Projects..."
mkdir -p cf-deploy/projects
cp -r projects/* cf-deploy/projects/

# 4. Copy configuration files if needed
# (Cloudflare usually handles _headers or _redirects if they exist)
if [ -f "_redirects" ]; then
    echo "🔀 Copying _redirects..."
    cp _redirects cf-deploy/
fi

if [ -f "_headers" ]; then
    echo "📋 Copying _headers..."
    cp _headers cf-deploy/
fi

# 5. Copy favoric
if [ -f "favicon.png" ]; then
    echo "🔖 Copying favicon..."
    cp favicon.png cf-deploy/
fi

if [ -f "robots.txt" ]; then
    cp robots.txt cf-deploy/
fi

if [ -f "sitemap.xml" ]; then
    cp sitemap.xml cf-deploy/
fi

echo "✅ Build complete! Assets are ready in cf-deploy/"
echo "👉 To deploy manually: wrangler pages deploy cf-deploy --project-name=bluehawana-portfolio"
