const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DATA_FILE = path.join(DATA_DIR, 'leaderboard.json');
const MAX_ENTRIES = 100;

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

if (!fs.existsSync(DATA_DIR)){
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_FILE)){
  fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}

function setCors(res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, status, data){
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function sanitizeName(raw){
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\s\uFEFF\u200B]+/g, ' ').trim();
}

function normalizeEntry(entry){
  const score = Math.max(0, Math.floor(Number(entry?.score) || 0));
  const level = Math.max(1, Math.floor(Number(entry?.level) || 0));
  const coins = Math.max(0, Math.floor(Number(entry?.coins) || 0));
  const char = typeof entry?.char === 'string' ? entry.char : 'parfen';
  const name = sanitizeName(entry?.name) || '???';
  const time = Number.isFinite(Number(entry?.time)) ? Number(entry.time) : Date.now();
  return { score, level, coins, char, name, time };
}

function sortLeaderboard(list){
  return list
    .map(normalizeEntry)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.time - b.time;
    })
    .slice(0, MAX_ENTRIES);
}

function readLeaderboard(){
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)){
      return sortLeaderboard(parsed);
    }
  } catch (err){
    console.error('[leaderboard] read error:', err);
  }
  return [];
}

function writeLeaderboard(data){
  const sorted = sortLeaderboard(data);
  fs.writeFileSync(DATA_FILE, JSON.stringify(sorted, null, 2), 'utf8');
  return sorted;
}

function handleLeaderboardGet(res, searchParams){
  const limitRaw = searchParams.get('limit');
  const limitNum = Number(limitRaw);
  const hasLimit = typeof limitRaw === 'string' && limitRaw.length > 0;
  const limit = hasLimit && Number.isFinite(limitNum)
    ? Math.max(1, Math.min(MAX_ENTRIES, limitNum))
    : 20;
  const data = readLeaderboard().slice(0, limit);
  sendJson(res, 200, { leaderboard: data });
}

function handleLeaderboardPost(req, res){
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 1e6) req.destroy();
  });
  req.on('end', () => {
    try {
      const parsed = JSON.parse(body || '{}');
      const name = sanitizeName(parsed?.name);
      if (!name || name.length < 2 || name.length > 16){
        return sendJson(res, 400, { error: 'Invalid name' });
      }
      const entry = normalizeEntry({
        score: parsed?.score,
        level: parsed?.level,
        coins: parsed?.coins,
        char: parsed?.char,
        name,
        time: Date.now()
      });
      const current = readLeaderboard();
      current.push(entry);
      const sorted = writeLeaderboard(current);
      sendJson(res, 201, { leaderboard: sorted });
    } catch (err){
      console.error('[leaderboard] post error:', err);
      sendJson(res, 400, { error: 'Invalid payload' });
    }
  });
}

function handleApi(req, res, url){
  setCors(res);
  if (req.method === 'OPTIONS'){
    res.writeHead(204);
    res.end();
    return true;
  }
  if (url.pathname === '/api/leaderboard'){
    if (req.method === 'GET'){
      handleLeaderboardGet(res, url.searchParams);
      return true;
    }
    if (req.method === 'POST'){
      handleLeaderboardPost(req, res);
      return true;
    }
    sendJson(res, 405, { error: 'Method not allowed' });
    return true;
  }
  return false;
}

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

  if (handleApi(req, res, url)) return;

  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const filePath = path.join(ROOT_DIR, pathname);
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
