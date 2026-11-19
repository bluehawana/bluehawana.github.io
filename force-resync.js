#!/usr/bin/env node

/**
 * Force Re-sync Script
 * This clears old LinkedIn data and forces a fresh sync of all posts
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔄 Force Re-sync LinkedIn Posts\n');
console.log('━'.repeat(50));

// Backup and clear data files
const dataFile = path.join(__dirname, '_data', 'linkedin-posts.json');
const webDataFile = path.join(__dirname, 'data', 'linkedin-posts.json');
const syncReport = path.join(__dirname, '_data', 'last-sync-report.json');

let backupCount = 0;

if (fs.existsSync(dataFile)) {
  const backup = dataFile + '.backup-' + Date.now();
  fs.copyFileSync(dataFile, backup);
  console.log(`✅ Backed up: ${path.basename(backup)}`);

  // Clear the file
  fs.writeFileSync(dataFile, JSON.stringify({
    profile: {
      name: "Harvad Li",
      linkedin_url: "https://www.linkedin.com/in/hzl/",
      public_identifier: "hzl",
      last_sync: new Date().toISOString()
    },
    extraction: {
      date: new Date().toISOString(),
      method: "force-resync",
      total_posts_found: 0,
      new_posts_this_sync: 0
    },
    posts: []
  }, null, 2));

  console.log('✅ Cleared: _data/linkedin-posts.json');
  backupCount++;
}

if (fs.existsSync(webDataFile)) {
  const backup = webDataFile + '.backup-' + Date.now();
  fs.copyFileSync(webDataFile, backup);
  console.log(`✅ Backed up: ${path.basename(backup)}`);

  fs.writeFileSync(webDataFile, JSON.stringify([], null, 2));
  console.log('✅ Cleared: data/linkedin-posts.json');
  backupCount++;
}

if (fs.existsSync(syncReport)) {
  const backup = syncReport + '.backup-' + Date.now();
  fs.copyFileSync(syncReport, backup);
  console.log(`✅ Backed up: ${path.basename(backup)}`);
  backupCount++;
}

console.log('\n━'.repeat(50));
console.log(`\n📦 Created ${backupCount} backup files`);
console.log('🎯 Ready for fresh sync!');
console.log('\n📝 Next steps:');
console.log('   1. Commit these changes:');
console.log('      git add _data/ data/');
console.log('      git commit -m "Clear LinkedIn data for fresh sync"');
console.log('      git push');
console.log('   2. Trigger the GitHub Action workflow');
console.log('   3. All posts will be synced as new\n');
