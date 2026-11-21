import { FormEvent, useEffect, useRef, useState } from 'react';
import { CheckCircle2, FileText, ImagePlus, Plus, Trash2, Upload, Video, X } from 'lucide-react';
import {
  DayOfWeek,
  Exercise,
  ExerciseMuscle,
  MUSCLE_GROUPS,
  ScheduleRange,
  UNASSIGNED_MUSCLE,
  formatCardioMinutes,
  getDaysForRange,
  isTimeBasedExercise,
} from '../types/workout';
import { compressImageFile } from '../utils/imageCompression';
import {
  deleteVideoBlob,
  readVideoDurationSeconds,
  saveVideoBlob,
} from '../utils/videoStorage';

interface ExerciseModalProps {
  isOpen: boolean;
  editingExercise: Exercise | null;
  isCreator?: boolean;
  defaultDay?: DayOfWeek;
  defaultMuscle?: ExerciseMuscle;
  scheduleRange: ScheduleRange;
  onClose: () => void;
  onSave: (data: Omit<Exercise, 'id' | 'completed'>, existingId?: string) => void;
}

const MAX_VIDEO_SECONDS = 50 * 60; // 50 minutos

export function ExerciseModal({
  isOpen,
  editingExercise,
  isCreator = false,
  defaultDay,
  defaultMuscle,
  scheduleRange,
  onClose,
  onSave,
}: ExerciseModalProps) {
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState<ExerciseMuscle>(
    isCreator ? UNASSIGNED_MUSCLE : 'Peito'
  );
  const [setsReps, setSetsReps] = useState('4 × 10–12');
  const [weight, setWeight] = useState('20');
  const [durationSeconds, setDurationSeconds] = useState('45');
  const [notes, setNotes] = useState('');
  const [executionInstructions, setExecutionInstructions] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFileId, setVideoFileId] = useState<string | undefined>(undefined);
  const [videoFileName, setVideoFileName] = useState<string | undefined>(undefined);
  const [videoDurationLabel, setVideoDurationLabel] = useState('');
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [removedVideoFileId, setRemovedVideoFileId] = useState<string | undefined>(undefined);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);
  const [isConjugated, setIsConjugated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedFeedback, setSavedFeedback] = useState('');

  const videoInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingExercise) {
      setName(editingExercise.name);
      setMuscle(editingExercise.muscle);
      setSetsReps(editingExercise.muscle === 'Cardio' ? '' : editingExercise.setsReps);
      setWeight(String(editingExercise.weight));
      setDurationSeconds(
        editingExercise.muscle === 'Cardio'
          ? String(formatCardioMinutes(editingExercise.durationSeconds))
          : String(
              editingExercise.durationSeconds ??
                (editingExercise.muscle === 'Abdômen' && editingExercise.weight > 0
                  ? editingExercise.weight
                  : 45)
            )
      );
      setNotes(editingExercise.notes ?? '');
      setExecutionInstructions(editingExercise.executionInstructions ?? '');
      setVideoUrl(editingExercise.videoUrl ?? '');
      setVideoFileId(editingExercise.videoFileId);
      setVideoFileName(editingExercise.videoFileName);
      setVideoDurationLabel(editingExercise.videoDurationLabel ?? '');
      setImageUrl(editingExercise.imageUrl);
      setSelectedDays(editingExercise.days ?? []);
      setIsConjugated(Boolean(editingExercise.isConjugated));
    } else {
      const initialMuscle: ExerciseMuscle =
        defaultMuscle ?? (isCreator ? UNASSIGNED_MUSCLE : 'Peito');
      setName('');
      setMuscle(initialMuscle);
      setSetsReps(
        initialMuscle === 'Cardio'
          ? ''
          : initialMuscle === 'Abdômen'
            ? '4 séries'
            : '4 × 10–12'
      );
      setWeight('20');
      setDurationSeconds(initialMuscle === 'Cardio' ? '20' : '45');
      setNotes('');
      setExecutionInstructions('');
      setVideoUrl('');
      setVideoFileId(undefined);
      setVideoFileName(undefined);
      setVideoDurationLabel('');
      setImageUrl(undefined);
      setSelectedDays(defaultDay ? [defaultDay] : []);
      setIsConjugated(false);
    }
    setPendingVideoFile(null);
    setRemovedVideoFileId(undefined);
    setIsSaving(false);
    setErrorMsg('');
    setSavedFeedback('');
  }, [isOpen, editingExercise, defaultDay, defaultMuscle, isCreator]);

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
  const isTimeBased = isTimeBasedExercise(muscle, name);

  const handleToggleDay = (dayId: DayOfWeek) => {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  const processImageFile = async (file: File) => {
    try {
      const compressed = await compressImageFile(file);
      setImageUrl(compressed);
      setErrorMsg('');
    } catch {
      setErrorMsg('Não foi possível carregar a imagem selecionada.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await processImageFile(file);
  };

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const secs = await readVideoDurationSeconds(file);
    if (secs !== null && secs > MAX_VIDEO_SECONDS) {
      setErrorMsg('O vídeo explicativo deve ter no máximo 50 minutos.');
      return;
    }

    if (videoFileId) {
      setRemovedVideoFileId(videoFileId);
    }

    setPendingVideoFile(file);
    setVideoFileName(file.name);
    if (secs !== null) {
      const mins = Math.max(1, Math.round(secs / 60));
      setVideoDurationLabel(`${mins} min`);
    } else if (!videoDurationLabel) {
      setVideoDurationLabel('Até 50 min');
    }
    setErrorMsg('');
  };

  const handleRemoveUploadedVideo = () => {
    if (videoFileId) {
      setRemovedVideoFileId(videoFileId);
    }
    setPendingVideoFile(null);
    setVideoFileId(undefined);
    setVideoFileName(undefined);
  };

  const resetForNextEntry = (keepMuscle: ExerciseMuscle) => {
    setName('');
    setSetsReps(
      keepMuscle === 'Cardio'
        ? ''
        : keepMuscle === 'Abdômen'
          ? '4 séries'
          : '4 × 10–12'
    );
    setWeight('20');
    setDurationSeconds(keepMuscle === 'Cardio' ? '20' : '45');
    setNotes('');
    setExecutionInstructions('');
    setVideoUrl('');
    setVideoFileId(undefined);
    setVideoFileName(undefined);
    setVideoDurationLabel('');
    setPendingVideoFile(null);
    setRemovedVideoFileId(undefined);
    setImageUrl(undefined);
    setSelectedDays(defaultDay ? [defaultDay] : []);
    setIsConjugated(false);
    window.setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const saveExerciseForm = async (keepOpenAfterSave: boolean) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Informe o nome do exercício.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    setSavedFeedback('');

    try {
      let nextVideoFileId = videoFileId;
      let nextVideoFileName = videoFileName;

      if (removedVideoFileId) {
        await deleteVideoBlob(removedVideoFileId).catch(() => undefined);
        if (nextVideoFileId === removedVideoFileId) {
          nextVideoFileId = undefined;
          nextVideoFileName = undefined;
        }
      }

      if (pendingVideoFile) {
        const newVideoId = `vid-${Date.now()}`;
        await saveVideoBlob(newVideoId, pendingVideoFile);
        nextVideoFileId = newVideoId;
        nextVideoFileName = pendingVideoFile.name;
      }

      const isCardio = muscle === 'Cardio';
      const useTime = isTimeBasedExercise(muscle, trimmedName);
      const parsedWeight = parseFloat(weight);
      const parsedDuration = parseFloat(durationSeconds);

      if (isCardio && (Number.isNaN(parsedDuration) || parsedDuration <= 0)) {
        setErrorMsg('Informe o tempo em minutos para o exercício de cardio.');
        setIsSaving(false);
        return;
      }

      onSave(
        {
          name: trimmedName,
          muscle,
          setsReps: isCardio ? '' : setsReps.trim() || (useTime ? '4 séries' : '3 × 12'),
          weight: useTime
            ? 0
            : Number.isNaN(parsedWeight)
              ? 0
              : Math.max(0, parsedWeight),
          durationSeconds: useTime
            ? Number.isNaN(parsedDuration)
              ? 0
              : isCardio
                ? Math.round(Math.max(0, parsedDuration) * 60)
                : Math.round(Math.max(0, parsedDuration))
            : undefined,
          notes: notes.trim() || undefined,
          executionInstructions: executionInstructions.trim() || undefined,
          videoUrl: videoUrl.trim() || undefined,
          videoFileId: nextVideoFileId,
          videoFileName: nextVideoFileName,
          videoDurationLabel: videoDurationLabel.trim() || undefined,
          imageUrl,
          days: !isCreator && selectedDays.length > 0 ? selectedDays : undefined,
          isConjugated: isConjugated || undefined,
        },
        editingExercise?.id
      );

      if (keepOpenAfterSave && !editingExercise) {
        resetForNextEntry(muscle);
        setSavedFeedback(`"${trimmedName}" adicionado! Cadastre o próximo exercício.`);
      } else {
        onClose();
      }
    } catch {
      setErrorMsg('Não foi possível salvar o vídeo localmente. Tente usar um link ou arquivo menor.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await saveExerciseForm(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exercise-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div className="w-full sm:max-w-lg bg-[#14161a] border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
        <div className="w-10 h-1.5 bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" aria-hidden="true" />

        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 id="exercise-modal-title" className="font-display text-2xl font-bold text-zinc-50">
            {editingExercise
              ? isCreator
                ? 'Editar Exercício da Galeria'
                : 'Editar Exercício'
              : isCreator
                ? 'Novo Exercício na Galeria'
                : 'Novo Exercício'}
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
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

          {savedFeedback && (
            <div
              role="status"
              className="flex items-center gap-2 text-xs font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/35 rounded-lg px-3 py-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" aria-hidden="true" />
              <span>{savedFeedback}</span>
            </div>
          )}

          {/* Prominent PC Image Picker & Preview */}
          <div>
            <span className="block text-xs font-medium text-zinc-300 mb-1.5">
              Upload de imagem do exercício (galeria do PC / aparelho)
            </span>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingImage(true);
              }}
              onDragLeave={() => setIsDraggingImage(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingImage(false);
                const file = e.dataTransfer.files?.[0];
                if (file && file.type.startsWith('image/')) {
                  void processImageFile(file);
                }
              }}
              className={`rounded-2xl border p-3.5 flex items-center gap-3.5 transition-colors ${
                isDraggingImage
                  ? 'border-orange-500 bg-orange-500/10'
                  : 'border-zinc-800 bg-[#0b0c0e]'
              }`}
            >
              {imageUrl ? (
                <div className="w-20 h-20 rounded-xl overflow-hidden border border-zinc-700 shrink-0 bg-[#14161a]">
                  <img
                    src={imageUrl}
                    alt="Prévia do exercício"
                    referrerPolicy={imageUrl.startsWith('data:') ? undefined : 'no-referrer'}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <label className="w-20 h-20 rounded-xl border border-dashed border-zinc-700 hover:border-orange-500/60 bg-[#14161a] flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-orange-400 shrink-0 cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                  <ImagePlus className="w-5 h-5" aria-hidden="true" />
                  <span className="text-[10px] font-medium">Upload</span>
                </label>
              )}

              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {imageUrl
                    ? 'Imagem pronta e otimizada para carregar rapidamente em qualquer dispositivo.'
                    : 'Clique no botão abaixo para escolher uma foto no PC ou arraste a imagem para cá.'}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="min-h-[40px] px-3.5 py-2 rounded-xl bg-orange-500/15 border border-orange-500/45 hover:bg-orange-500 hover:text-zinc-950 text-xs font-bold text-orange-300 inline-flex items-center gap-1.5 cursor-pointer transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                    <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{imageUrl ? 'Trocar imagem (Upload)' : 'Fazer upload de imagem'}</span>
                  </label>

                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl(undefined)}
                      aria-label="Remover foto selecionada"
                      className="min-h-[40px] px-2.5 py-1.5 rounded-xl border border-zinc-800 hover:border-rose-500/40 text-xs text-zinc-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Remover</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="ex-name" className="block text-xs font-medium text-zinc-300 mb-1.5">
              Nome do exercício
            </label>
            <input
              ref={nameInputRef}
              id="ex-name"
              type="text"
              required
              autoFocus
              placeholder={
                muscle === 'Cardio'
                  ? 'Ex: Esteira, Bicicleta ou Elíptico'
                  : 'Ex: Supino Inclinado com Halteres'
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ex-muscle" className="block text-xs font-medium text-zinc-300 mb-1.5">
                {isCreator ? 'Grupo muscular (opcional)' : 'Grupo muscular'}
              </label>
              <select
                id="ex-muscle"
                value={muscle}
                onChange={(e) => {
                  const nextMuscle = e.target.value as ExerciseMuscle;
                  const wasCardio = muscle === 'Cardio';
                  setMuscle(nextMuscle);
                  if (nextMuscle === 'Cardio') {
                    setSetsReps('');
                    if (!wasCardio) {
                      setDurationSeconds('20');
                    }
                  } else {
                    if (wasCardio) {
                      setDurationSeconds('45');
                    }
                    if (!setsReps.trim()) {
                      setSetsReps(nextMuscle === 'Abdômen' ? '4 séries' : '4 × 10–12');
                    }
                  }
                }}
                className="w-full min-h-[44px] px-3 py-2.5 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
              >
                {(isCreator || muscle === UNASSIGNED_MUSCLE) && (
                  <option value={UNASSIGNED_MUSCLE}>
                    Sem grupo (professor organiza)
                  </option>
                )}
                {MUSCLE_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>

            {isTimeBased ? (
              <div>
                <label htmlFor="ex-duration" className="block text-xs font-medium text-zinc-300 mb-1.5">
                  {muscle === 'Cardio' ? 'Tempo (minutos)' : 'Tempo inicial (seg)'}
                </label>
                <input
                  id="ex-duration"
                  type="number"
                  min={muscle === 'Cardio' ? 1 : 0}
                  step={muscle === 'Cardio' ? 'any' : 1}
                  required={muscle === 'Cardio'}
                  placeholder={muscle === 'Cardio' ? '20' : '45'}
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm font-mono tabular-nums text-zinc-100 focus:outline-none focus:border-orange-500"
                />
              </div>
            ) : (
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
            )}
          </div>

          {muscle !== 'Cardio' && (
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
          )}

          {/* Optional Day Assignment (Professors/Academies only, hidden for Creator catalog) */}
          {!isCreator && (
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
          )}

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

          {/* Teacher / Creator Authoring Section */}
          <div className="bg-[#0b0c0e] border border-zinc-800 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-orange-400">
              <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {isCreator
                  ? 'Detalhamento completo do exercício (visível para professores e alunos)'
                  : 'Orientação do Professor (Aluno visualiza ao clicar no nome)'}
              </span>
            </div>

            <div>
              <label htmlFor="ex-instructions" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Informações e forma de execução
              </label>
              <textarea
                id="ex-instructions"
                rows={4}
                placeholder="Ex: 1. Ajuste o banco... 2. Mantenha os cotovelos firmes... 3. Controle a descida em 3 segundos."
                value={executionInstructions}
                onChange={(e) => setExecutionInstructions(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#14161a] border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 resize-y"
              />
            </div>

            <div>
              <label htmlFor="ex-notes" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Observação rápida (opcional)
              </label>
              <input
                id="ex-notes"
                type="text"
                placeholder="Ex: Segurar 1s no pico de contração"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#14161a] border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Explanatory Video (up to 50 min) */}
            <div className="pt-2 border-t border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-200">
                  <Video className="w-4 h-4 text-orange-400" aria-hidden="true" />
                  <span>Vídeo explicativo (até 50 min)</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <label htmlFor="ex-video-url" className="sr-only">
                    Link do vídeo explicativo
                  </label>
                  <input
                    id="ex-video-url"
                    type="url"
                    placeholder="Cole o link (YouTube, Vimeo, Drive ou MP4)"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#14161a] border border-zinc-700 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label htmlFor="ex-video-duration" className="sr-only">
                    Duração do vídeo
                  </label>
                  <input
                    id="ex-video-duration"
                    type="text"
                    placeholder="Ex: 50 min"
                    value={videoDurationLabel}
                    onChange={(e) => setVideoDurationLabel(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#14161a] border border-zinc-700 text-xs font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl border border-zinc-700 hover:border-orange-500/50 bg-[#14161a] text-xs font-medium text-zinc-200 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Video className="w-4 h-4 text-orange-400" aria-hidden="true" />
                  <span>{videoFileName ? 'Trocar arquivo de vídeo' : 'Enviar vídeo do aparelho'}</span>
                </button>

                {videoFileName && (
                  <div className="flex items-center gap-2 text-xs text-zinc-300 bg-[#14161a] border border-zinc-800 rounded-xl pl-3 pr-1 py-1">
                    <span className="truncate max-w-[160px]">{videoFileName}</span>
                    <button
                      type="button"
                      onClick={handleRemoveUploadedVideo}
                      aria-label="Remover arquivo de vídeo"
                      className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-zinc-700 text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors cursor-pointer"
            >
              {savedFeedback ? 'Concluir' : 'Cancelar'}
            </button>

            {!editingExercise && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void saveExerciseForm(true)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-orange-500/45 bg-orange-500/10 hover:bg-orange-500/20 disabled:opacity-60 text-orange-300 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Salvar e adicionar outro</span>
              </button>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-zinc-950 text-sm font-bold transition-colors cursor-pointer"
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
