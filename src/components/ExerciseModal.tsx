import { FormEvent, useEffect, useRef, useState } from 'react';
import { Camera, Trash2, X } from 'lucide-react';
import {
  DayOfWeek,
  Exercise,
  MUSCLE_GROUPS,
  MuscleGroup,
  ScheduleRange,
  getDaysForRange,
} from '../types/workout';
import { compressImageFile } from '../utils/imageCompression';

interface ExerciseModalProps {
  isOpen: boolean;
  editingExercise: Exercise | null;
  defaultDay?: DayOfWeek;
  defaultMuscle?: MuscleGroup;
  scheduleRange: ScheduleRange;
  onClose: () => void;
  onSave: (data: Omit<Exercise, 'id' | 'completed'>, existingId?: string) => void;
}

export function ExerciseModal({
  isOpen,
  editingExercise,
  defaultDay,
  defaultMuscle,
  scheduleRange,
  onClose,
  onSave,
}: ExerciseModalProps) {
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup>('Peito');
  const [setsReps, setSetsReps] = useState('4 × 10–12');
  const [weight, setWeight] = useState('20');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);
  const [isConjugated, setIsConjugated] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingExercise) {
      setName(editingExercise.name);
      setMuscle(editingExercise.muscle);
      setSetsReps(editingExercise.setsReps);
      setWeight(String(editingExercise.weight));
      setNotes(editingExercise.notes ?? '');
      setImageUrl(editingExercise.imageUrl);
      setSelectedDays(editingExercise.days ?? []);
      setIsConjugated(Boolean(editingExercise.isConjugated));
    } else {
      setName('');
      setMuscle(defaultMuscle ?? 'Peito');
      setSetsReps('4 × 10–12');
      setWeight('20');
      setNotes('');
      setImageUrl(undefined);
      setSelectedDays(defaultDay ? [defaultDay] : []);
      setIsConjugated(false);
    }
    setErrorMsg('');
  }, [isOpen, editingExercise, defaultDay, defaultMuscle]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const availableDays = getDaysForRange(scheduleRange);

  const handleToggleDay = (dayId: DayOfWeek) => {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setImageUrl(compressed);
      setErrorMsg('');
    } catch {
      setErrorMsg('Não foi possível carregar a imagem selecionada.');
    } finally {
      e.target.value = '';
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Informe o nome do exercício.');
      return;
    }

    const parsedWeight = parseFloat(weight);
    onSave(
      {
        name: trimmedName,
        muscle,
        setsReps: setsReps.trim() || '3 × 12',
        weight: Number.isNaN(parsedWeight) ? 0 : Math.max(0, parsedWeight),
        notes: notes.trim() || undefined,
        imageUrl,
        days: selectedDays.length > 0 ? selectedDays : undefined,
        isConjugated: isConjugated || undefined,
      },
      editingExercise?.id
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exercise-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-md bg-[#14161a] border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1.5 bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" aria-hidden="true" />

        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 id="exercise-modal-title" className="font-display text-2xl font-bold text-zinc-50">
            {editingExercise ? 'Editar Exercício' : 'Novo Exercício'}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <p className="text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          <div>
            <label htmlFor="ex-name" className="block text-xs font-medium text-zinc-300 mb-1.5">
              Nome do exercício
            </label>
            <input
              id="ex-name"
              type="text"
              required
              autoFocus
              placeholder="Ex: Supino Inclinado com Halteres"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ex-muscle" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Grupo muscular
              </label>
              <select
                id="ex-muscle"
                value={muscle}
                onChange={(e) => setMuscle(e.target.value as MuscleGroup)}
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
              >
                {MUSCLE_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ex-weight" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Carga inicial (kg)
              </label>
              <input
                id="ex-weight"
                type="number"
                min={0}
                step={0.5}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm font-mono tabular-nums text-zinc-100 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ex-sets" className="block text-xs font-medium text-zinc-300 mb-1.5">
              Séries e repetições
            </label>
            <input
              id="ex-sets"
              type="text"
              placeholder="Ex: 4 × 10–12"
              value={setsReps}
              onChange={(e) => setSetsReps(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Optional Day Assignment */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="block text-xs font-medium text-zinc-300">
                Dias do treino (opcional)
              </span>
              {selectedDays.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedDays([])}
                  className="text-xs text-orange-400 hover:text-orange-300 cursor-pointer"
                >
                  Deixar livre
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {availableDays.map((day) => {
                const active = selectedDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => handleToggleDay(day.id)}
                    className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? 'bg-orange-500 text-zinc-950 font-bold'
                        : 'bg-[#0b0c0e] text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Conjugado Toggle */}
          <label className="flex items-center justify-between gap-3 min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0b0c0e] border border-zinc-800 cursor-pointer">
            <div>
              <span className="block text-xs font-medium text-zinc-200">
                Execução conjugada
              </span>
              <span className="block text-[11px] text-zinc-500">
                Bi-set, tri-set ou circuito conjugado sem pausa entre séries
              </span>
            </div>
            <input
              type="checkbox"
              checked={isConjugated}
              onChange={(e) => setIsConjugated(e.target.checked)}
              className="w-5 h-5 accent-orange-500 rounded cursor-pointer"
            />
          </label>

          <div>
            <label htmlFor="ex-notes" className="block text-xs font-medium text-zinc-300 mb-1.5">
              Observação (opcional)
            </label>
            <input
              id="ex-notes"
              type="text"
              placeholder="Ex: Segurar 1s no pico de contração"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <span className="block text-xs font-medium text-zinc-300 mb-1.5">
              Imagem do exercício (opcional)
            </span>
            <div className="flex items-center gap-3">
              {imageUrl ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-zinc-700 shrink-0 bg-[#0b0c0e]">
                  <img
                    src={imageUrl}
                    alt="Prévia do exercício"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : null}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-zinc-700 hover:border-zinc-600 bg-[#0b0c0e] text-xs font-medium text-zinc-200 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Camera className="w-4 h-4 text-orange-400" aria-hidden="true" />
                <span>{imageUrl ? 'Trocar foto' : 'Selecionar foto'}</span>
              </button>

              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl(undefined)}
                  aria-label="Remover foto selecionada"
                  className="min-h-[44px] min-w-[44px] rounded-xl border border-zinc-800 hover:border-rose-500/40 text-zinc-400 hover:text-rose-400 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
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
