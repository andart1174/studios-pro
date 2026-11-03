/**
 * ONE-CLICK AR VIEWER RESTORE SCRIPT
 * 
 * Usage: node restore_ar_viewer.cjs
 * 
 * Instantly restores public/apps/ar-viewer/ to the certified working stable state
 * from backups/ar-viewer-stable/, then runs verification.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const BACKUP_DIR = path.join(ROOT, 'backups', 'ar-viewer-stable');
const TARGET_DIR = path.join(ROOT, 'public', 'apps', 'ar-viewer');
const DIST_DIR = path.join(ROOT, 'dist', 'apps', 'ar-viewer');

console.log('\n🔄 Restoring AR Viewer to certified stable state...');

if (!fs.existsSync(BACKUP_DIR)) {
  console.error(`❌ Backup directory not found at ${BACKUP_DIR}`);
  process.exit(1);
}

const files = ['index.html', 'style.css'];

for (const file of files) {
  const src = path.join(BACKUP_DIR, file);
  const destPublic = path.join(TARGET_DIR, file);
  if (!fs.existsSync(src)) {
    console.error(`❌ Backup file missing: ${src}`);
    process.exit(1);
  }
  fs.copyFileSync(src, destPublic);
  console.log(`  ✓ Restored public/apps/ar-viewer/${file}`);

  if (fs.existsSync(DIST_DIR)) {
    const destDist = path.join(DIST_DIR, file);
    fs.copyFileSync(src, destDist);
    console.log(`  ✓ Synced dist/apps/ar-viewer/${file}`);
  }
}

console.log('\n🔍 Verifying restored files...');
try {
  execSync('node verify_ar_viewer.cjs', { stdio: 'inherit', cwd: ROOT });
  console.log('\n✨ SUCCESS: AR Viewer restored to certified stable state in < 1 second!\n');
} catch (err) {
  console.error('\n❌ Restoration verification failed.');
  process.exit(1);
}
