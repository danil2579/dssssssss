/**
 * Simple Express server for the editor UI.
 *
 *   node ui/server.js
 *
 * Endpoints:
 *   GET  /                    → static editor app
 *   GET  /api/config          → load currently-saved config
 *   POST /api/config          → save config JSON
 *   POST /api/upload          → multipart upload (field: "file"), returns /assets/<name>
 *   POST /api/render          → kick off a render, streams logs over SSE
 *   GET  /api/output/list     → list rendered videos in /out
 *   GET  /assets/*            → serves files from public/assets
 *   GET  /out/*               → serves rendered videos
 */
import express from 'express';
import multer from 'multer';
import {spawn} from 'node:child_process';
import {readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const assetsDir = path.resolve(projectRoot, 'public', 'assets');
const outDir = path.resolve(projectRoot, 'out');
const configsDir = path.resolve(projectRoot, 'configs');
const activeConfigPath = path.join(configsDir, 'active.json');
const sampleConfigPath = path.join(configsDir, 'sample.json');

mkdirSync(assetsDir, {recursive: true});
mkdirSync(outDir, {recursive: true});
mkdirSync(configsDir, {recursive: true});

const app = express();
app.use(express.json({limit: '5mb'}));

// Static asset serving
app.use('/assets', express.static(assetsDir));
app.use('/out', express.static(outDir));
app.use('/', express.static(path.join(__dirname, 'public')));

// ---- config endpoints ----
app.get('/api/config', (_req, res) => {
  const file = existsSync(activeConfigPath) ? activeConfigPath : sampleConfigPath;
  if (!existsSync(file)) return res.status(404).json({error: 'no config'});
  res.json(JSON.parse(readFileSync(file, 'utf-8')));
});

app.post('/api/config', (req, res) => {
  const cfg = req.body;
  if (!cfg || typeof cfg !== 'object')
    return res.status(400).json({error: 'invalid config'});
  writeFileSync(activeConfigPath, JSON.stringify(cfg, null, 2));
  res.json({ok: true, path: '/configs/active.json'});
});

// ---- uploads ----
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, assetsDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({storage, limits: {fileSize: 200 * 1024 * 1024}});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({error: 'no file'});
  res.json({path: `/assets/${req.file.filename}`, size: req.file.size});
});

// ---- render (SSE) ----
app.post('/api/render', (req, res) => {
  const orientation = req.body.orientation === 'portrait' ? 'portrait' : 'landscape';
  if (!existsSync(activeConfigPath)) {
    return res.status(400).json({error: 'no active config — save one first'});
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outName = `render-${orientation}-${stamp}.mp4`;
  const outFile = path.join(outDir, outName);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send('log', `starting render → ${outName}`);

  const child = spawn(
    'npx',
    [
      'ts-node',
      '--esm',
      'src/render.ts',
      'configs/active.json',
      orientation,
      `out/${outName}`,
    ],
    {cwd: projectRoot, env: process.env}
  );

  child.stdout.on('data', (b) => send('log', b.toString()));
  child.stderr.on('data', (b) => send('log', b.toString()));
  child.on('close', (code) => {
    if (code === 0) {
      send('done', {url: `/out/${outName}`});
    } else {
      send('error', {code});
    }
    res.end();
  });

  req.on('close', () => {
    child.kill('SIGTERM');
  });
});

// ---- list rendered outputs ----
app.get('/api/output/list', (_req, res) => {
  const files = readdirSync(outDir)
    .filter((f) => f.endsWith('.mp4'))
    .map((f) => {
      const s = statSync(path.join(outDir, f));
      return {name: f, url: `/out/${f}`, size: s.size, mtime: s.mtimeMs};
    })
    .sort((a, b) => b.mtime - a.mtime);
  res.json(files);
});

const port = process.env.PORT || 5174;
app.listen(port, () => {
  console.log(`\n  cinematic-video-generator UI → http://localhost:${port}\n`);
});
