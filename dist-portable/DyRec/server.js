const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const port = process.env.PORT || 5000;
const buildDir = path.join(__dirname, 'next-build');

console.log('[Server] Starting DyRec server...');
console.log('[Server] Directory:', __dirname);
console.log('[Server] Build dir:', buildDir);
console.log('[Server] Port:', port);

// Check if build directory exists
if (!fs.existsSync(buildDir)) {
  console.error('[Server] ERROR: Build directory not found:', buildDir);
  console.error('[Server] Please make sure next-build directory exists');
  process.exit(1);
}

// Check if next.config.js exists
const configPath = path.join(__dirname, 'next.config.js');
if (!fs.existsSync(configPath)) {
  console.error('[Server] ERROR: next.config.js not found');
  process.exit(1);
}

console.log('[Server] Starting Next.js production server...');

try {
  // Use next start directly
  execSync(`npx next start -p ${port}`, {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, PORT: String(port) }
  });
} catch (err) {
  console.error('[Server] Failed to start:', err.message);
  process.exit(1);
}

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled rejection:', reason);
});
