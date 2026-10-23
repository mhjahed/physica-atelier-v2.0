/**
 * Zero-Dependency Local Server for Node.js 18 / 20 / 22+ LTS
 * Serves the pre-built ./release directory immediately without requiring `npm install` first,
 * and opens the default browser automatically on Windows, macOS, or Linux.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RELEASE_DIR = path.join(__dirname, 'release');
const PORT = Number(process.env.PORT) || 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const safePath = decodeURIComponent((req.url || '/').split('?')[0]);
  const relPath = safePath === '/' ? 'index.html' : safePath.replace(/^\/+/, '');
  const resolved = path.resolve(RELEASE_DIR, relPath);

  // Prevent directory traversal outside ./release
  if (!resolved.startsWith(RELEASE_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(resolved, (err, stat) => {
    const targetFile = !err && stat.isDirectory() ? path.join(resolved, 'index.html') : resolved;
    fs.readFile(targetFile, (readErr, data) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found. Run `npm run build` if ./release is missing.');
        return;
      }
      const ext = path.extname(targetFile).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}`;
  console.log('\n============================================================');
  console.log(' Physica Atelier v2.0 — Local Laboratory Server Running');
  console.log(` Node Runtime : ${process.version}`);
  console.log(` Open Browser : ${url}`);
  console.log(' Press Ctrl+C to stop');
  console.log('============================================================\n');

  if (!process.env.CI && !process.env.NO_OPEN) {
    const openCmd =
      process.platform === 'win32'
        ? `start "" "${url}"`
        : process.platform === 'darwin'
          ? `open "${url}"`
          : `xdg-open "${url}"`;
    exec(openCmd, () => {});
  }
});
