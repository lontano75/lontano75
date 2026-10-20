// Minimal static server for the test fixture: node src/serve.js <dir> <port>
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [dir = 'fixtures/demo', port = '4321'] = process.argv.slice(2);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json' };
http.createServer((req, res) => {
  let p = path.join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (p.endsWith('/')) p += 'index.html';
  fs.readFile(p, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(+port, () => console.log(`fixture on http://localhost:${port}/`));
