import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, Printer, QrCode, X } from 'lucide-react';
import { buildAcademyInviteUrl } from '../types/workout';

interface QrCodeModalProps {
  isOpen: boolean;
  academyCode: string;
  academyName: string;
  academyLogo?: string;
  onClose: () => void;
}

export function QrCodeModal({
  isOpen,
  academyCode,
  academyName,
  academyLogo,
  onClose,
}: QrCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  const inviteUrl = buildAcademyInviteUrl(academyCode);

  useEffect(() => {
    if (!isOpen || !academyCode) return;
    let active = true;
    void QRCode.toDataURL(inviteUrl, {
      width: 720,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });

    return () => {
      active = false;
    };
  }, [isOpen, academyCode, inviteUrl]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Ignore clipboard errors in restricted contexts
    }
  };

  const handleDownloadPng = async () => {
    if (!qrDataUrl) return;

    try {
      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => reject(new Error('QR image load error'));
      });

      const canvas = document.createElement('canvas');
      const width = 900;
      const height = 1160;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Crisp white reception plaque background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Border frame
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 8;
      ctx.strokeRect(24, 24, width - 48, height - 48);

      // Top brand accent strip
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(24, 24, width - 48, 128);

      if (academyLogo) {
        try {
          const logoImg = new Image();
          logoImg.src = academyLogo;
          await new Promise<void>((resolve, reject) => {
            logoImg.onload = () => resolve();
            logoImg.onerror = () => reject(new Error('Logo image load error'));
          });
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(54, 44, 88, 88);
          ctx.drawImage(logoImg, 58, 48, 80, 80);
        } catch {
          // Ignore optional logo load error in canvas
        }
      }

      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FITTRACK ACADEMIA · ACESSO DO ALUNO', width / 2, 74);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 40px sans-serif';
      ctx.fillText(academyName.slice(0, 28), width / 2, 126);

      // Centered high-res QR code
      const qrSize = 620;
      const qrX = (width - qrSize) / 2;
      const qrY = 185;
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Manual Code box
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(110, 835, width - 220, 96);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 3;
      ctx.strokeRect(110, 835, width - 220, 96);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 40px monospace';
      ctx.fillText(`Código: ${academyCode}`, width / 2, 897);

      // Instructions
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(
        '1. Aponte a câmera do celular  •  2. Instale o App na tela inicial',
        width / 2,
        995
      );
      ctx.fillText('3. Faça seu pré-cadastro automático', width / 2, 1035);

      ctx.fillStyle = '#64748b';
      ctx.font = '20px monospace';
      ctx.fillText(inviteUrl, width / 2, 1095);

      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `qrcode-${academyCode.toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // Fallback: download raw QR PNG directly
      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = `qrcode-${academyCode.toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="qr-print-modal-backdrop fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="qr-print-modal-card w-full max-w-lg bg-[#14161a] border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 my-auto">
        {/* Modal Header (Hidden on Print) */}
        <div className="no-print flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <QrCode className="w-5 h-5 text-orange-400 shrink-0" aria-hidden="true" />
            <h2
              id="qr-modal-title"
              className="font-display text-2xl font-bold text-zinc-50 truncate"
            >
              Cartaz de Acesso para Alunos
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal de QR Code"
            className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Printable Reception Counter Plaque */}
        <div className="qr-print-sheet bg-white text-slate-900 rounded-2xl border-2 border-slate-900 overflow-hidden shadow-lg">
          <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-center gap-3 text-center">
            {academyLogo && (
              <img
                src={academyLogo}
                alt={academyName}
                className="w-12 h-12 rounded-xl bg-white object-contain p-1 shrink-0"
              />
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-orange-400">
                FitTrack Academia · Acesso Rápido
              </p>
              <h3 className="font-display text-2xl sm:text-3xl font-bold mt-1 leading-tight">
                {academyName}
              </h3>
            </div>
          </div>

          <div className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code de acesso para ${academyName}`}
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-500">
                  Gerando QR Code...
                </div>
              )}
            </div>

            <div className="w-full max-w-xs bg-slate-100 border border-slate-300 rounded-xl px-4 py-2.5">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                Código manual de vínculo
              </p>
              <p className="text-xl font-mono font-bold text-slate-900 tracking-wide mt-0.5">
                Código: {academyCode}
              </p>
            </div>

            <div className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed max-w-sm">
              1. Aponte a câmera do celular · 2. Instale o App na tela inicial · 3. Faça seu pré-cadastro
            </div>

            <p className="text-[11px] font-mono text-slate-500 break-all">
              {inviteUrl}
            </p>
          </div>
        </div>

        {/* Official Link Copy Bar (Hidden on Print) */}
        <div className="no-print bg-[#0b0c0e] border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-2.5">
          <div className="min-w-0">
            <p className="text-[11px] text-zinc-400">Link oficial de auto-vínculo</p>
            <p className="text-xs font-mono text-orange-400 truncate">
              {inviteUrl}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleCopyUrl()}
            className="min-h-[40px] px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-orange-500/50 text-xs font-semibold text-zinc-200 hover:text-orange-300 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <span className="text-emerald-300">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copiar link</span>
              </>
            )}
          </button>
        </div>

        {/* Download & Print Actions (Hidden on Print) */}
        <div className="no-print grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void handleDownloadPng()}
            disabled={!qrDataUrl}
            className="min-h-[46px] px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-zinc-950 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Baixar QR Code (PNG)</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="min-h-[46px] px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            <span>Imprimir Placa</span>
          </button>
        </div>
      </div>
    </div>
  );
}
