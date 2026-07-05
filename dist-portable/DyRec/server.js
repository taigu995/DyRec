const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const fs = require('fs');

const dev = false;
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '5000', 10);
const buildDir = path.join(__dirname, 'next-build');

console.log('[Server] Starting DyRec server...');
console.log('[Server] Directory:', __dirname);
console.log('[Server] Build dir:', buildDir);

// Check if build directory exists
if (!fs.existsSync(buildDir)) {
  console.error('[Server] ERROR: Build directory not found:', buildDir);
  process.exit(1);
}

// Load next.config.js if it exists
let nextConfig = { distDir: 'next-build' };
const configPath = path.join(__dirname, 'next.config.js');
if (fs.existsSync(configPath)) {
  try {
    nextConfig = require(configPath);
    console.log('[Server] Loaded next.config.js');
  } catch (e) {
    console.warn('[Server] Failed to load next.config.js:', e.message);
  }
}

const app = next({
  dev,
  dir: __dirname,
  conf: nextConfig,
});
const handle = app.getRequestHandler();

app.prepare().then(() => {
  console.log('[Server] Next.js prepared successfully');

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('[Server] Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  server.listen(port, (err) => {
    if (err) {
      console.error('[Server] Failed to start server:', err);
      process.exit(1);
    }
    console.log(`[Server] Ready on http://localhost:${port}`);
    console.log(`[Server] Network: http://${hostname}:${port}`);
  });

  server.on('error', (err) => {
    console.error('[Server] Server error:', err);
  });
}).catch((err) => {
  console.error('[Server] Failed to prepare Next.js:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled rejection:', reason);
});
