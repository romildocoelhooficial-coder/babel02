/**
 * Babel Ultra AI - Servidor com proxy Fish Audio TTS + Painel Admin
 * 
 * Como usar:
 * 1. npm install
 * 2. node server.js
 * 3. Acesse http://localhost:3000
 * 4. Admin: http://localhost:3000/admin
 *    Login padrão: admin / babel2026  (altere em data/config.json)
 */

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const CONFIG_PATH = path.join(__dirname, 'data', 'config.json');

// Config padrão
const defaultConfig = {
  adminUser: 'admin',
  adminPass: 'babel2026',
  fishApiKey: '',
  fishVoiceId: '',
  fishModel: 's2.1-pro-free',
  fishVoiceIdPt: '',
  fishVoiceIdEn: ''
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
      return { ...defaultConfig, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Erro ao ler config:', e.message);
  }
  return { ...defaultConfig };
}

function saveConfig(cfg) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

// Garante arquivo de config na primeira execução
if (!fs.existsSync(CONFIG_PATH)) {
  saveConfig(defaultConfig);
  console.log('Arquivo de configuração criado em data/config.json');
}

app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'babel-ultra-fish-secret-change-me-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24h
}));

// Arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Middleware de autenticação admin
function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Não autorizado. Faça login no painel admin.' });
}

// ========== ROTAS ADMIN ==========

app.post('/api/admin/login', (req, res) => {
  const cfg = loadConfig();
  const { user, pass } = req.body || {};
  if (user === cfg.adminUser && pass === cfg.adminPass) {
    req.session.isAdmin = true;
    return res.json({ ok: true, message: 'Login realizado com sucesso' });
  }
  return res.status(401).json({ error: 'Usuário ou senha inválidos' });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => {});
  res.json({ ok: true });
});

app.get('/api/admin/config', requireAuth, (req, res) => {
  const cfg = loadConfig();
  // Não devolve a senha
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

app.post('/api/admin/config', requireAuth, (req, res) => {
  const cfg = loadConfig();
  const body = req.body || {};

  if (typeof body.fishApiKey === 'string' && body.fishApiKey.trim() && !body.fishApiKey.includes('*')) {
    cfg.fishApiKey = body.fishApiKey.trim();
  }
  if (typeof body.fishVoiceId === 'string') cfg.fishVoiceId = body.fishVoiceId.trim();
  if (typeof body.fishVoiceIdPt === 'string') cfg.fishVoiceIdPt = body.fishVoiceIdPt.trim();
  if (typeof body.fishVoiceIdEn === 'string') cfg.fishVoiceIdEn = body.fishVoiceIdEn.trim();
  if (typeof body.fishModel === 'string' && body.fishModel.trim()) cfg.fishModel = body.fishModel.trim();

  // Troca de senha do admin (opcional)
  if (body.newAdminPass && body.newAdminPass.length >= 6) {
    cfg.adminPass = body.newAdminPass;
  }
  if (body.newAdminUser && body.newAdminUser.trim()) {
    cfg.adminUser = body.newAdminUser.trim();
  }

  saveConfig(cfg);
  res.json({ ok: true, message: 'Configuração salva com sucesso' });
});

app.get('/api/admin/status', (req, res) => {
  res.json({ loggedIn: !!(req.session && req.session.isAdmin) });
});

// ========== PROXY TTS FISH AUDIO ==========

app.post('/api/tts', async (req, res) => {
  const cfg = loadConfig();
  const { text, lang } = req.body || {};

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Texto é obrigatório' });
  }

  if (!cfg.fishApiKey) {
    return res.status(503).json({
      error: 'API Key da Fish Audio não configurada. Acesse /admin e configure.'
    });
  }

  // Escolhe voice ID: específico do idioma ou o geral
  let referenceId = cfg.fishVoiceId;
  if (lang === 'pt' && cfg.fishVoiceIdPt) referenceId = cfg.fishVoiceIdPt;
  if (lang === 'en' && cfg.fishVoiceIdEn) referenceId = cfg.fishVoiceIdEn;

  const payload = {
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
        detail: errText.slice(0, 300)
      });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length,
      'Cache-Control': 'no-store'
    });
    res.send(buffer);
  } catch (err) {
    console.error('Erro TTS:', err);
    res.status(500).json({ error: 'Erro interno ao gerar áudio', detail: err.message });
  }
});

// Rota de fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Babel Ultra AI + Fish Audio rodando em http://localhost:${PORT}`);
  console.log(`🔧 Painel Admin: http://localhost:${PORT}/admin`);
  console.log(`   Login padrão: admin / babel2026\n`);
});
