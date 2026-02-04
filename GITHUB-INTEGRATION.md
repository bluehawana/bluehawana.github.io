# GitHub Integration Setup Guide

## Quick Steps to Enable Automatic Deployments

### 1. Connect GitHub Repository to Cloudflare Pages

1. Go to Cloudflare Dashboard: https://dash.cloudflare.com
2. Navigate to **Pages** > **bluehawana-portfolio**
3. Click **Set up Git integrations**
4. Click **Connect to GitHub**
5. Search for and select your repository: `bluehawana/bluehawana.github.io`
6. Click **Install & Authorize**

### 2. Configure Build Settings

In the GitHub integration setup, configure:

- **Production branch**: `main`
- **Build command**: (leave empty - no build needed)
- **Build output directory**: `cf-deploy`

### 3. Save and Deploy

1. Click **Save and Deploy**
2. Cloudflare will:
   - Clone your repository
   - Deploy the `cf-deploy` directory contents
   - Show deployment progress in real-time

### 4. Verify Deployment

1. Once complete, your site will be live at:
   - `https://c6bd27e6.bluehawana-portfolio.pages.dev`
2. Any push to `main` branch will trigger automatic deployment

### 5. Set Up Custom Domain (Optional)

To use `bluehawana.github.io` as your domain:

1. In Cloudflare Pages dashboard, go to **Custom domains**
2. Click **Set up a domain**
3. Enter: `bluehawana.github.io`
4. Follow DNS configuration instructions:
   - Add a CNAME record pointing to your Cloudflare Pages domain
   - Configure GitHub Pages to redirect to Cloudflare (or disable GitHub Pages)

## Testing the Integration

1. Make a small change to your site locally
2. Push to GitHub main branch
3. Check Cloudflare Pages dashboard for deployment progress
4. Verify changes are live within ~1-2 minutes

## Troubleshooting

### Deployment Fails
- Check that `cf-deploy/` directory exists
- Verify all required files are in the deployment directory
- Check file sizes (max 25 MiB per file)

### Custom Domain Not Working
- Ensure DNS records are correct in Cloudflare DNS
- Allow up to 24 hours for DNS propagation
- Verify SSL certificate is issued

## Keeping cf-deploy Updated

When you update your site, remember to update the cf-deploy directory:

```bash
# Copy updated files to cf-deploy
cp index.html cf-deploy/
cp -r pages/* cf-deploy/pages/
cp -r projects/* cf-deploy/projects/
cp -r css/* cf-deploy/css/
cp -r js/* cf-deploy/js/
cp -r images/* cf-deploy/images/

# Commit and push to trigger auto-deployment
git add cf-deploy/
git commit -m "Update portfolio deployment"
git push origin main
```
