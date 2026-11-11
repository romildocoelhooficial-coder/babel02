import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
const USERS_PATH = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface AppConfig {
  adminUser: string;
  adminPass: string;
  fishApiKey: string;
  fishVoiceId: string;
  fishModel: string;
  fishVoiceIdPt: string;
  fishVoiceIdEn: string;
}

const defaultConfig: AppConfig = {
  adminUser: 'admin',
  adminPass: 'babel2026',
  fishApiKey: '',
  fishVoiceId: '',
  fishModel: 's2.1-pro-free',
  fishVoiceIdPt: '',
  fishVoiceIdEn: ''
};

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  createdAt: string;
  role: 'user' | 'admin';
}

const defaultUsers: UserRecord[] = [
  {
    id: 'usr_1',
    name: 'Romildo Coelho',
    email: 'romildo@babel.net.br',
    phone: '(11) 98765-4321',
    password: '123456',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    role: 'admin'
  },
  {
    id: 'usr_2',
    name: 'Tony Stark',
    email: 'tony@starkindustries.com',
    phone: '(21) 99888-7766',
    password: '123456',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    role: 'user'
  }
];

function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
      return { ...defaultConfig, ...JSON.parse(raw) };
    }
  } catch (e: any) {
    console.error('Erro ao ler config:', e.message);
  }
  return { ...defaultConfig };
}

function saveConfig(cfg: AppConfig) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

function loadUsers(): UserRecord[] {
  try {
    if (fs.existsSync(USERS_PATH)) {
      const raw = fs.readFileSync(USERS_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e: any) {
    console.error('Erro ao ler usuários:', e.message);
  }
  return [...defaultUsers];
}

function saveUsers(users: UserRecord[]) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), 'utf8');
}

// Initialize files if not existing
if (!fs.existsSync(CONFIG_PATH)) {
  saveConfig(defaultConfig);
}
if (!fs.existsSync(USERS_PATH)) {
  saveUsers(defaultUsers);
}

app.use(cors());
app.use(cookieParser('babel-pwa-ironman-secret-2026'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Admin authorization middleware
function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const adminToken = req.cookies?.admin_token || req.headers.authorization?.replace('Bearer ', '');
  const userToken = req.cookies?.user_session;
  
  if (adminToken === 'babel-admin-active') {
    return next();
  }

  // Also allow users with role: 'admin'
  if (userToken) {
    const users = loadUsers();
    const user = users.find(u => u.id === userToken);
    if (user && user.role === 'admin') {
      return next();
    }
  }

  return res.status(401).json({ error: 'Não autorizado. Acesso restrito a administradores.' });
}

// Sanitize user output (never return plain passwords)
function sanitizeUser(u: UserRecord) {
  const { password, ...rest } = u;
  return rest;
}

// ==========================================
// ========== USER AUTHENTICATION ==========
// ==========================================

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, phone, password } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'O nome é obrigatório.' });
  }
  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'O e-mail é obrigatório.' });
  }
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    return res.status(400).json({ error: 'O telefone é obrigatório.' });
  }
  if (!password || typeof password !== 'string' || password.length < 4) {
    return res.status(400).json({ error: 'A senha deve conter no mínimo 4 caracteres.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const users = loadUsers();

  const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'Este e-mail já está cadastrado no sistema.' });
  }

  const newUser: UserRecord = {
    id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    name: name.trim(),
    email: cleanEmail,
    phone: phone.trim(),
    password: password.trim(),
    createdAt: new Date().toISOString(),
    role: 'user'
  };

  users.push(newUser);
  saveUsers(users);

  // Set session cookie
  res.cookie('user_session', newUser.id, {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  });

  return res.status(201).json({
    ok: true,
    message: 'Cadastro efetuado com sucesso!',
    user: sanitizeUser(newUser)
  });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPass = String(password).trim();
  const cfg = loadConfig();

  // Check if it's the master admin credentials
  if (cleanEmail === cfg.adminUser.toLowerCase() && cleanPass === cfg.adminPass) {
    res.cookie('admin_token', 'babel-admin-active', {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });
    res.cookie('user_session', 'usr_admin_master', {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });
    return res.json({
      ok: true,
      message: 'Login de administrador master realizado com sucesso!',
      user: {
        id: 'usr_admin_master',
        name: 'Administrador Master',
        email: cfg.adminUser + '@babel.internal',
        phone: 'Central de Comando',
        createdAt: new Date().toISOString(),
        role: 'admin'
      },
      isAdmin: true
    });
  }

  // Check registered users
  const users = loadUsers();
  const user = users.find(u => u.email.toLowerCase() === cleanEmail);

  if (!user || user.password !== cleanPass) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }

  // Set cookies
  res.cookie('user_session', user.id, {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  });

  if (user.role === 'admin') {
    res.cookie('admin_token', 'babel-admin-active', {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });
  }

  return res.json({
    ok: true,
    message: 'Login realizado com sucesso!',
    user: sanitizeUser(user),
    isAdmin: user.role === 'admin'
  });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const sessionId = req.cookies?.user_session;
  const adminToken = req.cookies?.admin_token;

  if (sessionId === 'usr_admin_master' || (adminToken === 'babel-admin-active' && !sessionId)) {
    const cfg = loadConfig();
    return res.json({
      user: {
        id: 'usr_admin_master',
        name: 'Administrador Master',
        email: cfg.adminUser + '@babel.internal',
        phone: 'Central de Comando',
        createdAt: new Date().toISOString(),
        role: 'admin'
      },
      isAdmin: true
    });
  }

  if (!sessionId) {
    return res.json({ user: null, isAdmin: false });
  }

  const users = loadUsers();
  const user = users.find(u => u.id === sessionId);

  if (!user) {
    res.clearCookie('user_session');
    return res.json({ user: null, isAdmin: false });
  }

  return res.json({
    user: sanitizeUser(user),
    isAdmin: user.role === 'admin' || adminToken === 'babel-admin-active'
  });
});

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie('user_session');
  res.clearCookie('admin_token');
  return res.json({ ok: true, message: 'Logout efetuado.' });
});

// ==========================================
// ========== ADMIN USERS CRUD =============
// ==========================================

// 1. READ ALL USERS
app.get('/api/admin/users', requireAdminAuth, (_req: Request, res: Response) => {
  const users = loadUsers();
  // Return users sorted by createdAt descending
  const sanitized = users
    .map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      createdAt: u.createdAt,
      role: u.role || 'user'
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({ ok: true, users: sanitized });
});

// 2. CREATE USER (ADMIN)
app.post('/api/admin/users', requireAdminAuth, (req: Request, res: Response) => {
  const { name, email, phone, password, role } = req.body || {};

  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'Nome, e-mail e telefone são obrigatórios.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const users = loadUsers();

  if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
    return res.status(409).json({ error: 'Já existe um usuário com este e-mail.' });
  }

  const newUser: UserRecord = {
    id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    name: String(name).trim(),
    email: cleanEmail,
    phone: String(phone).trim(),
    password: password && String(password).trim() ? String(password).trim() : '123456',
    createdAt: new Date().toISOString(),
    role: role === 'admin' ? 'admin' : 'user'
  };

  users.push(newUser);
  saveUsers(users);

  return res.status(201).json({
    ok: true,
    message: 'Usuário cadastrado com sucesso!',
    user: sanitizeUser(newUser)
  });
});

// 3. UPDATE USER (ADMIN)
app.put('/api/admin/users/:id', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, phone, password, role } = req.body || {};

  const users = loadUsers();
  const index = users.findIndex(u => u.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  if (email) {
    const cleanEmail = String(email).trim().toLowerCase();
    const duplicate = users.find(u => u.id !== id && u.email.toLowerCase() === cleanEmail);
    if (duplicate) {
      return res.status(409).json({ error: 'Outro usuário já está utilizando este e-mail.' });
    }
    users[index].email = cleanEmail;
  }

  if (name && typeof name === 'string') users[index].name = name.trim();
  if (phone && typeof phone === 'string') users[index].phone = phone.trim();
  if (password && typeof password === 'string' && password.trim().length >= 4) {
    users[index].password = password.trim();
  }
  if (role === 'admin' || role === 'user') {
    users[index].role = role;
  }

  saveUsers(users);

  return res.json({
    ok: true,
    message: 'Dados do usuário atualizados com sucesso!',
    user: sanitizeUser(users[index])
  });
});

// 4. DELETE USER (ADMIN)
app.delete('/api/admin/users/:id', requireAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  let users = loadUsers();

  const userToDelete = users.find(u => u.id === id);
  if (!userToDelete) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  // Prevent deleting the last admin
  const admins = users.filter(u => u.role === 'admin');
  if (userToDelete.role === 'admin' && admins.length <= 1) {
    return res.status(400).json({ error: 'Não é permitido excluir o único administrador do sistema.' });
  }

  users = users.filter(u => u.id !== id);
  saveUsers(users);

  return res.json({ ok: true, message: 'Usuário excluído com sucesso!', deletedId: id });
});

// ==========================================
// ========== FISH AUDIO & SYSTEM ADMIN =====
// ==========================================

app.post('/api/admin/login', (req: Request, res: Response) => {
  const cfg = loadConfig();
  const { user, pass } = req.body || {};
  if (user === cfg.adminUser && pass === cfg.adminPass) {
    res.cookie('admin_token', 'babel-admin-active', {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });
    return res.json({ ok: true, message: 'Login realizado com sucesso', token: 'babel-admin-active' });
  }
  return res.status(401).json({ error: 'Usuário ou senha de administrador inválidos' });
});

app.post('/api/admin/logout', (_req: Request, res: Response) => {
  res.clearCookie('admin_token');
  res.json({ ok: true });
});

app.get('/api/admin/status', (req: Request, res: Response) => {
  const token = req.cookies?.admin_token || req.headers.authorization?.replace('Bearer ', '');
  const userToken = req.cookies?.user_session;
  let isAdmin = token === 'babel-admin-active';
  if (!isAdmin && userToken) {
    const users = loadUsers();
    const user = users.find(u => u.id === userToken);
    if (user?.role === 'admin') isAdmin = true;
  }
  res.json({ loggedIn: isAdmin });
});

app.get('/api/admin/config', requireAdminAuth, (_req: Request, res: Response) => {
  const cfg = loadConfig();
  res.json({
    adminUser: cfg.adminUser,
    fishApiKey: cfg.fishApiKey ? '********' + cfg.fishApiKey.slice(-4) : '',
    fishApiKeySet: !!cfg.fishApiKey,
    fishVoiceId: cfg.fishVoiceId || '',
    fishVoiceIdPt: cfg.fishVoiceIdPt || '',
    fishVoiceIdEn: cfg.fishVoiceIdEn || '',
    fishModel: cfg.fishModel || 's2.1-pro-free'
  });
});

app.post('/api/admin/config', requireAdminAuth, (req: Request, res: Response) => {
  const cfg = loadConfig();
  const body = req.body || {};

  if (typeof body.fishApiKey === 'string' && body.fishApiKey.trim() && !body.fishApiKey.includes('*')) {
    cfg.fishApiKey = body.fishApiKey.trim();
  }
  if (typeof body.fishVoiceId === 'string') cfg.fishVoiceId = body.fishVoiceId.trim();
  if (typeof body.fishVoiceIdPt === 'string') cfg.fishVoiceIdPt = body.fishVoiceIdPt.trim();
  if (typeof body.fishVoiceIdEn === 'string') cfg.fishVoiceIdEn = body.fishVoiceIdEn.trim();
  if (typeof body.fishModel === 'string' && body.fishModel.trim()) cfg.fishModel = body.fishModel.trim();

  if (body.newAdminPass && body.newAdminPass.length >= 6) {
    cfg.adminPass = body.newAdminPass;
  }
  if (body.newAdminUser && body.newAdminUser.trim()) {
    cfg.adminUser = body.newAdminUser.trim();
  }

  saveConfig(cfg);
  res.json({ ok: true, message: 'Configuração salva com sucesso' });
});

// ==========================================
// ========== TRANSLATION API ===============
// ==========================================

app.post('/api/translate', async (req: Request, res: Response) => {
  const { text, sourceLang, targetLang } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Texto é obrigatório' });
  }

  const sl = sourceLang === 'pt' ? 'pt' : 'en';
  const tl = targetLang === 'en' ? 'en' : 'pt';

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&dj=1&q=${encodeURIComponent(text.trim())}`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error(`Google Translate status: ${response.status}`);
    const data: any = await response.json();
    const translation = data.sentences ? data.sentences.map((s: any) => s.trans).join(' ') : '';
    return res.json({ translation, sourceLang: sl, targetLang: tl });
  } catch (err: any) {
    console.error('Translation error:', err);
    return res.status(500).json({ error: 'Erro ao traduzir texto', detail: err.message });
  }
});

// ==========================================
// ========== FISH AUDIO TTS PROXY ==========
// ==========================================

app.post('/api/tts', async (req: Request, res: Response) => {
  const cfg = loadConfig();
  const { text, lang } = req.body || {};

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Texto é obrigatório' });
  }

  if (!cfg.fishApiKey) {
    return res.status(503).json({
      error: 'API Key da Fish Audio não configurada. Configure no Painel Admin ou use a síntese local do dispositivo.',
      fallbackAvailable: true
    });
  }

  let referenceId = cfg.fishVoiceId;
  if (lang === 'pt' && cfg.fishVoiceIdPt) referenceId = cfg.fishVoiceIdPt;
  if (lang === 'en' && cfg.fishVoiceIdEn) referenceId = cfg.fishVoiceIdEn;

  const payload: any = {
    text: text.trim(),
    format: 'mp3',
    normalize: true,
    latency: 'normal'
  };
  if (referenceId) payload.reference_id = referenceId;

  try {
    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.fishApiKey}`,
        'Content-Type': 'application/json',
        'model': cfg.fishModel || 's2.1-pro-free'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('Fish Audio error:', response.status, errText);
      return res.status(response.status).json({
        error: 'Falha na Fish Audio',
        detail: errText.slice(0, 300),
        fallbackAvailable: true
      });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'no-store'
    });
    res.send(buffer);
  } catch (err: any) {
    console.error('Erro TTS:', err);
    res.status(500).json({ error: 'Erro interno ao gerar áudio', detail: err.message, fallbackAvailable: true });
  }
});

// ==========================================
// ========== SERVER / VITE INTEGRATION =====
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n⚡ Babel Ultra AI (PWA Ready + User Auth & CRUD) rodando em http://localhost:${PORT}`);
    console.log(`🔧 Painel Admin disponível na interface`);
  });
}

startServer();
