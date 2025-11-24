/**
 * Heroku LinkedIn Auto-Scraper Server
 * Runs 24/7 and automatically updates your LinkedIn posts
 */

const express = require('express');
const cron = require('node-cron');
const { scrapeLinkedInPosts } = require('./scraper');
const { updateGitHubRepo } = require('./github-updater');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'LinkedIn Auto-Scraper Running',
        lastRun: global.lastScrapeTime || 'Never',
        nextRun: getNextRunTime(),
        uptime: process.uptime()
    });
});

// Manual trigger endpoint
app.post('/scrape-now', async (req, res) => {
    try {
        console.log('🚀 Manual scrape triggered');
        const result = await runScrapeAndUpdate();
        res.json({
            success: true,
            message: 'Scrape completed',
            result: result
        });
    } catch (error) {
        console.error('❌ Manual scrape failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Status endpoint
app.get('/status', (req, res) => {
    res.json({
        server: 'running',
        lastScrape: global.lastScrapeTime || 'Never',
        lastResult: global.lastScrapeResult || 'No data',
        environment: process.env.NODE_ENV || 'development',
        memory: process.memoryUsage(),
        uptime: process.uptime()
    });
});

// Logs endpoint
app.get('/logs', (req, res) => {
    res.json({
        logs: global.scrapeLogs || [],
        lastUpdated: new Date().toISOString()
    });
});

/**
 * Main scraping and update function
 */
async function runScrapeAndUpdate() {
    const startTime = new Date();
    console.log(`🔄 Starting LinkedIn scrape at ${startTime.toISOString()}`);
    
    try {
        // Step 1: Scrape LinkedIn posts
        const posts = await scrapeLinkedInPosts();
        
        if (!posts || posts.length === 0) {
            throw new Error('No posts found during scrape');
        }
        
        console.log(`✅ Scraped ${posts.length} LinkedIn posts`);
        
        // Step 2: Update GitHub repository
        const updateResult = await updateGitHubRepo(posts);
        
        const result = {
            timestamp: startTime.toISOString(),
            postsFound: posts.length,
            githubUpdate: updateResult,
            duration: Date.now() - startTime.getTime()
        };
        
        // Store results globally for status endpoint
        global.lastScrapeTime = startTime.toISOString();
        global.lastScrapeResult = result;
        
        // Store logs
        if (!global.scrapeLogs) global.scrapeLogs = [];
        global.scrapeLogs.push({
            timestamp: startTime.toISOString(),
            success: true,
            postsFound: posts.length,
            message: 'Scrape completed successfully'
        });
        
        // Keep only last 50 logs
        if (global.scrapeLogs.length > 50) {
            global.scrapeLogs = global.scrapeLogs.slice(-50);
        }
        
        console.log(`✅ Scrape and update completed in ${result.duration}ms`);
        return result;
        
    } catch (error) {
        console.error('❌ Scrape and update failed:', error);
        
        // Store error in logs
        if (!global.scrapeLogs) global.scrapeLogs = [];
        global.scrapeLogs.push({
            timestamp: startTime.toISOString(),
            success: false,
            error: error.message,
            message: 'Scrape failed'
        });
        
        throw error;
    }
}

/**
 * Get next scheduled run time
 */
function getNextRunTime() {
    // Cron runs every 2 hours: 0 */2 * * *
    const now = new Date();
    const nextRun = new Date(now);
    
    // Find next even hour
    const currentHour = now.getHours();
    const nextEvenHour = currentHour % 2 === 0 ? currentHour + 2 : currentHour + 1;
    
    nextRun.setHours(nextEvenHour, 0, 0, 0);
    
    // If we've passed today's last run, go to tomorrow
    if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
        nextRun.setHours(0, 0, 0, 0);
    }
    
    return nextRun.toISOString();
}

/**
 * Schedule automatic scraping
 * Runs every 2 hours
 */
cron.schedule('0 */2 * * *', async () => {
    console.log('⏰ Scheduled scrape starting...');
    try {
        await runScrapeAndUpdate();
    } catch (error) {
        console.error('❌ Scheduled scrape failed:', error);
    }
}, {
    timezone: "Europe/Stockholm" // Your timezone
});

/**
 * Schedule daily health check
 * Runs at 9 AM every day
 */
cron.schedule('0 9 * * *', () => {
    console.log('💓 Daily health check');
    console.log(`Server uptime: ${process.uptime()} seconds`);
    console.log(`Memory usage:`, process.memoryUsage());
    console.log(`Last scrape: ${global.lastScrapeTime || 'Never'}`);
}, {
    timezone: "Europe/Stockholm"
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 LinkedIn Auto-Scraper running on port ${PORT}`);
    console.log(`📅 Scheduled to run every 2 hours`);
    console.log(`🌍 Next run: ${getNextRunTime()}`);
    
    // Run initial scrape after 30 seconds
    setTimeout(async () => {
        console.log('🔄 Running initial scrape...');
        try {
            await runScrapeAndUpdate();
        } catch (error) {
            console.error('❌ Initial scrape failed:', error);
        }
    }, 30000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 Received SIGTERM, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('👋 Received SIGINT, shutting down gracefully');
    process.exit(0);
});