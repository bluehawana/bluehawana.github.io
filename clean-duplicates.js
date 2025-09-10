#!/usr/bin/env node

/**
 * Clean duplicate posts from linkedin-posts.json
 */

const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data/linkedin-posts.json');

async function cleanDuplicates() {
  console.log('🧹 Cleaning duplicate LinkedIn posts...');
  
  try {
    // Load current data
    const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
    const originalCount = data.posts?.length || 0;
    
    if (!data.posts || !Array.isArray(data.posts)) {
      console.log('❌ No posts array found in data file');
      return;
    }
    
    // Remove duplicates
    const uniquePosts = [];
    const seenActivityIds = new Set();
    const seenContentHashes = new Set();
    
    for (const post of data.posts) {
      // Extract activity ID (handle different formats)
      let activityId = post.activityId;
      if (activityId && activityId.startsWith('urn:li:activity:')) {
        activityId = activityId.replace('urn:li:activity:', '');
      }
      
      // Skip if we've seen this activity ID
      if (activityId && seenActivityIds.has(activityId)) {
        console.log(`⚠️  Skipping duplicate activityId: ${activityId}`);
        continue;
      }
      
      // Create content hash for similarity detection
      const content = (post.content || post.title || '').toLowerCase().trim();
      const contentHash = content.substring(0, 100).replace(/\s+/g, ' ');
      
      // Skip if we've seen very similar content
      if (contentHash.length > 20 && seenContentHashes.has(contentHash)) {
        console.log(`⚠️  Skipping duplicate content: ${contentHash.substring(0, 50)}...`);
        continue;
      }
      
      // Add to unique lists
      if (activityId) seenActivityIds.add(activityId);
      if (contentHash.length > 20) seenContentHashes.add(contentHash);
      uniquePosts.push(post);
    }
    
    // Sort by date (newest first)
    uniquePosts.sort((a, b) => {
      const dateA = new Date(a.created_at || a.date || a.synced_at || 0);
      const dateB = new Date(b.created_at || b.date || b.synced_at || 0);
      return dateB - dateA;
    });
    
    // Update data
    data.posts = uniquePosts;
    data.total_posts = uniquePosts.length;
    data.last_cleanup = new Date().toISOString();
    
    // Save cleaned data
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    
    console.log(`✅ Cleanup complete!`);
    console.log(`   Original posts: ${originalCount}`);
    console.log(`   Unique posts: ${uniquePosts.length}`);
    console.log(`   Duplicates removed: ${originalCount - uniquePosts.length}`);
    
  } catch (error) {
    console.error('❌ Error cleaning duplicates:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  cleanDuplicates()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanDuplicates };