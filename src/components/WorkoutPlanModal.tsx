import { FormEvent, useEffect, useState } from 'react';
import { CalendarRange, X } from 'lucide-react';
import {
  DAYS_META,
  DayOfWeek,
  DayPlanMode,
  MUSCLE_GROUPS,
  MuscleGroup,
  ScheduleRange,
  WorkoutPlan,
  formatDayPlanSummary,
  getDaysForRange,
  getModeLimit,
} from '../types/workout';

interface WorkoutPlanModalProps {
  isOpen: boolean;
  initialPlan: WorkoutPlan;
  initialDay?: DayOfWeek;
  onClose: () => void;
  onSave: (plan: WorkoutPlan) => void;
}

const MODE_OPTIONS: { id: DayPlanMode; label: string }[] = [
  { id: 'simples', label: 'Simples (1)' },
  { id: 'conjugado2', label: 'Conjugado (2)' },
  { id: 'conjugado3', label: 'Conjugado (3)' },
  { id: 'conjugado4', label: 'Conjugado (4)' },
  { id: 'conjugado5', label: 'Conjugado (5)' },
  { id: 'conjugado6', label: 'Conjugado (6)' },
  { id: 'descanso', label: 'Descanso' },
];

const RANGE_OPTIONS: { id: ScheduleRange; label: string }[] = [
  { id: '5', label: 'Seg a Sex' },
  { id: '6', label: 'Seg a Sáb' },
  { id: '7', label: 'Seg a Dom' },
];

export function WorkoutPlanModal({
  isOpen,
  initialPlan,
  initialDay = 'seg',
  onClose,
  onSave,
}: WorkoutPlanModalProps) {
  const [draftPlan, setDraftPlan] = useState<WorkoutPlan>(initialPlan);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(initialDay);

  useEffect(() => {
    if (!isOpen) return;
    setDraftPlan(JSON.parse(JSON.stringify(initialPlan)) as WorkoutPlan);
    const activeDays = getDaysForRange(initialPlan.range);
    const dayExists = activeDays.some((d) => d.id === initialDay);
    setSelectedDay(dayExists ? initialDay : 'seg');
  }, [isOpen, initialPlan, initialDay]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeDays = getDaysForRange(draftPlan.range);
  const currentDayPlan = draftPlan.days[selectedDay];
  const currentDayMeta = DAYS_META.find((d) => d.id === selectedDay) ?? DAYS_META[0];
  const maxMuscles = getModeLimit(currentDayPlan.mode);

  const handleRangeChange = (range: ScheduleRange) => {
    const allowedDays = getDaysForRange(range);
    setDraftPlan((prev) => ({ ...prev, range }));
    if (!allowedDays.some((d) => d.id === selectedDay)) {
      setSelectedDay('seg');
    }
  };

  const handleModeChange = (mode: DayPlanMode) => {
    const limit = getModeLimit(mode);
    setDraftPlan((prev) => {
      const existing = prev.days[selectedDay];
      const trimmedMuscles = limit === 0 ? [] : existing.muscles.slice(0, limit);
      return {
        ...prev,
        days: {
          ...prev.days,
          [selectedDay]: {
            ...existing,
            mode,
            muscles: trimmedMuscles,
          },
        },
      };
    });
  };

  const handleToggleMuscle = (muscle: MuscleGroup) => {
    if (maxMuscles === 0) return;
    setDraftPlan((prev) => {
      const existing = prev.days[selectedDay];
      const hasMuscle = existing.muscles.includes(muscle);
      let nextMuscles: MuscleGroup[];

      if (hasMuscle) {
        nextMuscles = existing.muscles.filter((m) => m !== muscle);
      } else if (existing.muscles.length < maxMuscles) {
        nextMuscles = [...existing.muscles, muscle];
      } else if (maxMuscles === 1) {
        nextMuscles = [muscle];
      } else {
        // Replace oldest selection so tapping feels responsive without blocking
        nextMuscles = [...existing.muscles.slice(1), muscle];
      }

      return {
        ...prev,
        days: {
          ...prev.days,
          [selectedDay]: {
            ...existing,
            muscles: nextMuscles,
          },
        },
      };
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(draftPlan);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-xl bg-[#14161a] border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
        <div className="w-10 h-1.5 bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" aria-hidden="true" />

        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2.5">
            <CalendarRange className="w-5 h-5 text-orange-500 shrink-0" aria-hidden="true" />
            <h2 id="plan-modal-title" className="font-display text-2xl font-bold text-zinc-50">
              Plano de Treino Semanal
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar plano semanal"
            className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Weekly Range */}
          <div>
            <span className="block text-xs font-medium text-zinc-300 mb-2">
              Frequência na semana
            </span>
            <div className="grid grid-cols-3 gap-2">
              {RANGE_OPTIONS.map((opt) => {
                const active = draftPlan.range === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleRangeChange(opt.id)}
                    className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-orange-500 text-zinc-950 font-bold'
                        : 'bg-[#0b0c0e] text-zinc-300 border border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day Selector Tabs */}
          <div>
            <span className="block text-xs font-medium text-zinc-300 mb-2">
              Selecione o dia para configurar
            </span>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {activeDays.map((day) => {
                const active = selectedDay === day.id;
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => setSelectedDay(day.id)}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      active
                        ? 'bg-zinc-100 text-zinc-950 font-bold'
                        : 'bg-[#0b0c0e] text-zinc-400 border border-zinc-800 hover:text-zinc-100'
                    }`}
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Configuration */}
          <div className="bg-[#0b0c0e] border border-zinc-800 rounded-2xl p-4 space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold text-zinc-100">
                {currentDayMeta.label}
              </h3>
              <span className="text-xs font-medium text-orange-400">
                {formatDayPlanSummary(currentDayPlan)}
              </span>
            </div>

            {/* Simple vs Conjugado Mode */}
            <div>
              <span className="block text-xs text-zinc-400 mb-2">
                Formato do treino no dia
              </span>
              <div className="flex flex-wrap gap-2">
                {MODE_OPTIONS.map((modeOpt) => {
                  const active = currentDayPlan.mode === modeOpt.id;
                  return (
                    <button
                      key={modeOpt.id}
                      type="button"
                      onClick={() => handleModeChange(modeOpt.id)}
                      className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-orange-500/15 text-orange-300 border border-orange-500/50 font-semibold'
                          : 'bg-[#14161a] text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      {modeOpt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Muscle Group Checkboxes */}
            {currentDayPlan.mode !== 'descanso' && (
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                  <span>Grupos musculares</span>
                  <span className="font-mono tabular-nums text-zinc-300">
                    {currentDayPlan.muscles.length}/{maxMuscles}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MUSCLE_GROUPS.map((muscle) => {
                    const selected = currentDayPlan.muscles.includes(muscle);
                    return (
                      <button
                        key={muscle}
                        type="button"
                        onClick={() => handleToggleMuscle(muscle)}
                        className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left flex items-center justify-between ${
                          selected
                            ? 'bg-orange-500 text-zinc-950 font-bold'
                            : 'bg-[#14161a] text-zinc-300 border border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <span>{muscle}</span>
                        {selected && (
                          <span className="font-mono text-[11px]">
                            {currentDayPlan.muscles.indexOf(muscle) + 1}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Weekly Overview List */}
          <div>
            <span className="block text-xs font-medium text-zinc-400 mb-2">
              Resumo da semana
            </span>
            <div className="divide-y divide-zinc-800/80 border border-zinc-800 rounded-xl bg-[#0b0c0e] overflow-hidden">
              {activeDays.map((day) => {
                const plan = draftPlan.days[day.id];
                const isCurrent = day.id === selectedDay;
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => setSelectedDay(day.id)}
                    className={`w-full min-h-[44px] px-3.5 py-2 flex items-center justify-between gap-3 text-left text-xs transition-colors cursor-pointer ${
                      isCurrent ? 'bg-zinc-900' : 'hover:bg-zinc-900/50'
                    }`}
                  >
                    <span className="font-semibold text-zinc-200 whitespace-nowrap">
                      {day.label}
                    </span>
                    <span
                      className={`truncate ${
                        plan.mode === 'descanso'
                          ? 'text-zinc-500'
                          : plan.muscles.length > 0
                            ? 'text-orange-400 font-medium'
                            : 'text-zinc-500'
                      }`}
                    >
                      {formatDayPlanSummary(plan)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 py-2.5 rounded-xl border border-zinc-700 text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 text-sm font-bold transition-colors cursor-pointer"
            >
              Salvar Plano
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
