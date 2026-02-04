#!/bin/bash
# Deployment preparation script for Cloudflare Pages

echo "Preparing portfolio for Cloudflare deployment..."

# Create deployment directory
DEPLOY_DIR="./deploy"
mkdir -p $DEPLOY_DIR

# Copy essential files
echo "Copying essential portfolio files..."
cp -r css $DEPLOY_DIR/
cp -r js $DEPLOY_DIR/
cp -r images $DEPLOY_DIR/
cp -r pages $DEPLOY_DIR/
cp -r projects $DEPLOY_DIR/
cp index.html $DEPLOY_DIR/
cp favicon.png $DEPLOY_DIR/ 2>/dev/null || echo "No favicon found"
cp robots.txt $DEPLOY_DIR/ 2>/dev/null || echo "No robots.txt found"
cp sitemap.xml $DEPLOY_DIR/ 2>/dev/null || echo "No sitemap.xml found"

# Copy configuration files
cp CNAME $DEPLOY_DIR/ 2>/dev/null || echo "No CNAME found"

# Create simplified redirects if needed
cat > $DEPLOY_DIR/_redirects << 'EOF'
# Cloudflare Pages redirects
/ /index.html 200
/pages/* /pages/:splat 200
/projects/* /projects/:splat 200
EOF

echo "Deployment preparation complete!"
echo "Deploy directory created with $(find $DEPLOY_DIR -type f | wc -l) files"