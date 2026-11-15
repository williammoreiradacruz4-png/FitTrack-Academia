import { FormEvent, useEffect, useState } from 'react';
import { Bell, Droplets, Dumbbell, X } from 'lucide-react';
import {
  DAYS_META,
  DayOfWeek,
  ReminderSettings,
  WorkoutPlan,
  getDaysForRange,
} from '../types/workout';

interface RemindersModalProps {
  isOpen: boolean;
  initialSettings: ReminderSettings;
  workoutPlan: WorkoutPlan;
  onClose: () => void;
  onSave: (settings: ReminderSettings) => void;
  onTestReminder: () => void;
}

const WATER_INTERVALS: Array<{ value: 60 | 90 | 120; label: string }> = [
  { value: 60, label: 'A cada 1h' },
  { value: 90, label: 'A cada 1h30' },
  { value: 120, label: 'A cada 2h' },
];

export function RemindersModal({
  isOpen,
  initialSettings,
  workoutPlan,
  onClose,
  onSave,
  onTestReminder,
}: RemindersModalProps) {
  const [draft, setDraft] = useState<ReminderSettings>(initialSettings);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if (!isOpen) return;
    setDraft(initialSettings);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(window.Notification.permission);
    } else {
      setPermission('unsupported');
    }
  }, [isOpen, initialSettings]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggleDay = (dayId: DayOfWeek) => {
    setDraft((prev) => {
      const exists = prev.activeDays.includes(dayId);
      const nextDays = exists
        ? prev.activeDays.filter((d) => d !== dayId)
        : [...prev.activeDays, dayId];
      return { ...prev, activeDays: nextDays };
    });
  };

  const handleSyncWithPlan = () => {
    const planDays = getDaysForRange(workoutPlan.range)
      .map((d) => d.id)
      .filter((dayId) => workoutPlan.days[dayId].mode !== 'descanso');
    setDraft((prev) => ({
      ...prev,
      activeDays: planDays,
    }));
  };

  const handleRequestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const result = await window.Notification.requestPermission();
      setPermission(result);
    } catch {
      // Ignore permission rejection errors
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(draft);
    onClose();
  };

  const permissionLabel =
    permission === 'granted'
      ? 'Notificações do navegador ativadas'
      : permission === 'denied'
        ? 'Bloqueado no navegador (lembretes exibidos no app)'
        : permission === 'unsupported'
          ? 'Lembretes exibidos diretamente no app'
          : 'Permissão pendente no navegador';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reminders-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-md bg-[#14161a] border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
        <div className="w-10 h-1.5 bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" aria-hidden="true" />

        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-orange-500 shrink-0" aria-hidden="true" />
            <h2 id="reminders-modal-title" className="font-display text-2xl font-bold text-zinc-50">
              Lembretes
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar lembretes"
            className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Workout Reminder Section */}
          <div className="bg-[#0b0c0e] border border-zinc-800 rounded-2xl p-4 space-y-3.5">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Dumbbell className="w-4 h-4 text-orange-400 shrink-0" aria-hidden="true" />
                <div>
                  <span className="block text-sm font-semibold text-zinc-100">
                    Lembrete de treino semanal
                  </span>
                  <span className="block text-xs text-zinc-400">
                    Aviso no horário escolhido nos dias ativos
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={draft.workoutEnabled}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, workoutEnabled: e.target.checked }))
                }
                className="w-5 h-5 accent-orange-500 rounded cursor-pointer shrink-0"
              />
            </label>

            {draft.workoutEnabled && (
              <>
                <div>
                  <label
                    htmlFor="workout-reminder-time"
                    className="block text-xs font-medium text-zinc-300 mb-1.5"
                  >
                    Horário do lembrete
                  </label>
                  <input
                    id="workout-reminder-time"
                    type="time"
                    value={draft.workoutTime}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, workoutTime: e.target.value }))
                    }
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#14161a] border border-zinc-700 text-sm font-mono text-zinc-100 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-medium text-zinc-300">
                      Dias com lembrete
                    </span>
                    <button
                      type="button"
                      onClick={handleSyncWithPlan}
                      className="text-xs font-medium text-orange-400 hover:text-orange-300 cursor-pointer"
                    >
                      Sincronizar com plano
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS_META.map((day) => {
                      const active = draft.activeDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => handleToggleDay(day.id)}
                          className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                            active
                              ? 'bg-orange-500 text-zinc-950 font-bold'
                              : 'bg-[#14161a] text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                          }`}
                        >
                          {day.short}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Water Reminder Section */}
          <div className="bg-[#0b0c0e] border border-zinc-800 rounded-2xl p-4 space-y-3.5">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Droplets className="w-4 h-4 text-orange-400 shrink-0" aria-hidden="true" />
                <div>
                  <span className="block text-sm font-semibold text-zinc-100">
                    Lembrete de água diária
                  </span>
                  <span className="block text-xs text-zinc-400">
                    Alerta periódico para manter a hidratação
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={draft.waterEnabled}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, waterEnabled: e.target.checked }))
                }
                className="w-5 h-5 accent-orange-500 rounded cursor-pointer shrink-0"
              />
            </label>

            {draft.waterEnabled && (
              <div className="grid grid-cols-3 gap-2">
                {WATER_INTERVALS.map((opt) => {
                  const active = draft.waterIntervalMinutes === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({ ...prev, waterIntervalMinutes: opt.value }))
                      }
                      className={`min-h-[40px] px-2 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'bg-orange-500 text-zinc-950 font-bold'
                          : 'bg-[#14161a] text-zinc-300 border border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Browser Notification Status & Test */}
          <div className="bg-[#0b0c0e] border border-zinc-800 rounded-2xl p-4 space-y-3">
            <p className="text-xs text-zinc-400">{permissionLabel}</p>
            <div className="flex flex-wrap items-center gap-2">
              {permission === 'default' && (
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-orange-500/15 border border-orange-500/40 hover:bg-orange-500/25 text-xs font-semibold text-orange-300 transition-colors cursor-pointer"
                >
                  Ativar notificações
                </button>
              )}
              <button
                type="button"
                onClick={onTestReminder}
                className="min-h-[40px] px-3.5 py-2 rounded-xl border border-zinc-700 hover:border-zinc-600 text-xs font-medium text-zinc-200 hover:bg-zinc-800/70 transition-colors cursor-pointer"
              >
                Testar lembrete
              </button>
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
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
