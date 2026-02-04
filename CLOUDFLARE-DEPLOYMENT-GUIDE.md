# Cloudflare Pages Deployment Guide

## Quick Deployment Commands

### Deploy to Cloudflare Pages
```bash
# Deploy the portfolio
wrangler pages deploy cf-deploy --project-name=bluehawana-portfolio --branch=main

# View deployment status
wrangler pages deployment list --project-name=bluehawana-portfolio
```

### Set Up Custom Domains

To set up custom domains (like bluehawana.github.io), you need to configure DNS in Cloudflare:

1. **For bluehawana.github.io** (GitHub Pages subdomain):
   - Add a CNAME record in Cloudflare DNS:
     - Type: CNAME
     - Name: bluehawana
     - Target: c6bd27e6.bluehawana-portfolio.pages.dev
     - TTL: Auto

2. **For www.bluehawana.com** (if you own this domain):
   - Add a CNAME record:
     - Type: CNAME
     - Name: www
     - Target: bluehawana-portfolio.pages.dev
     - TTL: Auto

### Alternative: Deploy from GitHub (Recommended)

Since your site is on GitHub, you can set up automatic deployments:

1. Go to Cloudflare Dashboard: https://dash.cloudflare.com
2. Navigate to Pages > bluehawana-portfolio
3. Click "Set up Git integrations"
4. Connect to your GitHub repository
5. Configure build settings (no build needed for static site)
6. Select production branch: main

## Managing the Deployment

### Update Deployment
Any push to the main branch will trigger automatic deployment if GitHub integration is set up.

### Manual Deployment
```bash
# Update the deployment directory
cp index.html cf-deploy/
cp -r pages/* cf-deploy/pages/
cp -r projects/* cf-deploy/projects/
cp -r css/* cf-deploy/css/
cp -r js/* cf-deploy/js/
cp -r images/* cf-deploy/images/

# Deploy
wrangler pages deploy cf-deploy --project-name=bluehawana-portfolio
```

## Subdomain Management (jobs.bluehawana.com, weather.bluehawana.com)

For these subdomains, you have two options:

### Option 1: Separate Cloudflare Pages Deployments
Create separate Pages projects for each subdomain:
```bash
wrangler pages project create jobs-portfolio
wrangler pages project create weather-portfolio
```

Then deploy subdomain-specific content to each.

### Option 2: Single Deployment with Rewrite Rules
Keep one deployment and use Cloudflare Pages Functions to route subdomains.

## Troubleshooting

### Large Files
If deployment fails due to file size:
- Remove files larger than 25 MiB
- Check: `find cf-deploy -type f -size +20M`

### Missing Files
Verify deployment:
```bash
wrangler pages deployment list --project-name=bluehawana-portfolio
```

### Custom Domain Not Working
1. Verify DNS records are correct
2. Check SSL certificate is issued (usually automatic)
3. Wait up to 24 hours for DNS propagation

## Security Reminder

After deploying, remember to:
1. Revoke any exposed credentials
2. Use environment variables for sensitive data
3. Never commit secrets to repository
4. Monitor your accounts for suspicious activity
