const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;

const REPO_BASE = '/' + path.basename(ROOT_DIR);

function normalizePathname(pathname) {
  if (!pathname.startsWith('/')) pathname = '/' + pathname;
  if (pathname === REPO_BASE || pathname === REPO_BASE + '/') return '/';
  if (pathname.startsWith(REPO_BASE + '/')) return pathname.slice(REPO_BASE.length);
  return pathname;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function serveStatic(res, filePath){
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()){
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    const stream = fs.createReadStream(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    stream.pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  pathname = normalizePathname(pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const relativePath = pathname.replace(/^\/+/, '');
  const filePath = path.join(ROOT_DIR, relativePath);
  if (!filePath.startsWith(ROOT_DIR)){
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  serveStatic(res, filePath);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
