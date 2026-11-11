// Minimal static file server for the built site (dist/). No dependencies.
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, normalize, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'dist');
const port = Number(process.env.PORT) || 3000;
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8',
};

function resolve(urlPath) {
  let p;
  try { p = normalize(decodeURIComponent(urlPath.split('?')[0])); } catch { return null; }
  const full = join(root, p);
  if (full !== root && !full.startsWith(root + sep)) return null;
  for (const cand of [full, join(full, 'index.html'), full + '.html']) {
    try { const s = statSync(cand); if (s.isFile()) return { file: cand, size: s.size }; } catch {}
  }
  return null;
}

createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  const hit = resolve(req.url || '/');
  if (!hit) {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><title>404</title><body style="font-family:system-ui;text-align:center;padding:15vh 20px"><h1>404</h1><p>העמוד לא נמצא. <a href="/">חזרה לעמוד הבית</a></p></body></html>');
    return;
  }
  const ext = extname(hit.file).toLowerCase();
  const headers = {
    'content-type': types[ext] || 'application/octet-stream',
    'accept-ranges': 'bytes',
    'x-content-type-options': 'nosniff',
    'cache-control': hit.file.includes(`${sep}_astro${sep}`) ? 'public, max-age=31536000, immutable' : ext === '.html' ? 'no-cache' : 'public, max-age=86400',
  };
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : hit.size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : hit.size - 1;
    if (start < 0) start = 0;
    if (end >= hit.size) end = hit.size - 1;
    if (start > end) { res.writeHead(416, { 'content-range': `bytes */${hit.size}` }).end(); return; }
    res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${hit.size}`, 'content-length': end - start + 1 });
    if (req.method === 'HEAD') { res.end(); return; }
    createReadStream(hit.file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { ...headers, 'content-length': hit.size });
  if (req.method === 'HEAD') { res.end(); return; }
  createReadStream(hit.file).pipe(res);
}).listen(port, '0.0.0.0', () => console.log(`listening on ${port}`));
