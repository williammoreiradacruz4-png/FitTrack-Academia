import { RotateCcw, Plus } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  completedCount: number;
  totalCount: number;
  onResetChecks: () => void;
  onOpenNewModal: () => void;
}

export function Header({
  completedCount,
  totalCount,
  onResetChecks,
  onOpenNewModal,
}: HeaderProps) {
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <header className="sticky top-0 z-40 h-[52px] bg-[#14161a]/95 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/assets/aistudio/1ae390dc-9fe8-438a-8f60-757249d5934f_9f41c830.png"
            alt="FitTrack Academia"
            className="w-8 h-8 rounded-lg bg-white object-contain p-0.5 shrink-0"
          />
          <span className="font-display text-2xl font-bold tracking-tight text-zinc-100 whitespace-nowrap shrink-0">
            Fit<span className="text-orange-500">Track</span>{' '}
            <span className="text-zinc-300 font-semibold">Academia</span>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="text-xs font-mono tabular-nums text-zinc-300 hidden sm:inline whitespace-nowrap shrink-0">
            {completedCount}/{totalCount}
          </span>

          <PWAInstallButton variant="header" />

          <button
            type="button"
            onClick={onResetChecks}
            disabled={completedCount === 0}
            className="min-h-[44px] px-3 py-2 rounded-lg border border-zinc-700 text-xs font-medium text-zinc-300 hover:text-zinc-50 hover:border-zinc-600 hover:bg-zinc-800/70 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Zerar Treino</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewModal}
            className="hidden sm:flex min-h-[44px] px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-zinc-950 text-xs font-bold transition-colors items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Novo Exercício</span>
          </button>
        </div>
      </div>

      {/* Integrated bottom progress hairline */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[3px] bg-zinc-800/90 overflow-hidden"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso diário do treino"
      >
        <div
          className="h-full bg-orange-500 transition-[width] duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </header>
  );
}
