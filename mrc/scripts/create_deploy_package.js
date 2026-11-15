const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const parentDir = path.join(rootDir, '..');
const stageDir = path.join(parentDir, 'mrc-deploy');

console.log('Cleaning old staging folder...');
if (fs.existsSync(stageDir)) {
  fs.rmSync(stageDir, { recursive: true, force: true });
}
fs.mkdirSync(stageDir, { recursive: true });

function copyRecursive(src, dest, excludeNames = ['node_modules', '.git', 'cache', 'shell.php']) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const list = fs.readdirSync(src);
    for (const item of list) {
      if (excludeNames.includes(item)) continue;
      copyRecursive(path.join(src, item), path.join(dest, item), excludeNames);
    }
  } else {
    if (!excludeNames.includes(path.basename(src))) {
      fs.copyFileSync(src, dest);
    }
  }
}

console.log('Copying project files to staging...');

// 1. Copy web app directories
const dirsToCopy = ['app', 'components', 'lib', 'database', 'public', 'scripts', 'styles', 'hooks'];
dirsToCopy.forEach(d => {
  const s = path.join(rootDir, d);
  const t = path.join(stageDir, d);
  if (fs.existsSync(s)) {
    console.log(`Copying ${d}...`);
    copyRecursive(s, t);
  }
});

// 2. Copy .next excluding cache
console.log('Copying .next (production build without cache)...');
const nextSrc = path.join(rootDir, '.next');
const nextDest = path.join(stageDir, '.next');
copyRecursive(nextSrc, nextDest, ['cache']);

// 3. Copy mrc-bot (WhatsApp Bot Baileys + session auth_info)
console.log('Copying mrc-bot (WhatsApp Baileys Bot)...');
const botSrc = path.join(parentDir, 'mrc-bot');
const botDest = path.join(stageDir, 'mrc-bot');
if (fs.existsSync(botSrc)) {
  copyRecursive(botSrc, botDest, ['node_modules', '.git']);
  console.log('mrc-bot copied successfully.');
}

// 4. Copy root config files
const filesToCopy = [
  '.env',
  '.env.example',
  'package.json',
  'package-lock.json',
  'ecosystem.config.js',
  'mrc_db.sql',
  'PANDUAN_DEPLOY_AAPANEL.md',
  'next.config.js',
  'next.config.mjs',
  'next.config.ts',
  'tailwind.config.js',
  'postcss.config.mjs',
  'tsconfig.json',
  'components.json'
];

filesToCopy.forEach(f => {
  const s = path.join(rootDir, f);
  const t = path.join(stageDir, f);
  if (fs.existsSync(s)) {
    fs.copyFileSync(s, t);
  }
});

console.log('Files staged successfully at:', stageDir);

// 5. Create RAR using WinRAR Rar.exe
const rarPath = path.join(parentDir, 'mrc-deployment.rar');
const zipPath = path.join(parentDir, 'mrc-deployment.zip');

if (fs.existsSync(rarPath)) fs.unlinkSync(rarPath);
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

console.log('Creating RAR archive...');
const rarExe = 'C:\\Program Files\\WinRAR\\Rar.exe';
if (fs.existsSync(rarExe)) {
  execSync(`"${rarExe}" a -r -ep1 "${rarPath}" "${stageDir}\\*"`, { stdio: 'inherit' });
  const rarSize = (fs.statSync(rarPath).size / (1024 * 1024)).toFixed(2);
  console.log(`RAR created: ${rarPath} (${rarSize} MB)`);
} else {
  console.log('WinRAR Rar.exe not found at default location.');
}

// 6. Also create ZIP archive for universal aaPanel 1-click extract compatibility
console.log('Creating ZIP archive...');
execSync(`powershell -Command "Compress-Archive -Path '${stageDir}\\*' -DestinationPath '${zipPath}' -Force"`, { stdio: 'inherit' });
const zipSize = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(2);
console.log(`ZIP created: ${zipPath} (${zipSize} MB)`);

// Cleanup stage folder
console.log('Cleaning up staging directory...');
fs.rmSync(stageDir, { recursive: true, force: true });

console.log('ALL PACKAGING (WEB + WA BOT) COMPLETED SUCCESSFULLY!');
