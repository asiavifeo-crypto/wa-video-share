const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const PORT = process.env.PORT || 3000;
const UPLOAD_PASSWORD = process.env.UPLOAD_PASSWORD || ''; // set this so only you can upload
const KEEP_DAYS = Number(process.env.KEEP_DAYS || 7);      // auto delete after N days
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const ALLOWED = ['.mp4', '.mov', '.mkv', '.avi', '.webm', '.m4v', '.3gp'];
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.set('trust proxy', true);
app.use(express.static(path.join(__dirname, 'public')));

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const baseUrl = req => `${req.protocol}://${req.get('host')}`;
const metaPath = id => path.join(UPLOAD_DIR, id + '.json');
const readMeta = id => {
  if (!/^[a-f0-9]{10}$/.test(id) || !fs.existsSync(metaPath(id))) return null;
  return JSON.parse(fs.readFileSync(metaPath(id), 'utf8'));
};

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      req.vid = crypto.randomBytes(5).toString('hex');
      cb(null, req.vid + path.extname(file.originalname).toLowerCase());
    }
  }),
  fileFilter: (req, file, cb) => {
    if (UPLOAD_PASSWORD && req.query.pw !== UPLOAD_PASSWORD) return cb(new Error('WRONG_PASSWORD'));
    cb(null, ALLOWED.includes(path.extname(file.originalname).toLowerCase()));
  },
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2 GB
});

function makeThumb(videoFile, thumbFile) {
  for (const t of ['1', '0']) {
    const r = spawnSync(ffmpegPath, ['-y', '-ss', t, '-i', videoFile, '-frames:v', '1',
      '-vf', 'scale=600:-2', '-q:v', '5', thumbFile]);
    if (r.status === 0 && fs.existsSync(thumbFile)) return true;
  }
  return false;
}

app.post('/upload', (req, res) => {
  upload.single('video')(req, res, err => {
    if (err) return res.status(err.message === 'WRONG_PASSWORD' ? 401 : 400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Video file தேவை' });
    const id = req.vid;
    const thumbName = id + '.jpg';
    const ok = makeThumb(req.file.path, path.join(UPLOAD_DIR, thumbName));
    fs.writeFileSync(metaPath(id), JSON.stringify({
      id, video: req.file.filename, thumb: ok ? thumbName : null,
      name: req.file.originalname, size: req.file.size, created: Date.now()
    }));
    res.json({ link: `${baseUrl(req)}/v/${id}` });
  });
});

// Share page: WhatsApp reads the og: tags here to build the thumbnail card
app.get('/v/:id', (req, res) => {
  const m = readMeta(req.params.id);
  if (!m) return res.status(404).send('Link காலாவதி ஆகிவிட்டது அல்லது இல்லை');
  const b = baseUrl(req);
  const mb = (m.size / 1048576).toFixed(1);
  const img = m.thumb ? `${b}/f/${m.thumb}` : '';
  res.send(`<!doctype html><html lang="ta"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(m.name)}</title>
<meta property="og:type" content="video.other">
<meta property="og:title" content="${esc(m.name)}">
<meta property="og:description" content="Original quality video · ${mb} MB · Tap to watch / download">
${img ? `<meta property="og:image" content="${img}"><meta property="og:image:width" content="600">` : ''}
<meta property="og:url" content="${b}/v/${m.id}">
<style>
body{font-family:system-ui,sans-serif;margin:0;background:#111;color:#eee;display:flex;flex-direction:column;align-items:center;padding:16px}
video{width:100%;max-width:720px;border-radius:12px;background:#000}
a.btn{display:inline-block;margin-top:16px;padding:12px 22px;background:#25d366;color:#000;border-radius:10px;text-decoration:none;font-weight:600}
small{opacity:.7;margin-top:8px}
</style></head><body>
<video controls playsinline preload="metadata" ${img ? `poster="${img}"` : ''} src="/f/${m.video}"></video>
<a class="btn" href="/d/${m.id}">⬇ Original quality download (${mb} MB)</a>
<small>${esc(m.name)}</small>
</body></html>`);
});

app.get('/f/:file', (req, res) => {
  const f = path.basename(req.params.file);
  const full = path.join(UPLOAD_DIR, f);
  if (f.endsWith('.json') || !fs.existsSync(full)) return res.sendStatus(404);
  res.sendFile(full); // supports range requests for video seeking
});

app.get('/d/:id', (req, res) => {
  const m = readMeta(req.params.id);
  if (!m) return res.sendStatus(404);
  res.download(path.join(UPLOAD_DIR, m.video), m.name);
});

// delete old files
setInterval(() => {
  const limit = Date.now() - KEEP_DAYS * 86400000;
  for (const f of fs.readdirSync(UPLOAD_DIR).filter(x => x.endsWith('.json'))) {
    try {
      const m = JSON.parse(fs.readFileSync(path.join(UPLOAD_DIR, f), 'utf8'));
      if (m.created < limit) {
        [m.video, m.thumb, f].filter(Boolean).forEach(x => fs.rmSync(path.join(UPLOAD_DIR, x), { force: true }));
      }
    } catch (e) {}
  }
}, 3600000);

app.listen(PORT, () => console.log('Running on port ' + PORT));
