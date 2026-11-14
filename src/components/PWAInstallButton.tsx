import { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'card';
}

export function PWAInstallButton({ variant = 'header' }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (variant === 'header' && !isInstallable && !isIOS) {
    return null;
  }

  const handleAction = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuideModal(true);
  };

  return (
    <>
      {variant === 'header' ? (
        <button
          type="button"
          onClick={handleAction}
          className="min-h-[44px] px-3 py-2 rounded-lg border border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{isIOS ? 'Instalar no iOS' : 'Instalar App'}</span>
        </button>
      ) : (
        <section
          aria-label="Instalar aplicativo"
          className="bg-[#14161a] border border-zinc-800 rounded-2xl p-4 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/assets/aistudio/1ae390dc-9fe8-438a-8f60-757249d5934f_9f41c830.png"
              alt="Logo FitTrack Academia"
              className="w-12 h-12 rounded-xl bg-white object-contain p-1 shrink-0 border border-zinc-700"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-100 truncate">
                FitTrack App
              </p>
              <p className="text-xs text-zinc-400 truncate">
                Use offline na academia
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAction}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isInstallable ? 'Instalar' : 'Como instalar'}</span>
          </button>
        </section>
      )}

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGuideModal(false);
          }}
        >
          <div className="w-full sm:max-w-sm bg-[#14161a] border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/aistudio/1ae390dc-9fe8-438a-8f60-757249d5934f_9f41c830.png"
                  alt="FitTrack Academia"
                  className="w-12 h-12 rounded-xl bg-white object-contain p-1 shrink-0 border border-zinc-700"
                />
                <div>
                  <h3 id="pwa-guide-title" className="font-display text-xl font-bold text-zinc-50">
                    Instalar FitTrack
                  </h3>
                  <p className="text-xs text-zinc-400">Acesso direto pela tela inicial</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="Fechar instruções"
                className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-3 text-sm text-zinc-300">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-xs font-bold text-orange-400 mt-0.5">1.</span>
                  <span>
                    Toque no botão <strong className="text-zinc-100 inline-flex items-center gap-1">Compartilhar <Share className="w-3.5 h-3.5 inline" aria-hidden="true" /></strong> na barra do Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-xs font-bold text-orange-400 mt-0.5">2.</span>
                  <span>
                    Role para baixo e selecione <strong className="text-zinc-100">Adicionar à Tela de Início</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-xs font-bold text-orange-400 mt-0.5">3.</span>
                  <span>
                    Confirme tocando em <strong className="text-zinc-100">Adicionar</strong>.
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-3 text-sm text-zinc-300">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-xs font-bold text-orange-400 mt-0.5">1.</span>
                  <span>
                    No menu do navegador (Chrome ou Edge), abra as opções ou clique no ícone de instalação na barra de endereço.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-xs font-bold text-orange-400 mt-0.5">2.</span>
                  <span>
                    Selecione <strong className="text-zinc-100">Instalar FitTrack Academia</strong> para usar em tela cheia e offline.
                  </span>
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-100 transition-colors cursor-pointer"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
