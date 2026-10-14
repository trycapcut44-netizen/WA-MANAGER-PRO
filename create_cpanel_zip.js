const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const zipName = 'WA-MANAGER-PRO-cpanel-ready.zip';
const zipPathInRoot = path.join(rootDir, zipName);
const zipPathInDownloads = path.join(path.dirname(rootDir), zipName);

const stagingDir = path.join(rootDir, '_staging_cpanel');
if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

// List of folders and files to include
const itemsToCopy = [
  'backend',
  'database',
  'sessions',
  'public',
  'frontend',
  'app.js',
  'server.js',
  'package.json',
  'package-lock.json',
  'ecosystem.config.js',
  'Dockerfile',
  'docker-compose.yml',
  '.env.example',
  'README.md',
  'CPANEL_DEPLOYMENT_GUIDE.txt',
  'NODEJS_DEPLOYMENT_GUIDE.md',
  '.gitignore'
];

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    // Skip node_modules and .git
    const baseName = path.basename(src);
    if (baseName === 'node_modules' || baseName === '.git') return;

    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === '.git') continue;
      // In sessions, keep only .gitkeep so each slot starts completely fresh
      if (src.includes('sessions') && entry !== '.gitkeep' && !entry.startsWith('WA-')) continue;
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    // In sessions/WA-*, skip session credential files
    if (src.includes('sessions') && path.basename(src) !== '.gitkeep') return;
    // Skip zip files or temporary files
    if (src.endsWith('.zip') || src.includes('_staging')) return;
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

console.log('Staging files for cPanel production package...');
for (const item of itemsToCopy) {
  const src = path.join(rootDir, item);
  const dest = path.join(stagingDir, item);
  if (fs.existsSync(src)) {
    copyRecursive(src, dest);
  }
}

console.log('Creating ZIP archive...');
// Remove existing zip if any
if (fs.existsSync(zipPathInRoot)) fs.unlinkSync(zipPathInRoot);
if (fs.existsSync(zipPathInDownloads)) fs.unlinkSync(zipPathInDownloads);

// Use PowerShell Compress-Archive
const psCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${zipPathInRoot}' -Force"`;
execSync(psCmd, { stdio: 'inherit' });

// Also copy to Downloads folder for instant access
fs.copyFileSync(zipPathInRoot, zipPathInDownloads);

// Clean up staging folder
fs.rmSync(stagingDir, { recursive: true, force: true });

const sizeMB = (fs.statSync(zipPathInRoot).size / (1024 * 1024)).toFixed(2);
console.log(`=======================================================`);
console.log(`✅ cPanel Production ZIP created successfully!`);
console.log(`📁 File: ${zipName} (${sizeMB} MB)`);
console.log(`📍 Path 1: ${zipPathInRoot}`);
console.log(`📍 Path 2: ${zipPathInDownloads}`);
console.log(`=======================================================`);
