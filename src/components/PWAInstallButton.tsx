import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-xl bg-white/20 hover:bg-white/30 text-white px-3 py-2 text-xs font-semibold tracking-wide transition shadow-sm w-full justify-start cursor-pointer"
        title="Instalar aplicativo no seu dispositivo"
      >
        <Download className="w-4 h-4 text-white" />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-xl bg-white/20 hover:bg-white/30 text-white px-3 py-2 text-xs font-semibold tracking-wide transition shadow-sm w-full justify-start cursor-pointer"
          title="Instalar aplicativo no iPhone/iPad"
        >
          <Smartphone className="w-4 h-4 text-white" />
          <span>Instalar no iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-500" />
                  Instalar no iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ol className="mt-3 space-y-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600 dark:text-blue-400">1.</span>
                  <span>Toque no botão <strong>Compartilhar</strong> (ícone com quadrado e seta) na barra do Safari.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600 dark:text-blue-400">2.</span>
                  <span>Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600 dark:text-blue-400">3.</span>
                  <span>Confirme tocando em <strong>Adicionar</strong> no canto superior direito.</span>
                </li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 text-sm font-semibold text-white transition shadow"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
