import { useState } from 'react';
import { Building2, Check, LogOut, Plus, RotateCcw } from 'lucide-react';
import { UserSession } from '../types/workout';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  session: UserSession;
  completedCount: number;
  totalCount: number;
  showWorkoutActions: boolean;
  onResetChecks: () => void;
  onOpenNewModal: () => void;
  onAcademyBadgeClick: () => void;
  onLogout: () => void;
}

export function Header({
  session,
  completedCount,
  totalCount,
  showWorkoutActions,
  onResetChecks,
  onOpenNewModal,
  onAcademyBadgeClick,
  onLogout,
}: HeaderProps) {
  const [copied, setCopied] = useState(false);
  const isProfessor = session.role === 'professor';
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleAcademyAction = async () => {
    if (isProfessor && session.academyCode) {
      try {
        await navigator.clipboard.writeText(session.academyCode);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        // Ignore clipboard errors in restricted browsers
      }
      return;
    }
    onAcademyBadgeClick();
  };

  return (
    <header className="sticky top-0 z-40 h-[56px] bg-[#14161a]/95 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/assets/aistudio/1ae390dc-9fe8-438a-8f60-757249d5934f_9f41c830.png"
            alt="FitTrack Academia"
            className="w-8 h-8 rounded-lg bg-white object-contain p-0.5 shrink-0"
          />
          <div className="min-w-0 leading-tight">
            {isProfessor ? (
              <span className="block font-display text-lg sm:text-xl font-bold tracking-tight text-purple-300 whitespace-nowrap truncate max-w-[150px] sm:max-w-[260px]">
                {session.academyName ?? 'Modo Professor'}
              </span>
            ) : (
              <span
                className="block font-display text-lg sm:text-xl font-bold tracking-tight text-zinc-100 whitespace-nowrap truncate max-w-[140px] sm:max-w-[240px]"
                title={`Olá, ${session.name}`}
              >
                Olá, <span className="text-orange-500">{session.name}</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleAcademyAction()}
            title={
              isProfessor
                ? 'Copiar código de convite da academia'
                : 'Alterar academia ou personal vinculado'
            }
            className="hidden sm:inline-flex min-h-[36px] px-2.5 py-1 rounded-lg bg-[#0b0c0e] border border-purple-500/35 hover:border-purple-400 text-[11px] font-medium text-purple-300 items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
                <span className="text-orange-300">Código copiado</span>
              </>
            ) : (
              <>
                <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="max-w-[150px] truncate">
                  {isProfessor
                    ? `Cód: ${session.academyCode ?? ''}`
                    : (session.academyName ?? session.academyCode ?? 'Vincular academia')}
                </span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {showWorkoutActions && (
            <span className="text-xs font-mono tabular-nums text-zinc-300 hidden md:inline whitespace-nowrap shrink-0 mr-1">
              {completedCount}/{totalCount}
            </span>
          )}

          <PWAInstallButton variant="header" />

          {showWorkoutActions && (
            <button
              type="button"
              onClick={onResetChecks}
              disabled={completedCount === 0}
              className="min-h-[44px] px-2.5 sm:px-3 py-2 rounded-lg border border-zinc-700 text-xs font-medium text-zinc-300 hover:text-zinc-50 hover:border-zinc-600 hover:bg-zinc-800/70 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Zerar Treino</span>
            </button>
          )}

          {isProfessor && showWorkoutActions && (
            <button
              type="button"
              onClick={onOpenNewModal}
              className="hidden sm:flex min-h-[44px] px-3.5 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-zinc-950 text-xs font-bold transition-colors items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Novo Exercício</span>
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="min-h-[44px] px-2.5 sm:px-3 py-2 rounded-lg border border-rose-500/35 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sair</span>
          </button>
        </div>
      </div>

      {/* Integrated bottom progress hairline */}
      {showWorkoutActions && (
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
      )}
    </header>
  );
}
