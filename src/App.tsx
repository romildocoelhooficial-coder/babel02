/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Trash2, 
  Settings, 
  Copy, 
  Check, 
  User as UserIcon, 
  Activity, 
  Sparkles,
  Layers,
  Radio,
  ChevronDown,
  LogOut,
  Shield,
  Smartphone
} from 'lucide-react';
import { PWAInstallButton } from './pwa/PWAInstallButton';
import { OfflineIndicator } from './pwa/OfflineIndicator';
import { AdminModal } from './components/AdminModal';
import { AuthLanding } from './components/AuthLanding';

interface TranslationHistoryItem {
  id: string;
  original: string;
  translated: string;
  detectedLang: 'pt' | 'en';
  timestamp: string;
}

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  role: 'user' | 'admin';
}

export default function App() {
  // Authentication & session state
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);

  // Speech recognition & translator state
  const [isRunning, setIsRunning] = useState(false);
  const [reactorState, setReactorState] = useState<'idle' | 'listening' | 'speaking'>('idle');
  const [statusMessage, setStatusMessage] = useState('Núcleo online. Aguardando comandos de voz...');
  const [mode, setMode] = useState<'auto' | 'en-pt' | 'pt-en'>('auto');
  const [detectedLanguage, setDetectedLanguage] = useState<'pt' | 'en'>('pt');
  
  // Real-time text display
  const [heardText, setHeardText] = useState('...');
  const [translatedText, setTranslatedText] = useState('...');
  const [lastEnglishPhrase, setLastEnglishPhrase] = useState('');
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  
  // Admin & UI states
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Audio player ref
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Phonetic trigger words for fast detection
  const ptTriggers = ['oi', 'olá', 'tudo', 'bom', 'dia', 'noite', 'você', 'falar', 'português', 'obrigado', 'como', 'fala', 'sim', 'não'];
  const enTriggers = ['hello', 'hi', 'good', 'morning', 'night', 'you', 'speak', 'english', 'thanks', 'thank', 'how', 'welcome', 'yes', 'no'];

  // Check initial user authentication session
  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
        setIsAdminUser(data.isAdmin);
      } else {
        setCurrentUser(null);
        setIsAdminUser(false);
      }
    } catch {
      setCurrentUser(null);
      setIsAdminUser(false);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setCurrentUser(null);
    setIsAdminUser(false);
    stopListening();
  };

  // Language detection
  const advancedDetectLanguage = (text: string): 'pt' | 'en' => {
    if (mode === 'en-pt') return 'en';
    if (mode === 'pt-en') return 'pt';

    const clean = text.toLowerCase().trim();
    const words = clean.split(/\s+/);

    let ptPoints = 0;
    let enPoints = 0;

    words.forEach(word => {
      if (ptTriggers.includes(word)) ptPoints += 4;
      if (enTriggers.includes(word)) enPoints += 4;
    });

    if (/[ãõçáéíóúâêôà]/g.test(clean)) ptPoints += 5;
    if (/\b(the|of|and|to|in|is|it|that|was|he|for|on|with|as|at|by|an|this)\b/g.test(clean)) enPoints += 3;
    if (/(ção|ções|mente|dade|nh|lh)/g.test(clean)) ptPoints += 3;
    if (/(ing|ed|ly|tion|ness)\b/g.test(clean)) enPoints += 3;

    return ptPoints >= enPoints ? 'pt' : 'en';
  };

  // Translation with server proxy and client fallback
  const translate = async (text: string, sourceLang: 'pt' | 'en'): Promise<string> => {
    const target = sourceLang === 'pt' ? 'en' : 'pt';
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceLang, targetLang: target })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.translation) return data.translation;
      }
    } catch {}

    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${target}&dt=t&dj=1&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      const data = await res.json();
      return data.sentences ? data.sentences.map((s: any) => s.trans).join(' ') : 'Erro de processamento.';
    } catch {
      return 'Falha na ponte neural de tradução.';
    }
  };

  // Audio synthesis via Fish Audio with Web Speech fallback
  const speakTTS = async (text: string, lang: 'pt' | 'en'): Promise<void> => {
    if (!text || !text.trim()) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    window.speechSynthesis.cancel();

    setReactorState('speaking');
    setStatusMessage('🔊 Gerando voz neural...');

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), lang })
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        return new Promise<void>((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(url);
            audioRef.current = null;
            setReactorState(isRunning ? 'listening' : 'idle');
            setStatusMessage(isRunning ? '🎙️ Sensores de áudio operacionais. Pode falar...' : 'Núcleo online. Aguardando comandos...');
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            audioRef.current = null;
            fallbackSpeech(text, lang).then(resolve);
          };
          audio.play().catch(() => {
            fallbackSpeech(text, lang).then(resolve);
          });
        });
      } else {
        await fallbackSpeech(text, lang);
      }
    } catch {
      await fallbackSpeech(text, lang);
    }
  };

  const fallbackSpeech = (text: string, lang: 'pt' | 'en'): Promise<void> => {
    return new Promise((resolve) => {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'pt' ? 'pt-BR' : 'en-US';
        utterance.rate = 1.0;
        utterance.onend = () => {
          setReactorState(isRunning ? 'listening' : 'idle');
          setStatusMessage(isRunning ? '🎙️ Sensores operacionais. Pode falar...' : 'Núcleo online.');
          resolve();
        };
        utterance.onerror = () => {
          setReactorState(isRunning ? 'listening' : 'idle');
          resolve();
        };
        window.speechSynthesis.speak(utterance);
      } else {
        setReactorState(isRunning ? 'listening' : 'idle');
        resolve();
      }
    });
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Seu navegador não suporta a Web Speech API. Recomendamos o Google Chrome ou Microsoft Edge.');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.lang = mode === 'en-pt' ? 'en-US' : 'pt-BR';

    recognition.onstart = () => {
      setIsRunning(true);
      setReactorState('listening');
      setStatusMessage('🎙️ Sensores de áudio operacionais. Pode falar...');
    };

    recognition.onresult = async (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const activeText = finalTranscript || interimTranscript;
      if (!activeText.trim()) return;

      const detected = advancedDetectLanguage(activeText);
      setDetectedLanguage(detected);
      setHeardText(activeText);
      setStatusMessage(`Análise de espectro: Idioma identificado -> [${detected.toUpperCase()}]`);

      if (finalTranscript.trim()) {
        try {
          recognition.stop();
        } catch {}

        const translated = await translate(finalTranscript, detected);
        setTranslatedText(translated);

        const targetLang = detected === 'pt' ? 'en' : 'pt';
        setLastEnglishPhrase(detected === 'pt' ? translated : finalTranscript);

        const newHistoryItem: TranslationHistoryItem = {
          id: Date.now().toString(),
          original: finalTranscript,
          translated,
          detectedLang: detected,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        setHistory(prev => [newHistoryItem, ...prev.slice(0, 29)]);

        await speakTTS(translated, targetLang);

        if (isRunning) {
          try {
            recognition.start();
          } catch {}
        }
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech') {
        setStatusMessage(`⚠️ Ajustando frequência dos sensores... (${e.error})`);
      }
    };

    recognition.onend = () => {
      if (isRunning) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch {}
        }, 350);
      } else {
        setReactorState('idle');
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e: any) {
      console.error(e);
    }
  };

  const stopListening = () => {
    setIsRunning(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis.cancel();
    setReactorState('idle');
    setStatusMessage('⛔ Matriz de sensores offline.');
  };

  const handleReplay = async () => {
    if (!lastEnglishPhrase) {
      setStatusMessage('⚠️ Buffer vazio. Nenhuma frase gravada.');
      return;
    }
    setStatusMessage('🔊 Reproduzindo última saída...');
    await speakTTS(lastEnglishPhrase, 'en');
  };

  const handleClearCache = () => {
    setHeardText('...');
    setTranslatedText('...');
    setHistory([]);
    setLastEnglishPhrase('');
    setStatusMessage('🧹 Cache do sistema limpo.');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Loading state
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen w-full bg-[#080202] text-[#fff6e5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-400 rounded-full animate-spin"></div>
          <span className="text-xs uppercase tracking-widest text-amber-300 font-bold">Iniciando Babel Ultra AI...</span>
        </div>
      </div>
    );
  }

  // IF NOT LOGGED IN: Render Landing & Auth Page
  if (!currentUser) {
    return (
      <>
        <AuthLanding
          onLoginSuccess={(user, isAdmin) => {
            setCurrentUser(user);
            setIsAdminUser(isAdmin);
            speakTTS(`Identidade confirmada. Bem-vindo, ${user.name}`, 'pt');
          }}
          onOpenAdminModal={() => setIsAdminOpen(true)}
        />
        <OfflineIndicator />
        <AdminModal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
        />
      </>
    );
  }

  // IF LOGGED IN: Render Full Translator Interface with User Profile
  return (
    <div className="relative min-h-screen w-full bg-[#070101] text-[#fff6e5] flex flex-col justify-between overflow-x-hidden selection:bg-[#ffb347] selection:text-black">
      {/* Background HUD tech grid */}
      <div className="fixed inset-0 hud-grid pointer-events-none z-0 opacity-40"></div>

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 py-3 flex items-center justify-between border-b border-amber-500/20 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img 
            src="/pwa-192x192.png" 
            alt="Babel Ultra Logo" 
            className="w-9 h-9 rounded-xl border border-amber-500/40 shadow-[0_0_12px_rgba(255,179,71,0.3)] object-cover" 
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-wider text-amber-400">BABEL ULTRA AI</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
                PWA v4.5
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 hidden sm:block">Motor Neural PT ↔ EN · Fish Audio</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* User profile badge & logout */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-black/60 border border-amber-500/30 text-xs">
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-black text-[11px] shrink-0">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <p className="font-bold text-white text-[11px] leading-tight truncate max-w-[110px]">{currentUser.name}</p>
              <p className="text-[9px] text-zinc-400 leading-none truncate max-w-[110px]">{currentUser.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-red-400 transition cursor-pointer"
              title="Encerrar Sessão"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Admin Button */}
          <button
            onClick={() => setIsAdminOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-xs tracking-wider transition cursor-pointer"
            title="Abrir Painel Admin (Usuários & Fish Audio)"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Admin</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 py-6 md:py-8 flex flex-col items-center">
        <div className="w-full bg-[#120404]/85 backdrop-blur-xl border-2 border-orange-600/35 rounded-3xl p-5 md:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_50px_rgba(255,70,0,0.15)] scanline-effect relative overflow-hidden">
          
          {/* Welcome HUD Banner */}
          <div className="bg-[#200505]/70 border border-amber-500/30 rounded-2xl p-4 md:p-5 text-center mb-6 shadow-[0_0_20px_rgba(255,70,0,0.1)]">
            <h2 className="text-sm md:text-base font-black text-amber-400 uppercase tracking-widest flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              ⚡ Babel Ultra AI — Jarvis Edition
            </h2>
            <p className="text-xs text-amber-100/90 mt-1 max-w-xl mx-auto">
              Diretrizes operacionais ativas, comandante <strong className="text-white">{currentUser.name}</strong>. Matriz de tradução bi-direcional conectada ao Fish Audio.
            </p>
          </div>

          {/* ARC REACTOR CORE */}
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="relative w-44 h-44 flex items-center justify-center">
              {/* Outer rotating dashed ring */}
              <div className="absolute inset-2 rounded-full border-2 border-dashed border-cyan-300/40 ring-clockwise pointer-events-none"></div>
              {/* Inner counter dotted ring */}
              <div className="absolute inset-6 rounded-full border-2 border-dotted border-amber-400/60 ring-counter pointer-events-none"></div>

              {/* Central Glowing Orb */}
              <div 
                className={`w-36 h-36 rounded-full border-4 border-cyan-400/60 flex items-center justify-center transition-all duration-500 cursor-pointer shadow-[0_0_40px_rgba(0,240,255,0.6),inset_0_0_30px_rgba(0,0,0,0.8)] ${
                  reactorState === 'listening' 
                    ? 'arc-orb-listen' 
                    : reactorState === 'speaking' 
                    ? 'arc-orb-speak' 
                    : 'bg-gradient-to-b from-white via-cyan-300 via-sky-600 to-[#001133]'
                }`}
                onClick={isRunning ? stopListening : startListening}
                title={isRunning ? 'Clique para parar' : 'Clique para iniciar tradução'}
              >
                {reactorState === 'listening' ? (
                  <Mic className="w-12 h-12 text-black animate-pulse" />
                ) : reactorState === 'speaking' ? (
                  <Volume2 className="w-12 h-12 text-black animate-bounce" />
                ) : (
                  <Radio className="w-10 h-10 text-cyan-950 animate-pulse" />
                )}
              </div>
            </div>

            <h1 className="mt-4 text-2xl md:text-3xl font-black tracking-widest text-white uppercase text-center drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
              Babel Ultra AI
            </h1>
            <p className="text-xs uppercase tracking-widest text-cyan-400 font-bold text-center mt-1">
              Next-Gen Realtime Core Interface
            </p>
          </div>

          {/* ACTIVE LANGUAGE FLAGS */}
          <div className="flex justify-center items-center gap-4 md:gap-6 mb-6">
            <div 
              onClick={() => {
                setMode('pt-en');
                setDetectedLanguage('pt');
              }}
              className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 transition-all duration-300 cursor-pointer min-w-[130px] ${
                detectedLanguage === 'pt' 
                  ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_25px_rgba(0,240,255,0.35)] scale-105 opacity-100' 
                  : 'border-white/10 bg-black/40 opacity-40 hover:opacity-75'
              }`}
            >
              <span className="text-3xl md:text-4xl">🇧🇷</span>
              <span className="mt-1.5 text-xs font-black uppercase tracking-wider text-amber-200">PT-BR</span>
            </div>

            <div 
              onClick={() => {
                setMode('en-pt');
                setDetectedLanguage('en');
              }}
              className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 transition-all duration-300 cursor-pointer min-w-[130px] ${
                detectedLanguage === 'en' 
                  ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_25px_rgba(0,240,255,0.35)] scale-105 opacity-100' 
                  : 'border-white/10 bg-black/40 opacity-40 hover:opacity-75'
              }`}
            >
              <span className="text-3xl md:text-4xl">🇺🇸</span>
              <span className="mt-1.5 text-xs font-black uppercase tracking-wider text-amber-200">English</span>
            </div>
          </div>

          {/* HUD CONTROLS */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-6">
            {!isRunning ? (
              <button
                onClick={startListening}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-amber-700 hover:brightness-125 border border-amber-300/40 text-white font-black text-xs uppercase tracking-wider shadow-[0_4px_15px_rgba(0,0,0,0.4)] transition transform hover:-translate-y-0.5 cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                <span>Iniciar Filtro</span>
              </button>
            ) : (
              <button
                onClick={stopListening}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-800 hover:brightness-125 border border-red-400/50 text-white font-black text-xs uppercase tracking-wider shadow-[0_4px_15px_rgba(0,0,0,0.4)] transition transform hover:-translate-y-0.5 cursor-pointer animate-pulse"
              >
                <MicOff className="w-4 h-4" />
                <span>Desativar</span>
              </button>
            )}

            <button
              onClick={handleReplay}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 hover:brightness-125 border border-cyan-300/50 text-white font-black text-xs uppercase tracking-wider transition transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>Replay Voice</span>
            </button>

            <button
              onClick={handleClearCache}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-zinc-700 to-zinc-900 hover:brightness-125 border border-zinc-500/40 text-zinc-200 font-black text-xs uppercase tracking-wider transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Flush Cache</span>
            </button>

            <div className="relative">
              <select
                value={mode}
                onChange={(e: any) => setMode(e.target.value)}
                className="appearance-none px-4 py-3 pr-8 rounded-xl bg-[#0e0303] border border-amber-500/40 text-amber-300 font-extrabold text-xs uppercase tracking-wider focus:outline-none focus:border-cyan-400 cursor-pointer shadow-sm"
              >
                <option value="auto">🤖 AUTO DETECTAR COGNITIVO</option>
                <option value="en-pt">🇺🇸 INGLÊS → 🇧🇷 PORTUGUÊS</option>
                <option value="pt-en">🇧🇷 PORTUGUÊS → 🇺🇸 INGLÊS</option>
              </select>
              <ChevronDown className="w-4 h-4 text-amber-400 absolute right-2.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* STATUS DISPLAY */}
          <div className="w-full text-center py-2.5 px-4 rounded-xl mb-6 bg-black/60 border border-cyan-400/25 text-cyan-300 font-bold text-xs md:text-sm tracking-wider shadow-inner">
            {statusMessage}
          </div>

          {/* DUAL DISPLAY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-[#0b0202]/80 border border-white/10 rounded-2xl p-4 relative shadow-[inset_0_0_20px_rgba(0,0,0,0.6)]">
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-amber-400"></div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Áudio Capturado (Matriz)
                </span>
                {heardText !== '...' && (
                  <button 
                    onClick={() => copyToClipboard(heardText, 'heard')}
                    className="text-zinc-400 hover:text-white p-1 rounded transition"
                    title="Copiar texto capturado"
                  >
                    {copiedId === 'heard' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
              <div className="text-sm md:text-base leading-relaxed text-zinc-100 min-h-[75px] font-medium break-words">
                {heardText}
              </div>
            </div>

            <div className="bg-[#0b0202]/80 border border-white/10 rounded-2xl p-4 relative shadow-[inset_0_0_20px_rgba(0,0,0,0.6)]">
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400"></div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5" /> Saída de Tradução
                </span>
                {translatedText !== '...' && (
                  <button 
                    onClick={() => copyToClipboard(translatedText, 'translated')}
                    className="text-zinc-400 hover:text-white p-1 rounded transition"
                    title="Copiar tradução"
                  >
                    {copiedId === 'translated' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
              <div className="text-sm md:text-base leading-relaxed text-amber-200 min-h-[75px] font-medium break-words">
                {translatedText}
              </div>
            </div>
          </div>

          {/* DIAGNOSTIC LOGS HUD */}
          <div className="bg-[#0a0202]/60 border border-white/5 rounded-2xl p-3.5 mb-6 text-xs text-zinc-400 space-y-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Logs de Diagnóstico do Sistema PWA
            </div>
            <p>• Operador autenticado: <strong className="text-white">{currentUser.name}</strong> ({currentUser.email}).</p>
            <p>• Motor Cross-Language: Captura de fonemas em tempo real com buffer interim.</p>
            <p>• Buffer neural Fish Audio: Síntese de voz com failover dinâmico integrado.</p>
          </div>

          {/* HISTORY LOG */}
          {history.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-amber-300">
                  Histórico de Sessão ({history.length})
                </span>
                <button
                  onClick={() => setHistory([])}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 transition"
                >
                  Limpar
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#180404]/60 border-l-4 border-cyan-400 border-t border-r border-b border-white/5 text-xs text-zinc-200 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] text-cyan-300 font-bold uppercase">
                      <span>{item.detectedLang === 'pt' ? '🇧🇷 Português → 🇺🇸 English' : '🇺🇸 English → 🇧🇷 Português'}</span>
                      <span className="text-zinc-500">{item.timestamp}</span>
                    </div>
                    <p><strong className="text-zinc-400">Orig:</strong> {item.original}</p>
                    <p className="text-amber-300"><strong className="text-zinc-400">Trad:</strong> {item.translated}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FOOTER TIP */}
          <p className="text-center text-[11px] text-amber-300/80 font-bold mt-2">
            ⚡ Dica: Toque no Reator Arc para iniciar ou parar a qualquer momento.
          </p>
        </div>

        {/* COPYRIGHT & CREDITS */}
        <div className="mt-4 text-center text-xs text-zinc-500 tracking-wider">
          Matrix Code System v4.5 · Fish Audio TTS · PWA Edition · Powered by Romildo Coelho 2026
        </div>
      </main>

      {/* Offline Toast/Indicator */}
      <OfflineIndicator />

      {/* Admin Settings Modal with User CRUD and Fish Audio tabs */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />
    </div>
  );
}
