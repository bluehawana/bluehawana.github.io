# Manual LinkedIn Sync Trigger

## Immediate Sync Options

### Option 1: GitHub Actions (Recommended)
Trigger the sync workflow immediately via GitHub website:

1. **Go to**: https://github.com/bluehawana/bluehawana.github.io/actions
2. **Select** "Update LinkedIn Posts (OAuth)" workflow
3. **Click** "Run workflow" button (on the right)
4. **Select** branch: `main`
5. **Click** "Run workflow" (green button)

**Wait Time**: 2-3 minutes for sync to complete

### Option 2: GitHub CLI
If you have GitHub CLI installed:

```bash
cd bluehawana.github.io
gh workflow run "Update LinkedIn Posts (OAuth)"
```

### Option 3: Netlify Function
Trigger via Netlify function endpoint:

```bash
curl -X POST https://bluehawana.com/.netlify/functions/linkedin-posts-sync
```

## Verify Sync Completed

After triggering, check:

1. **GitHub Actions Status**:
   https://github.com/bluehawana/bluehawana.github.io/actions

2. **Check for new commit**:
   ```bash
   cd bluehawana.github.io
   git pull origin main
   git log -5 --oneline
   ```

3. **Verify data file updated**:
   ```bash
   cat data/linkedin-posts.json | grep "last_sync"
   ```

4. **Check your website**:
   https://www.bluehawana.com (wait 1-2 minutes for Netlify to deploy)

## Expected Results

After successful sync, you should see:
- ✅ 4+ new posts in `data/linkedin-posts.json`
- ✅ New markdown files in `_posts/` directory
- ✅ Posts about:
  - BankID/ICA Banken (Nov 20)
  - Company profits & AI tools (Nov 24)
  - Cloud infrastructure (Nov 20)
  - CEO hairlines (Nov 11)

## Troubleshooting

If sync fails:
1. Check GitHub Secrets are configured
2. Verify API tokens are valid
3. Check API rate limits
4. Review workflow logs for errors

## Automatic Sync

After this manual trigger, the workflows will automatically run every 30 minutes to keep your website updated.

**Next automatic sync**: 30 minutes from now
**Schedule**: `*/30 * * * *` (every 30 minutes)
