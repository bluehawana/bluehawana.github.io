/**
 * Temporary script to fix LinkedIn post URLs
 * This script will attempt to extract activity IDs from post content or use manual mapping
 */

const fs = require('fs');
const path = require('path');

// Manual mapping for known posts (you'll need to provide these)
const MANUAL_ACTIVITY_MAPPING = {
  "Why kids need to learn mathematics good": "7353057722931511296", // You provided this ID
  "🔧 Testing the LinkedIn sync system": null, // Need to find this one
};

// Function to extract activity ID from content or use manual mapping
function getActivityIdForPost(post) {
  // Check if URL already has proper activity ID
  const existingMatch = post.url.match(/urn:li:activity:(\d{19})/);
  if (existingMatch) {
    return existingMatch[1];
  }
  
  // Try manual mapping based on content
  for (const [contentKeyword, activityId] of Object.entries(MANUAL_ACTIVITY_MAPPING)) {
    if (post.content.includes(contentKeyword) && activityId) {
      return activityId;
    }
  }
  
  return null;
}

// Function to fix post URLs
function fixPostUrls(posts) {
  const fixedPosts = posts.map(post => {
    const activityId = getActivityIdForPost(post);
    
    if (activityId) {
      return {
        ...post,
        url: `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`,
        activityId: activityId // Store activity ID for future reference
      };
    }
    
    // If no activity ID found, keep original URL but add a note
    console.warn(`⚠️ No activity ID found for post: "${post.content.substring(0, 50)}..."`);
    return post;
  });
  
  return fixedPosts;
}

// Main function
async function main() {
  try {
    const dataPath = path.join(__dirname, 'data', 'linkedin-posts.json');
    
    // Read current posts
    const currentData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log(`📖 Read ${currentData.length} posts from linkedin-posts.json`);
    
    // Fix URLs
    const fixedPosts = fixPostUrls(currentData);
    
    // Show what was fixed
    const fixedCount = fixedPosts.filter(post => post.activityId).length;
    console.log(`✅ Fixed ${fixedCount} post URLs with proper activity IDs`);
    
    // Write back to file
    fs.writeFileSync(dataPath, JSON.stringify(fixedPosts, null, 2));
    console.log(`💾 Updated linkedin-posts.json with fixed URLs`);
    
    // Show summary
    fixedPosts.forEach((post, index) => {
      const hasActivityId = post.url.includes('urn:li:activity:');
      console.log(`${index + 1}. ${hasActivityId ? '✅' : '❌'} ${post.content.substring(0, 50)}...`);
      if (hasActivityId) {
        console.log(`   → ${post.url}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error fixing LinkedIn URLs:', error);
  }
}

// Export for use as module or run directly
if (require.main === module) {
  main();
}

module.exports = { fixPostUrls, getActivityIdForPost };