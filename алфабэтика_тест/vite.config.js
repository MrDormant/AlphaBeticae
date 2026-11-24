import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync, createReadStream, existsSync, statSync } from 'node:fs';
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
      cpSync(join(root, 'js'), join(out, 'js'), { recursive: true });
      cpSync(join(root, 'assets'), join(out, 'assets'), { recursive: true });
      cpSync(join(root, 'css'), join(out, 'css'), { recursive: true });
    },
  };
}

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [react(), copyRuntime()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'static',
  },
});
