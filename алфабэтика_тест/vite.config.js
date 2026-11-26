import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

const MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

function serveDir(dir) {
  const rootDir = resolve(dir);
  return (req, res, next) => {
    try {
      const raw = decodeURIComponent((req.url || '/').split('?')[0]);
      const rel = normalize(raw).replace(/^[/\\]+/, '');
      if (!rel || rel.includes('..')) return next();
      const file = join(rootDir, rel);
      if (!file.startsWith(rootDir) || !existsSync(file)) return next();
      const st = statSync(file);
      if (!st.isFile()) return next();
      const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', type);
      const range = req.headers.range;
      if (range) {
        const m = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!m) {
          res.statusCode = 416;
          res.end();
          return;
        }
        const start = m[1] ? Number(m[1]) : 0;
        const end = m[2] ? Number(m[2]) : st.size - 1;
        if (start > end || end >= st.size) {
          res.statusCode = 416;
          res.end();
          return;
        }
        res.statusCode = 206;
        res.setHeader('Content-Range', `bytes ${start}-${end}/${st.size}`);
        res.setHeader('Content-Length', String(end - start + 1));
        createReadStream(file, { start, end }).pipe(res);
        return;
      }
      res.setHeader('Content-Length', String(st.size));
      createReadStream(file).pipe(res);
    } catch {
      next();
    }
  };
}

function copyTree(from, to) {
  const result = spawnSync('robocopy', [from, to, '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/nc', '/ns', '/np'], {
    windowsHide: true,
    encoding: 'utf8',
  });
  if (result.status != null && result.status >= 8) {
    throw new Error(`Не удалось скопировать ${from} → ${to} (код ${result.status})`);
  }
}

function copyRuntime() {
  return {
    name: 'alfabetica-runtime',
    configureServer(server) {
      server.middlewares.use('/js', serveDir(join(root, 'js')));
      server.middlewares.use('/assets', serveDir(join(root, 'assets')));
      server.middlewares.use('/css', serveDir(join(root, 'css')));
    },
    closeBundle() {
      const out = join(root, 'dist');
      copyTree(join(root, 'js'), join(out, 'js'));
      copyTree(join(root, 'assets'), join(out, 'assets'));
      copyTree(join(root, 'css'), join(out, 'css'));
      const htmlPath = join(out, 'index.html');
      let html = readFileSync(htmlPath, 'utf8');
      if (!html.includes('css/styles.css')) {
        html = html.replace('</head>', '  <link rel="stylesheet" href="./css/styles.css">\n</head>');
        writeFileSync(htmlPath, html);
      }
    },
  };
}

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [react(), copyRuntime()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8002',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'static',
  },
});
