import React, { useState } from 'react';
import { 
  UserPlus, 
  LogIn, 
  Shield, 
  Sparkles, 
  Phone, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface AuthLandingProps {
  onLoginSuccess: (user: any, isAdmin: boolean) => void;
  onOpenAdminModal: () => void;
}

export const AuthLanding: React.FC<AuthLandingProps> = ({ onLoginSuccess, onOpenAdminModal }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  
  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regConfirmPass, setRegConfirmPass] = useState('');
  
  // UI states
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Phone input formatting
  const handlePhoneChange = (val: string) => {
    // Only numbers
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) {
      setRegPhone(digits.length > 0 ? `(${digits}` : '');
    } else if (digits.length <= 6) {
      setRegPhone(`(${digits.slice(0, 2)}) ${digits.slice(2)}`);
    } else if (digits.length <= 10) {
      setRegPhone(`(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`);
    } else {
      setRegPhone(`(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao autenticar.');

      setSuccessMsg('Acesso autorizado! Carregando Babel Ultra...');
      setTimeout(() => {
        onLoginSuccess(data.user, data.isAdmin);
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (regPass.length < 4) {
      setErrorMsg('A senha deve ter no mínimo 4 caracteres.');
      return;
    }

    if (regPass !== regConfirmPass) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          phone: regPhone,
          password: regPass
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao realizar cadastro.');

      setSuccessMsg('Cadastro realizado com sucesso! Inicializando perfil...');
      setTimeout(() => {
        onLoginSuccess(data.user, false);
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Demo Guest Access
  const handleGuestAccess = () => {
    const guestUser = {
      id: 'guest_' + Date.now(),
      name: 'Operador Convidado',
      email: 'convidado@babel.ai',
      phone: '(11) 99999-9999',
      createdAt: new Date().toISOString(),
      role: 'user'
    };
    onLoginSuccess(guestUser, false);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#080202] text-[#fff6e5] flex flex-col justify-between overflow-x-hidden selection:bg-[#ffb347] selection:text-black">
      {/* Background HUD tech grid */}
      <div className="fixed inset-0 hud-grid pointer-events-none z-0 opacity-40"></div>

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between border-b border-amber-500/20 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img 
            src="/pwa-192x192.png" 
            alt="Babel Ultra" 
            className="w-9 h-9 rounded-xl border border-amber-500/40 shadow-[0_0_12px_rgba(255,179,71,0.3)] object-cover"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-widest text-amber-400">BABEL ULTRA AI</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
                PORTAL HUD
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 hidden sm:block">Acesso Biométrico & Cadastro de Operadores</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <PWAInstallButton />
          <button
            onClick={onOpenAdminModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-xs tracking-wider transition cursor-pointer"
            title="Acessar Painel Administrativo Fish Audio e Usuários"
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Admin</span>
          </button>
        </div>
      </header>

      {/* Center Auth Card */}
      <main className="relative z-10 flex-1 w-full max-w-lg mx-auto px-4 py-8 flex flex-col justify-center items-center">
        <div className="w-full bg-[#140404]/90 backdrop-blur-2xl border-2 border-orange-600/40 rounded-3xl p-6 md:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_50px_rgba(255,70,0,0.2)] scanline-effect relative overflow-hidden">
          
          {/* Logo & Headline */}
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-cyan-500/10 border border-amber-500/40 mb-3 shadow-[0_0_20px_rgba(255,179,71,0.25)]">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider drop-shadow-md">
              Babel Ultra AI
            </h1>
            <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest mt-1">
              Tradutor de Voz em Tempo Real · Jarvis Edition
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1.5 bg-black/60 rounded-2xl border border-amber-500/30 mb-6">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                tab === 'login'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-[0_0_15px_rgba(255,100,0,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar (Login)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab('register');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                tab === 'register'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-[0_0_15px_rgba(255,100,0,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Cadastrar</span>
            </button>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="mb-4 flex items-center gap-2.5 p-3.5 rounded-xl bg-red-950/70 border border-red-500/50 text-red-300 text-xs font-semibold animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs font-semibold animate-fadeIn">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {tab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-extrabold text-amber-300 tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>E-mail ou Usuário</span>
                </label>
                <input
                  type="text"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="ex: tony@starkindustries.com ou admin"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-amber-500/30 text-white placeholder-zinc-500 text-sm focus:border-cyan-400 focus:outline-none transition shadow-inner font-medium"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-extrabold text-amber-300 tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Senha</span>
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-2.5 pr-10 rounded-xl bg-black/60 border border-amber-500/30 text-white placeholder-zinc-500 text-sm focus:border-cyan-400 focus:outline-none transition shadow-inner font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-3 text-zinc-400 hover:text-white transition"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:brightness-125 text-white font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(255,100,0,0.35)] transition transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isLoading ? 'Autenticando...' : 'Entrar no Sistema'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleGuestAccess}
                  className="w-full py-2.5 rounded-xl bg-black/50 hover:bg-white/5 border border-cyan-400/30 text-cyan-300 hover:text-cyan-200 font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Acesso Convidado (Demonstração)</span>
                </button>

                <div className="text-center text-[11px] text-zinc-500">
                  Dica Admin: utilize usuário <strong className="text-amber-400">admin</strong> e senha <strong className="text-amber-400">babel2026</strong>.
                </div>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {tab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs uppercase font-extrabold text-amber-300 tracking-wider mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>Nome Completo</span>
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-amber-500/30 text-white placeholder-zinc-500 text-sm focus:border-cyan-400 focus:outline-none transition font-medium"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-extrabold text-amber-300 tracking-wider mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>E-mail</span>
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-amber-500/30 text-white placeholder-zinc-500 text-sm focus:border-cyan-400 focus:outline-none transition font-medium"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-extrabold text-amber-300 tracking-wider mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>Telefone / WhatsApp</span>
                </label>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(11) 99999-9999"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-amber-500/30 text-white placeholder-zinc-500 text-sm focus:border-cyan-400 focus:outline-none transition font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase font-extrabold text-amber-300 tracking-wider mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Senha</span>
                  </label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    placeholder="Mín. 4 dígitos"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-amber-500/30 text-white placeholder-zinc-500 text-sm focus:border-cyan-400 focus:outline-none transition font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-extrabold text-amber-300 tracking-wider mb-1 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Confirmar</span>
                  </label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={regConfirmPass}
                    onChange={(e) => setRegConfirmPass(e.target.value)}
                    placeholder="Repita a senha"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-amber-500/30 text-white placeholder-zinc-500 text-sm focus:border-cyan-400 focus:outline-none transition font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPass}
                    onChange={(e) => setShowPass(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <span>Mostrar senhas</span>
                </label>
                <span>Registro criptografado</span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:brightness-125 text-white font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(255,100,0,0.35)] transition transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isLoading ? 'Registrando...' : 'Cadastrar & Acessar Babel Ultra'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

        </div>

        {/* Footer info */}
        <p className="mt-4 text-center text-xs text-zinc-500 tracking-wider">
          PWA & Síntese Vocal Fish Audio · 2026 Edition · Powered by Romildo Coelho
        </p>
      </main>

      {/* Empty space for bottom balance */}
      <div className="h-4"></div>
    </div>
  );
};
