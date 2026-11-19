import { useEffect, useState } from 'react';
import { ExternalLink, FileText, Pencil, PlayCircle, Video, X } from 'lucide-react';
import {
  DAYS_META,
  Exercise,
  formatCardioMinutes,
  isTimeBasedExercise,
} from '../types/workout';
import { getVideoBlob, parseVideoUrl } from '../utils/videoStorage';

interface ExerciseDetailsModalProps {
  exercise: Exercise | null;
  isProfessor: boolean;
  onClose: () => void;
  onEditAsTeacher: (exercise: Exercise) => void;
}

type DetailTab = 'written' | 'video';

export function ExerciseDetailsModal({
  exercise,
  isProfessor,
  onClose,
  onEditAsTeacher,
}: ExerciseDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('written');
  const [localVideoObjectUrl, setLocalVideoObjectUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

  useEffect(() => {
    if (!exercise) return;
    setActiveTab('written');
  }, [exercise?.id]);

  useEffect(() => {
    if (!exercise?.videoFileId) {
      setLocalVideoObjectUrl(null);
      return;
    }

    let cancelled = false;
    let createdUrl: string | null = null;
    setVideoLoading(true);

    getVideoBlob(exercise.videoFileId)
      .then((blob) => {
        if (cancelled) return;
        if (blob) {
          createdUrl = URL.createObjectURL(blob);
          setLocalVideoObjectUrl(createdUrl);
        } else {
          setLocalVideoObjectUrl(null);
        }
      })
      .catch(() => {
        if (!cancelled) setLocalVideoObjectUrl(null);
      })
      .finally(() => {
        if (!cancelled) setVideoLoading(false);
      });

    return () => {
      cancelled = true;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [exercise?.videoFileId]);

  useEffect(() => {
    if (!exercise) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [exercise, onClose]);

  if (!exercise) return null;

  const isCardio = exercise.muscle === 'Cardio';
  const isTimeBased = isTimeBasedExercise(exercise.muscle, exercise.name);
  const metricLabel = isCardio
    ? `${formatCardioMinutes(exercise.durationSeconds)} min`
    : isTimeBased
      ? `${exercise.durationSeconds ?? exercise.weight} seg`
      : `${exercise.weight} kg`;

  const dayLabel =
    exercise.days && exercise.days.length > 0
      ? exercise.days
          .map((d) => DAYS_META.find((m) => m.id === d)?.short)
          .filter(Boolean)
          .join(', ')
      : '';

  const parsedExternalVideo = exercise.videoUrl
    ? parseVideoUrl(exercise.videoUrl)
    : null;
  const hasAnyVideo = Boolean(localVideoObjectUrl || parsedExternalVideo);
  const hasWrittenInfo = Boolean(exercise.executionInstructions?.trim() || exercise.notes?.trim());

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exercise-details-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-xl bg-[#14161a] border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
        <div className="w-10 h-1.5 bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" aria-hidden="true" />

        {/* Header Info */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            {exercise.imageUrl && (
              <div className="w-16 h-16 rounded-xl overflow-hidden border border-zinc-700 bg-[#0b0c0e] shrink-0">
                <img
                  src={exercise.imageUrl}
                  alt={exercise.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-400">
                <span className="font-semibold text-orange-400">{exercise.muscle}</span>
                {exercise.muscle !== 'Cardio' && exercise.setsReps.trim().length > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-zinc-200">{exercise.setsReps}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-zinc-200">{metricLabel}</span>
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
              </div>

              <h2
                id="exercise-details-title"
                className="font-display text-2xl sm:text-3xl font-bold text-zinc-50 mt-1 leading-tight"
              >
                {exercise.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes"
            className="min-w-[44px] min-h-[44px] -mr-2 -mt-1 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Student Mode Switcher: Informação escrita vs Vídeo explicativo */}
        <div
          role="tablist"
          aria-label="Formato da explicação do exercício"
          className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#0b0c0e] border border-zinc-800 mt-5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'written'}
            onClick={() => setActiveTab('written')}
            className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'written'
                ? 'bg-orange-500 text-zinc-950 font-bold'
                : 'text-zinc-300 hover:text-zinc-100'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Informação escrita</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'video'}
            onClick={() => setActiveTab('video')}
            className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'video'
                ? 'bg-orange-500 text-zinc-950 font-bold'
                : 'text-zinc-300 hover:text-zinc-100'
            }`}
          >
            <PlayCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Vídeo explicativo</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'written' ? (
            <div className="bg-[#0b0c0e] border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
              {hasWrittenInfo ? (
                <>
                  {exercise.executionInstructions?.trim() && (
                    <div>
                      <h3 className="text-xs font-semibold text-orange-400 mb-2">
                        Forma de execução
                      </h3>
                      <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line">
                        {exercise.executionInstructions}
                      </p>
                    </div>
                  )}

                  {exercise.notes?.trim() && (
                    <div
                      className={
                        exercise.executionInstructions?.trim()
                          ? 'pt-3 border-t border-zinc-800/80'
                          : ''
                      }
                    >
                      <h3 className="text-xs font-semibold text-zinc-400 mb-1">
                        Observação do professor
                      </h3>
                      <p className="text-sm text-zinc-300 leading-relaxed">
                        {exercise.notes}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm font-medium text-zinc-200">
                    Nenhuma instrução escrita cadastrada ainda.
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    O professor ainda não cadastrou o passo a passo de execução para este exercício.
                  </p>
                  {isProfessor && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onEditAsTeacher(exercise);
                      }}
                      className="mt-4 min-h-[44px] px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Adicionar informações (Professor)
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#0b0c0e] border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3">
              {videoLoading ? (
                <div className="aspect-video rounded-xl bg-zinc-900 flex items-center justify-center text-xs text-zinc-400">
                  Carregando vídeo explicativo...
                </div>
              ) : hasAnyVideo ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                    <span className="font-semibold text-orange-400">
                      Vídeo explicativo do professor
                    </span>
                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      {exercise.videoDurationLabel && (
                        <span>{exercise.videoDurationLabel}</span>
                      )}
                      {exercise.videoFileName && (
                        <>
                          {exercise.videoDurationLabel && <span aria-hidden="true">·</span>}
                          <span className="truncate max-w-[180px]">{exercise.videoFileName}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {localVideoObjectUrl ? (
                    <video
                      src={localVideoObjectUrl}
                      controls
                      playsInline
                      className="w-full aspect-video rounded-xl bg-black border border-zinc-800"
                    />
                  ) : parsedExternalVideo?.kind === 'iframe' ? (
                    <iframe
                      src={parsedExternalVideo.src}
                      title={`Vídeo explicativo de ${exercise.name}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full aspect-video rounded-xl bg-black border border-zinc-800"
                    />
                  ) : parsedExternalVideo?.kind === 'video' ? (
                    <video
                      src={parsedExternalVideo.src}
                      controls
                      playsInline
                      className="w-full aspect-video rounded-xl bg-black border border-zinc-800"
                    />
                  ) : parsedExternalVideo ? (
                    <div className="rounded-xl border border-zinc-800 bg-[#14161a] p-5 text-center space-y-3">
                      <Video className="w-8 h-8 text-orange-400 mx-auto" aria-hidden="true" />
                      <p className="text-xs text-zinc-300 break-all">
                        {parsedExternalVideo.src}
                      </p>
                      <a
                        href={parsedExternalVideo.src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[44px] px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 text-xs font-bold items-center gap-2 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" aria-hidden="true" />
                        <span>Abrir vídeo explicativo</span>
                      </a>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="text-center py-6">
                  <div className="w-11 h-11 rounded-xl bg-[#14161a] border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-400">
                    <Video className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-medium text-zinc-200">
                    Nenhum vídeo explicativo adicionado.
                  </p>
                  <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                    {isProfessor
                      ? 'Você pode enviar um vídeo de até 50 min ou colar o link na edição do exercício.'
                      : 'O professor ainda não anexou um vídeo explicativo para este exercício.'}
                  </p>
                  {isProfessor && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onEditAsTeacher(exercise);
                      }}
                      className="mt-4 min-h-[44px] px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Adicionar vídeo (Professor)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`flex items-center ${isProfessor ? 'justify-between' : 'justify-end'} gap-3 pt-4 mt-5 border-t border-zinc-800`}>
          {isProfessor && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditAsTeacher(exercise);
              }}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-zinc-700 hover:border-orange-500/50 text-xs font-semibold text-zinc-200 hover:text-orange-300 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Editar (Professor)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-100 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
