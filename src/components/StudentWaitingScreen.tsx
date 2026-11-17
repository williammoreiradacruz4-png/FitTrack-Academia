import { Bell, Hourglass, RefreshCw } from 'lucide-react';
import { ReminderSettings, StudentProfile } from '../types/workout';
import { WaterTrackerCard } from './WaterTrackerCard';
import { PWAInstallButton } from './PWAInstallButton';

interface StudentWaitingScreenProps {
  studentName: string;
  studentProfile: StudentProfile | null;
  academyName?: string;
  academyCode?: string;
  reminderSettings: ReminderSettings;
  isChecking: boolean;
  onRefreshCheck: () => void;
  onOpenReminders: () => void;
  onOpenLinkAcademy: () => void;
}

export function StudentWaitingScreen({
  studentName,
  studentProfile,
  academyName,
  academyCode,
  reminderSettings,
  isChecking,
  onRefreshCheck,
  onOpenReminders,
  onOpenLinkAcademy,
}: StudentWaitingScreenProps) {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Sidebar: Hydration & Daily Reminders stay active while awaiting prescription */}
      <aside className="lg:col-span-4 space-y-4">
        <WaterTrackerCard />

        <section
          aria-label="Lembretes de treino e água"
          className="bg-[#14161a] border border-zinc-800 rounded-2xl p-4 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#0b0c0e] border border-zinc-800 flex items-center justify-center shrink-0 text-orange-400">
              <Bell className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-100 truncate">
                Lembretes
              </p>
              <p className="text-xs text-zinc-400 truncate">
                {reminderSettings.workoutEnabled
                  ? `Treino ${reminderSettings.workoutTime} · ${reminderSettings.activeDays.length}d`
                  : reminderSettings.waterEnabled
                    ? `Água a cada ${reminderSettings.waterIntervalMinutes} min`
                    : 'Treino semanal e água'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenReminders}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-zinc-700 hover:border-orange-500/50 text-xs font-semibold text-zinc-200 hover:text-orange-300 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            Configurar
          </button>
        </section>

        <PWAInstallButton variant="card" />
      </aside>

      {/* Main Waiting Card */}
      <section className="lg:col-span-8">
        <div className="bg-[#14161a] border border-dashed border-orange-500/60 rounded-2xl px-6 py-10 sm:py-14 text-center max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#0b0c0e] border border-orange-500/40 flex items-center justify-center mx-auto mb-5 text-orange-400">
            <Hourglass className="w-8 h-8" aria-hidden="true" />
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-50 leading-tight">
            Treino em preparação
          </h2>

          <p className="text-sm sm:text-base text-zinc-300 mt-3 leading-relaxed max-w-md mx-auto">
            Olá, <span className="font-semibold text-orange-400">{studentName}</span>! Seu pré-cadastro está concluído. Aguarde seu professor realizar sua avaliação física e liberar seu treino personalizado.
          </p>

          {(academyName || academyCode) && (
            <p className="text-xs text-purple-300 mt-3">
              Vinculado a: <span className="font-semibold">{academyName ?? academyCode}</span>
              {academyCode && (
                <>
                  {' '}
                  · Cód: <span className="font-mono">{academyCode}</span>
                </>
              )}
            </p>
          )}

          {studentProfile && (
            <div className="mt-5 pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs text-zinc-400 font-mono tabular-nums">
              <span>{studentProfile.formattedCpf}</span>
              <span aria-hidden="true">·</span>
              <span>{studentProfile.age} anos</span>
              <span aria-hidden="true">·</span>
              <span>{studentProfile.biologicalSex}</span>
              {studentProfile.phone && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{studentProfile.phone}</span>
                </>
              )}
              {studentProfile.goal && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-sans text-zinc-300">{studentProfile.goal}</span>
                </>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onRefreshCheck}
              disabled={isChecking}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-zinc-950 text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw
                className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{isChecking ? 'Verificando...' : 'Verificar liberação do treino'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenLinkAcademy}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-zinc-700 hover:border-purple-500/50 text-xs font-medium text-zinc-300 hover:text-purple-300 transition-colors cursor-pointer"
            >
              Trocar academia
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
