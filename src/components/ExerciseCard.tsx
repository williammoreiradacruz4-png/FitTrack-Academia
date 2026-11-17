import { useState } from 'react';
import { Camera, Check, Dumbbell, Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import { DAYS_META, Exercise, isTimeBasedExercise } from '../types/workout';

interface ExerciseCardProps {
  exercise: Exercise;
  isProfessor: boolean;
  showAssignedDays?: boolean;
  onSelectExercise: (exercise: Exercise) => void;
  onToggleComplete: (id: string) => void;
  onUpdateWeight: (id: string, weight: number) => void;
  onUpdateDuration: (id: string, durationSeconds: number) => void;
  onTriggerImageUpload: (id: string) => void;
  onEdit: (exercise: Exercise) => void;
  onDelete: (id: string) => void;
}

export function ExerciseCard({
  exercise,
  isProfessor,
  showAssignedDays = false,
  onSelectExercise,
  onToggleComplete,
  onUpdateWeight,
  onUpdateDuration,
  onTriggerImageUpload,
  onEdit,
  onDelete,
}: ExerciseCardProps) {
  const [imgError, setImgError] = useState(false);

  const hasValidImage = Boolean(exercise.imageUrl) && !imgError;
  const isTimeBased = isTimeBasedExercise(exercise.muscle, exercise.name);
  const metricValue = isTimeBased
    ? (exercise.durationSeconds ?? exercise.weight)
    : exercise.weight;

  const handleMetricStep = (delta: number) => {
    if (isTimeBased) {
      const next = Math.max(0, Math.round(metricValue + delta));
      onUpdateDuration(exercise.id, next);
    } else {
      const next = Math.max(0, Math.round((metricValue + delta) * 10) / 10);
      onUpdateWeight(exercise.id, next);
    }
  };

  const dayLabel =
    showAssignedDays && exercise.days && exercise.days.length > 0
      ? exercise.days
          .map((d) => DAYS_META.find((meta) => meta.id === d)?.short)
          .filter(Boolean)
          .join(', ')
      : '';

  return (
    <article
      className={`rounded-2xl border p-4 transition-colors duration-150 flex items-start sm:items-center gap-3.5 ${
        exercise.completed
          ? 'bg-[#101215] border-orange-500/35'
          : 'bg-[#14161a] border-zinc-800 hover:border-zinc-700'
      }`}
    >
      {/* Lateral Image Card (Interactive upload for Professor, view-only for Student) */}
      {isProfessor ? (
        <button
          type="button"
          onClick={() => onTriggerImageUpload(exercise.id)}
          aria-label={
            hasValidImage
              ? `Alterar foto de ${exercise.name}`
              : `Adicionar foto de ${exercise.name}`
          }
          className={`relative w-20 h-20 min-w-[80px] rounded-xl overflow-hidden flex flex-col items-center justify-center text-center transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
            hasValidImage
              ? 'border border-zinc-700 bg-[#0b0c0e]'
              : 'border border-dashed border-zinc-600 bg-[#0b0c0e] hover:border-orange-500/60'
          }`}
        >
          {hasValidImage ? (
            <>
              <img
                src={exercise.imageUrl}
                alt={exercise.name}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className={`w-full h-full object-cover transition-opacity duration-150 ${
                  exercise.completed ? 'opacity-60' : 'opacity-100'
                }`}
              />
              <span className="absolute inset-x-0 bottom-0 py-1 bg-zinc-950/85 text-[11px] font-medium text-zinc-200 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                Alterar
              </span>
            </>
          ) : (
            <span className="flex flex-col items-center justify-center gap-1 px-1.5 text-zinc-400 group-hover:text-orange-400 transition-colors">
              <Camera className="w-5 h-5" aria-hidden="true" />
              <span className="text-[11px] font-medium leading-tight">Foto</span>
            </span>
          )}
        </button>
      ) : (
        <div className="relative w-20 h-20 min-w-[80px] rounded-xl overflow-hidden flex items-center justify-center border border-zinc-800 bg-[#0b0c0e] shrink-0">
          {hasValidImage ? (
            <img
              src={exercise.imageUrl}
              alt={exercise.name}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className={`w-full h-full object-cover transition-opacity duration-150 ${
                exercise.completed ? 'opacity-60' : 'opacity-100'
              }`}
            />
          ) : (
            <Dumbbell className="w-6 h-6 text-zinc-600" aria-hidden="true" />
          )}
        </div>
      )}

      {/* Center Info & Controls */}
      <div className="flex-1 min-w-0">
        {/* Clean Unboxed Metadata Line (Zero-Pill Rule) */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-400">
          <span className="font-semibold text-orange-400">{exercise.muscle}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-zinc-300">{exercise.setsReps}</span>
          {exercise.isConjugated && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-zinc-300 font-medium">Conjugado</span>
            </>
          )}
          {dayLabel && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-zinc-400">{dayLabel}</span>
            </>
          )}
          {(exercise.videoUrl || exercise.videoFileId) && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-zinc-300">Vídeo</span>
            </>
          )}
          {exercise.completed && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-orange-400">Concluído</span>
            </>
          )}
        </div>

        {/* Clickable Exercise Title -> Opens Student Details & Video Modal */}
        <button
          type="button"
          onClick={() => onSelectExercise(exercise)}
          title={`Ver execução e vídeo de ${exercise.name}`}
          className={`w-full text-left text-base font-semibold leading-snug mt-0.5 truncate transition-colors cursor-pointer hover:text-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded ${
            exercise.completed ? 'line-through text-zinc-400' : 'text-zinc-100'
          }`}
        >
          {exercise.name}
        </button>

        {exercise.notes && (
          <p className="text-xs text-zinc-400 truncate mt-0.5" title={exercise.notes}>
            {exercise.notes}
          </p>
        )}

        {/* Weight or Time Stepper & Professor-only Edit/Delete Actions */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-xl bg-[#0b0c0e] border border-zinc-800 h-11">
            <button
              type="button"
              onClick={() => handleMetricStep(isTimeBased ? -5 : -2.5)}
              aria-label={
                isTimeBased
                  ? `Diminuir tempo de ${exercise.name}`
                  : `Diminuir carga de ${exercise.name}`
              }
              className="w-10 h-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded-l-xl"
            >
              <Minus className="w-3.5 h-3.5" aria-hidden="true" />
            </button>

            <label className="flex items-center px-1">
              <span className="sr-only">
                {isTimeBased
                  ? `Tempo em segundos para ${exercise.name}`
                  : `Carga em quilogramas para ${exercise.name}`}
              </span>
              <input
                type="number"
                min={0}
                step={isTimeBased ? 1 : 0.5}
                value={metricValue}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  const safeVal = Number.isNaN(val) ? 0 : Math.max(0, val);
                  if (isTimeBased) {
                    onUpdateDuration(exercise.id, Math.round(safeVal));
                  } else {
                    onUpdateWeight(exercise.id, safeVal);
                  }
                }}
                className="w-12 bg-transparent text-center font-mono tabular-nums text-sm font-medium text-zinc-100 focus:outline-none"
              />
              <span className="text-xs text-zinc-400 pr-1 font-mono">
                {isTimeBased ? 'seg' : 'kg'}
              </span>
            </label>

            <button
              type="button"
              onClick={() => handleMetricStep(isTimeBased ? 5 : 2.5)}
              aria-label={
                isTimeBased
                  ? `Aumentar tempo de ${exercise.name}`
                  : `Aumentar carga de ${exercise.name}`
              }
              className="w-10 h-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded-r-xl"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {isProfessor && (
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => onEdit(exercise)}
                aria-label={`Editar ${exercise.name}`}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                <Pencil className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => onDelete(exercise.id)}
                aria-label={`Excluir ${exercise.name}`}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Checkbox Hitbox (>= 44x44px) */}
      <button
        type="button"
        role="checkbox"
        aria-checked={exercise.completed}
        aria-label={
          exercise.completed
            ? `Desmarcar ${exercise.name} como concluído`
            : `Marcar ${exercise.name} como concluído`
        }
        onClick={() => onToggleComplete(exercise.id)}
        className="min-w-[44px] min-h-[44px] self-center flex items-center justify-center rounded-xl cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 shrink-0"
      >
        <span
          className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors duration-150 ${
            exercise.completed
              ? 'bg-orange-500 border-orange-500 text-zinc-950'
              : 'bg-[#0b0c0e] border-zinc-500 group-hover:border-orange-400'
          }`}
        >
          {exercise.completed && <Check className="w-5 h-5 stroke-[3]" aria-hidden="true" />}
        </span>
      </button>
    </article>
  );
}
