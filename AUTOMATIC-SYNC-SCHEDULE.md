# LinkedIn Automatic Sync Schedule

## ⏰ Current Schedule: Business Hours Only

**Runs automatically every 30 minutes during business hours:**
- **UTC Time**: 8:00 AM - 8:30 PM
- **Sweden Time (CET)**: ~9:00 AM - 9:30 PM (winter)
- **Sweden Time (CEST)**: ~10:00 AM - 10:30 PM (summer)
- **Days**: Monday - Sunday (every day)

## 🚀 How It Works (Fully Automatic)

1. **You post on LinkedIn** (anytime during the day)
2. **GitHub Actions automatically checks** (every 30 minutes during 8 AM - 8 PM)
3. **If new posts found**:
   - Downloads post content
   - Downloads images
   - Creates blog post files
   - Commits to repository
4. **Netlify auto-deploys** (within 2 minutes)
5. **Your website updates** - visitors see new posts!

**YOU DON'T NEED TO DO ANYTHING!** It's completely automatic.

## 📅 Daily Schedule

The sync runs at these times (UTC):
```
08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00, 11:30,
12:00, 12:30, 13:00, 13:30, 14:00, 14:30, 15:00, 15:30,
16:00, 16:30, 17:00, 17:30, 18:00, 18:30, 19:00, 19:30,
20:00, 20:30
```

**Total: 26 automatic checks per day**

## 🌍 Time Zone Reference

Your location (Sweden) uses:
- **CET** (UTC+1): October - March (winter time)
- **CEST** (UTC+2): March - October (summer time)

### Example Sync Times in Sweden:

**Winter (CET - UTC+1):**
- First check: 9:00 AM
- Last check: 9:30 PM

**Summer (CEST - UTC+2):**
- First check: 10:00 AM
- Last check: 10:30 PM

## ⚡ Response Time

**Typical flow:**
1. You post on LinkedIn: `12:00 PM`
2. Next scheduled check: `12:30 PM` (within 30 minutes)
3. GitHub Actions runs sync: `12:30 PM` (takes 2-3 minutes)
4. Netlify deploys: `12:33 PM` (takes 1-2 minutes)
5. Post visible on website: `12:35 PM`

**Maximum delay: 35 minutes** from posting to appearing on website.

## 💰 Resource Usage

**Previous schedule (24/7):**
- 48 checks per day × 30 days = 1,440 runs/month

**New schedule (business hours only):**
- 26 checks per day × 30 days = 780 runs/month

**Savings: 46% reduction** in GitHub Actions usage!

## 🔧 Why Business Hours Only?

1. **Posting Patterns**: Most LinkedIn activity happens during work hours
2. **Resource Efficiency**: No need to check when you're sleeping
3. **Cost Effective**: Reduces GitHub Actions minutes usage
4. **Still Frequent**: 26 checks per day is plenty
5. **Overnight Posts**: Will be picked up at 8 AM the next morning

## 📊 What Gets Synced Automatically

Every check looks for:
- ✅ New posts you shared
- ✅ New articles you published
- ✅ Images from posts
- ✅ Post metadata (date, links, etc.)
- ✅ Engagement stats (when available)

## 🛠️ Manual Trigger (If Needed)

While the system is fully automatic, you can trigger a sync manually anytime:

### Option 1: GitHub Actions
1. Go to: https://github.com/bluehawana/bluehawana.github.io/actions
2. Click "LinkedIn Auto Sync" or "Update LinkedIn Posts (OAuth)"
3. Click "Run workflow" → "main" → "Run workflow"

### Option 2: Command Line
```bash
cd bluehawana.github.io
node automated-linkedin-sync-with-images.js
git add .
git commit -m "Manual sync"
git push
```

## 📝 Cron Syntax Explained

```
*/30 8-20 * * *
│    │    │ │ │
│    │    │ │ └─ Day of week (0-6, Sunday-Saturday) [* = all days]
│    │    │ └─── Month (1-12) [* = all months]
│    │    └───── Day of month (1-31) [* = all days]
│    └────────── Hour (0-23) [8-20 = 8 AM to 8 PM]
└─────────────── Minute [*/30 = every 30 minutes]
```

## 🔍 Verify It's Working

### Check Last Sync:
```bash
cd bluehawana.github.io
cat _data/last-sync-report.json
```

### View Recent Sync Activity:
- GitHub Actions: https://github.com/bluehawana/bluehawana.github.io/actions
- Look for "LinkedIn Auto Sync" or "Update LinkedIn Posts" runs
- Green checkmark ✅ = successful sync
- Red X ❌ = failed (check logs)

### Check Your Website:
1. Visit: https://www.bluehawana.com
2. Scroll to "Latest Professional Insights"
3. Posts should show with images
4. Check timestamps to see when last synced

## ⚠️ Troubleshooting

**Problem: Posts not showing up**
- Wait for next scheduled sync (max 30 minutes)
- Check GitHub Actions for recent runs
- Verify API keys in GitHub Secrets

**Problem: Old posts missing**
- One-time manual sync will catch up all history
- Or wait for automatic sync to gradually catch up

**Problem: Images not loading**
- Check `/images/linkedin/` directory exists
- Verify image paths in blog posts
- Re-run sync to re-download images

## 🎯 Next Automatic Sync

To see when the next sync will run, check:
https://github.com/bluehawana/bluehawana.github.io/actions

Look for "Next scheduled run" information.

## 📞 Need to Change Schedule?

Edit these files:
- `.github/workflows/linkedin-sync.yml`
- `.github/workflows/update-linkedin-posts.yml`

Change the cron expression:
- `*/15 8-20 * * *` - Every 15 minutes (more frequent)
- `0 * * * *` - Every hour
- `0 */2 * * *` - Every 2 hours
- `*/30 * * * *` - Every 30 minutes, 24/7

Then commit and push - changes take effect immediately!

---

## ✅ Summary

**You're all set!** The system is:
- ✅ Fully automatic
- ✅ Runs during business hours
- ✅ Checks every 30 minutes
- ✅ Downloads images
- ✅ Updates your website
- ✅ No manual work needed

**Just post on LinkedIn and forget about it!** Your website will update automatically within 30 minutes during business hours (8 AM - 8 PM).

---

**Last Updated**: November 24, 2025
**Schedule**: Every 30 minutes, 8 AM - 8 PM UTC
**Status**: ✅ Active and Running Automatically
