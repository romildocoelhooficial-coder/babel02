import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download, Share, PlusSquare, X, CheckCircle, Smartphone } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already running as an installed standalone PWA, hide the button
  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-semibold tracking-wider">
        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
        <span>PWA INSTALADO</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      await install();
    } finally {
      setIsInstalling(false);
    }
  };

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={handleInstallClick}
        disabled={isInstalling}
        title="Instalar Babel Ultra AI no seu dispositivo"
        className="relative group flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 via-cyan-400/30 to-amber-500/20 hover:from-cyan-500/40 hover:to-amber-500/40 border border-cyan-400/60 text-cyan-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-[0_0_15px_rgba(0,240,255,0.25)] hover:shadow-[0_0_25px_rgba(0,240,255,0.5)] active:scale-95 cursor-pointer"
      >
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
        </span>
        <Download className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition-transform" />
        <span>Instalar App PWA</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          title="Como instalar no iPhone/iPad"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold text-xs uppercase tracking-wider transition cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          <span>Instalar no iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
            <div className="w-full max-w-sm rounded-2xl bg-[#140505] border border-amber-500/40 p-6 shadow-2xl relative text-left">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <img src="/pwa-192x192.png" alt="Babel Ultra" className="w-12 h-12 rounded-xl border border-amber-500/30" />
                <div>
                  <h3 className="text-base font-bold text-amber-400 uppercase tracking-wider">Instalar no iPhone / iPad</h3>
                  <p className="text-xs text-zinc-400">Adicione à tela inicial em 2 passos</p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs text-zinc-300 bg-black/40 p-3.5 rounded-xl border border-white/5">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 shrink-0">
                    <Share className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">1. Toque em Compartilhar</p>
                    <p className="text-zinc-400">Na barra de ferramentas inferior do Safari.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-950/80 text-amber-400 border border-amber-500/30 shrink-0">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">2. Adicionar à Tela de Início</p>
                    <p className="text-zinc-400">Role para baixo no menu e toque nesta opção.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-red-700 hover:from-amber-500 hover:to-red-600 font-bold text-xs uppercase tracking-wider text-white shadow-lg transition"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback for browsers that don't trigger beforeinstallprompt yet
  return (
    <button
      onClick={() => {
        alert('Para instalar: no Chrome ou Edge clique no ícone de instalação (computador com seta) na barra de endereço, ou no celular toque em Menu (⋮) → Adicionar à tela inicial.');
      }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-medium transition cursor-pointer"
      title="Informações de instalação PWA"
    >
      <Download className="w-3.5 h-3.5 text-cyan-400" />
      <span>Instalar PWA</span>
    </button>
  );
};
