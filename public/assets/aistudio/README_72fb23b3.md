# Babel Ultra AI + Fish Audio TTS

Tradutor de voz em tempo real (PT ↔ EN) com síntese de voz via **Fish Audio API**.

## O que mudou

- A voz do navegador (`speechSynthesis`) foi **substituída** pela API da Fish Audio.
- A **API Key** e o **Voice ID** são configurados no **painel admin** (não ficam no frontend).
- O backend faz proxy das requisições TTS (a chave nunca é exposta no browser).

## Instalação

```bash
cd babel-fish-audio
npm install
npm start
```

Abra: **http://localhost:3000**

## Painel Admin

- URL: **http://localhost:3000/admin**
- Login padrão: `admin` / `babel2026`

### O que configurar

1. **API Key** da Fish Audio (obtenha em [fish.audio](https://fish.audio) → API Keys)
2. **Voice ID** (`reference_id`) — ID do modelo de voz no fish.audio  
   Você pode definir:
   - Um ID geral
   - Ou IDs separados para Português e Inglês
3. **Model** — recomenda-se `s2.1-pro-free` para testes e `s2.1-pro` em produção

Também é possível trocar o usuário e a senha do admin no próprio painel.

## Endpoints

| Rota | Descrição |
|------|-----------|
| `GET /` | App principal |
| `GET /admin` | Painel de configuração |
| `POST /api/tts` | Gera áudio (body: `{ "text": "...", "lang": "pt"\|"en" }`) |
| `POST /api/admin/login` | Login admin |
| `POST /api/admin/config` | Salva API Key / Voice IDs |

## Estrutura

```
babel-fish-audio/
├── server.js          # Express + proxy Fish Audio + auth
├── package.json
├── data/
│   └── config.json    # Configuração (API key, voice IDs, login)
└── public/
    ├── index.html     # App Babel Ultra
    └── admin.html     # Painel admin
```

## Segurança

- Altere a senha do admin assim que possível.
- Em produção, use HTTPS e troque o `secret` da sessão em `server.js`.
- A API Key fica apenas no servidor (`data/config.json`). Não versione esse arquivo com a chave real.

## Exemplo de voice IDs

No site fish.audio, abra uma voz e copie o ID da URL (ex: `https://fish.audio/m/9a9cf47702da476aa4629e2506d4a857` → ID = `9a9cf47702da476aa4629e2506d4a857`).
