import { useEffect, useState } from 'react';
import { Bell, Dumbbell, Play, Pause, RotateCcw, Timer } from 'lucide-react';
import { Exercise, FilterOption, MUSCLE_GROUPS, ReminderSettings, UNASSIGNED_MUSCLE } from '../types/workout';
import { PWAInstallButton } from './PWAInstallButton';
import { WaterTrackerCard } from './WaterTrackerCard';

interface WorkoutSummaryProps {
  exercises: Exercise[];
  isProfessor: boolean;
  activeFilter: FilterOption;
  reminderSettings: ReminderSettings;
  onSelectFilter: (filter: FilterOption) => void;
  onOpenReminders: () => void;
}

const PRESET_SECONDS = [60, 90, 120];

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function playBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Ignore audio errors if blocked by browser autoplay policy
  }
}

export function WorkoutSummary({
  exercises,
  isProfessor,
  activeFilter,
  reminderSettings,
  onSelectFilter,
  onOpenReminders,
}: WorkoutSummaryProps) {
  const totalCount = exercises.length;
  const completedCount = exercises.filter((ex) => ex.completed).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const totalCompletedWeight = exercises
    .filter((ex) => ex.completed)
    .reduce((acc, ex) => acc + (Number(ex.weight) || 0), 0);

  const [duration, setDuration] = useState<number>(90);
  const [remaining, setRemaining] = useState<number>(90);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [finishedAlert, setFinishedAlert] = useState<boolean>(false);

  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          setFinishedAlert(true);
          playBeep();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRunning]);

  const handleSelectPreset = (sec: number) => {
    setDuration(sec);
    setRemaining(sec);
    setIsRunning(false);
    setFinishedAlert(false);
  };

  const handleToggleTimer = () => {
    if (remaining === 0) {
      setRemaining(duration);
      setFinishedAlert(false);
      setIsRunning(true);
      return;
    }
    setFinishedAlert(false);
    setIsRunning((prev) => !prev);
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setRemaining(duration);
    setFinishedAlert(false);
  };

  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const unassignedTotal = isProfessor
    ? exercises.filter((ex) => ex.muscle === UNASSIGNED_MUSCLE).length
    : 0;

  const groupStats = MUSCLE_GROUPS.map((group) => {
    const items = exercises.filter((ex) => ex.muscle === group);
    return {
      group,
      total: items.length,
      done: items.filter((ex) => ex.completed).length,
    };
  }).filter((g) => g.total > 0);

  return (
    <aside className="space-y-4 lg:sticky lg:top-[76px]">
      {isProfessor ? (
        <section
          aria-label="Resumo da biblioteca"
          className="bg-[#14161a] border border-zinc-800 rounded-2xl p-5 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-orange-500/15 border border-orange-500/35 flex items-center justify-center shrink-0 text-orange-400">
              <Dumbbell className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-400">Biblioteca do Professor</p>
              <p className="text-xl font-bold font-mono tabular-nums text-zinc-50 mt-0.5">
                {totalCount} exercício{totalCount === 1 ? '' : 's'}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {groupStats.length} grupo{groupStats.length === 1 ? '' : 's'} muscular{groupStats.length === 1 ? '' : 'es'}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* Progress & Volume Card (Student only) */}
          <section
            aria-label="Resumo do treino"
            className="bg-[#14161a] border border-zinc-800 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
                    <circle
                      cx="32"
                      cy="32"
                      r={radius}
                      fill="none"
                      stroke="#27272a"
                      strokeWidth="6"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r={radius}
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-[stroke-dashoffset] duration-300 ease-out"
                    />
                  </svg>
                  <span className="absolute font-mono tabular-nums text-xs font-semibold text-zinc-100">
                    {progressPercent}%
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-400">Progresso do dia</p>
                  <p className="text-xl font-bold font-mono tabular-nums text-zinc-50 mt-0.5">
                    {completedCount} de {totalCount}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {completedCount === totalCount && totalCount > 0
                      ? 'Treino finalizado'
                      : 'exercícios concluídos'}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 pl-3 border-l border-zinc-800">
                <p className="text-xs font-medium text-zinc-400">Carga concluída</p>
                <p className="text-xl font-bold font-mono tabular-nums text-orange-400 mt-0.5">
                  {totalCompletedWeight} <span className="text-xs font-normal text-zinc-400">kg</span>
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">soma ativa</p>
              </div>
            </div>
          </section>

          {/* Rest Timer (Student only) */}
          <section
            aria-label="Cronômetro de descanso"
            className="bg-[#14161a] border border-zinc-800 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <Timer className="w-4 h-4 text-orange-400" aria-hidden="true" />
                <h2>Descanso entre séries</h2>
              </div>
              {finishedAlert && (
                <span className="text-xs font-semibold text-orange-400">Tempo esgotado</span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <div
                className={`font-mono tabular-nums text-3xl font-bold tracking-tight ${
                  finishedAlert
                    ? 'text-orange-400'
                    : isRunning
                      ? 'text-zinc-50'
                      : 'text-zinc-200'
                }`}
              >
                {formatTime(remaining)}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleTimer}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-4 h-4" aria-hidden="true" />
                      <span>Pausar</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" aria-hidden="true" />
                      <span>{remaining === 0 ? 'Repetir' : 'Iniciar'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResetTimer}
                  aria-label="Reiniciar cronômetro"
                  className="min-h-[44px] min-w-[44px] rounded-xl border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/70 text-zinc-300 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-zinc-800/80">
              {PRESET_SECONDS.map((sec) => {
                const active = duration === sec;
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => handleSelectPreset(sec)}
                    className={`min-h-[40px] rounded-lg text-xs font-mono tabular-nums font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                      active
                        ? 'bg-zinc-900 text-orange-400 border border-orange-500/40'
                        : 'bg-[#0b0c0e] text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    {sec}s
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Muscle Breakdown (Desktop sidebar focus) */}
      {(groupStats.length > 0 || unassignedTotal > 0) && (
        <section
          aria-label="Divisão por grupo muscular"
          className="hidden lg:block bg-[#14161a] border border-zinc-800 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-100">Grupos Musculares</h2>
            {activeFilter !== 'Todos' && (
              <button
                type="button"
                onClick={() => onSelectFilter('Todos')}
                className="text-xs font-medium text-orange-400 hover:text-orange-300 cursor-pointer"
              >
                Ver todos
              </button>
            )}
          </div>

          <div className="divide-y divide-zinc-800/80">
            {unassignedTotal > 0 && (
              <button
                type="button"
                onClick={() =>
                  onSelectFilter(
                    activeFilter === UNASSIGNED_MUSCLE ? 'Todos' : UNASSIGNED_MUSCLE
                  )
                }
                className={`w-full min-h-[44px] py-2 px-2 -mx-2 rounded-lg flex items-center justify-between text-sm transition-colors cursor-pointer ${
                  activeFilter === UNASSIGNED_MUSCLE
                    ? 'bg-amber-500/15 text-amber-300 font-semibold'
                    : 'text-amber-300 hover:bg-amber-500/10 font-medium'
                }`}
              >
                <span>Sem grupo (organizar)</span>
                <span className="font-mono tabular-nums text-xs text-amber-300">
                  {unassignedTotal}
                </span>
              </button>
            )}
            {groupStats.map(({ group, done, total }) => {
              const isSelected = activeFilter === group;
              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => onSelectFilter(isSelected ? 'Todos' : group)}
                  className={`w-full min-h-[44px] py-2 px-2 -mx-2 rounded-lg flex items-center justify-between text-sm transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-orange-500/10 text-orange-300 font-semibold'
                      : 'text-zinc-300 hover:bg-zinc-800/40'
                  }`}
                >
                  <span>{group}</span>
                  <span className="font-mono tabular-nums text-xs text-zinc-400">
                    {isProfessor ? `${total}` : `${done}/${total}`}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {!isProfessor && (
        <>
          <WaterTrackerCard />

          {/* Reminders Trigger Card (Student only) */}
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
              className="min-h-[44px] px-3.5 py-2 rounded-xl border border-zinc-700 hover:border-orange-500/50 text-xs font-semibold text-zinc-200 hover:text-orange-300 whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              Configurar
            </button>
          </section>
        </>
      )}

      <PWAInstallButton variant="card" />
    </aside>
  );
}
