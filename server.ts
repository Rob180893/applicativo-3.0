import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Ensure data and upload directories exist
const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// In-memory + file-backed JSON database
interface DBData {
  users: Array<{
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    createdAt: string;
  }>;
  sessions: Record<string, string>; // token -> userId
  userData: Record<string, { boards: any; disc: any; updatedAt: string }>;
  files: Array<{
    id: string;
    userId: string;
    originalName: string;
    fileName: string;
    mimeType: string;
    size: number;
    uploadDate: string;
    disciplineId?: string;
    topicId?: string;
  }>;
}

let db: DBData = {
  users: [],
  sessions: {},
  userData: {},
  files: [],
};

const loadDB = () => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(content);
    } else {
      saveDB();
    }
  } catch (err) {
    console.error('Error loading db.json:', err);
  }
};

const saveDB = () => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db.json:', err);
  }
};

loadDB();

// Helpers
const hashPassword = (password: string) => {
  return crypto.createHash('sha256').update(password + '_estudos_salt').digest('hex');
};

const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
});

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Auth middleware
const getAuthUser = (req: express.Request) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || !db.sessions[token]) return null;
  const userId = db.sessions[token];
  return db.users.find((u) => u.id === userId) || null;
};

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existing = db.users.find((u) => u.email === cleanEmail);
    if (existing) {
      return res.status(400).json({ error: 'Este email já está cadastrado.' });
    }

    const user = {
      id: crypto.randomBytes(8).toString('hex'),
      name: String(name).trim(),
      email: cleanEmail,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    db.users.push(user);
    const token = generateToken();
    db.sessions[token] = user.id;
    saveDB();

    res.json({
      user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
      token,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao registrar usuário' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const hash = hashPassword(password);
    const user = db.users.find((u) => u.email === cleanEmail && u.passwordHash === hash);

    if (!user) {
      return res.status(401).json({ error: 'Email ou senha incorretos.' });
    }

    const token = generateToken();
    db.sessions[token] = user.id;
    saveDB();

    res.json({
      user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
      token,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao fazer login' });
  }
});

// Me (Verify session)
app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  res.json({
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
  });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token && db.sessions[token]) {
    delete db.sessions[token];
    saveDB();
  }
  res.json({ success: true });
});

// ==================== DATA SYNC ROUTES ====================

// Get user synced data
app.get('/api/sync', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const data = db.userData[user.id] || null;
  res.json({ data });
});

// Save user data
app.post('/api/sync', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const { boards, disc } = req.body;
  db.userData[user.id] = {
    boards,
    disc,
    updatedAt: new Date().toISOString(),
  };
  saveDB();

  res.json({ success: true, updatedAt: db.userData[user.id].updatedAt });
});

// ==================== FILE STORAGE ROUTES ====================

// Upload file
app.post('/api/files/upload', upload.single('file'), (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Faça login para anexar arquivos.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const { disciplineId, topicId } = req.body;

    const fileMeta = {
      id: crypto.randomBytes(8).toString('hex'),
      userId: user.id,
      originalName: Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
      fileName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadDate: new Date().toISOString(),
      disciplineId: disciplineId || undefined,
      topicId: topicId || undefined,
    };

    db.files.push(fileMeta);
    saveDB();

    res.json({
      file: {
        ...fileMeta,
        url: `/api/files/${fileMeta.id}`,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao fazer upload do arquivo' });
  }
});

// List files for current user
app.get('/api/files', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const { disciplineId, topicId } = req.query;
  let userFiles = db.files.filter((f) => f.userId === user.id);

  if (disciplineId) {
    userFiles = userFiles.filter((f) => f.disciplineId === disciplineId);
  }
  if (topicId) {
    userFiles = userFiles.filter((f) => f.topicId === topicId);
  }

  res.json({
    files: userFiles.map((f) => ({
      ...f,
      url: `/api/files/${f.id}`,
    })),
  });
});

// Download / View file
app.get('/api/files/:id', (req, res) => {
  const fileMeta = db.files.find((f) => f.id === req.params.id);
  if (!fileMeta) {
    return res.status(404).send('Arquivo não encontrado');
  }

  const filePath = path.resolve(UPLOADS_DIR, fileMeta.fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Arquivo não encontrado no servidor');
  }

  res.setHeader('Content-Type', fileMeta.mimeType);
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${encodeURIComponent(fileMeta.originalName)}"`
  );
  fs.createReadStream(filePath).pipe(res);
});

// Delete file
app.delete('/api/files/:id', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const fileIdx = db.files.findIndex((f) => f.id === req.params.id && f.userId === user.id);
  if (fileIdx === -1) {
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }

  const [removed] = db.files.splice(fileIdx, 1);
  const filePath = path.resolve(UPLOADS_DIR, removed.fileName);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {}
  }
  saveDB();

  res.json({ success: true });
});

// ==================== VITE MOUNT / STATIC SERVER ====================

async function startServer() {
  if (!isProduction) {
    // Development mode: mount Vite dev server middlewares
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve built assets from dist
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Meu Quadro de Estudos running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
