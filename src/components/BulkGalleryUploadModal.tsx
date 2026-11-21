import { FormEvent, useEffect, useState } from 'react';
import {
  CheckCircle2,
  FolderOpen,
  ImagePlus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  Exercise,
  ExerciseMuscle,
  GALLERY_GYM_CODE,
  MUSCLE_GROUPS,
  UNASSIGNED_MUSCLE,
} from '../types/workout';
import { compressImageFile } from '../utils/imageCompression';

interface BulkDraftItem {
  tempId: string;
  name: string;
  muscle: ExerciseMuscle;
  setsReps: string;
  weight: string;
  durationMinutes: string;
  executionInstructions: string;
  notes: string;
  videoUrl: string;
  imageUrl: string;
}

interface BulkGalleryUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublishAll: (exercises: Exercise[]) => Promise<{ syncedToCloud: boolean }>;
}

function deriveExerciseNameFromFilename(filename: string): string {
  const withoutExt = filename.replace(/\.[^.]+$/, '');
  const cleaned = withoutExt
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'Novo Exercício';
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function BulkGalleryUploadModal({
  isOpen,
  onClose,
  onPublishAll,
}: BulkGalleryUploadModalProps) {
  const [drafts, setDrafts] = useState<BulkDraftItem[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setDrafts([]);
    setIsProcessingFiles(false);
    setIsPublishing(false);
    setIsDragging(false);
    setErrorMsg('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPublishing) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isPublishing, onClose]);

  if (!isOpen) return null;

  const processSelectedFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) =>
      f.type.startsWith('image/')
    );
    if (files.length === 0) {
      setErrorMsg('Selecione arquivos de imagem válidos (JPG, PNG, WEBP).');
      return;
    }

    setIsProcessingFiles(true);
    setErrorMsg('');
    try {
      const baseTime = Date.now();
      const loaded: BulkDraftItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const compressed = await compressImageFile(file);
          loaded.push({
            tempId: `draft-${baseTime}-${i}`,
            name: deriveExerciseNameFromFilename(file.name),
            muscle: UNASSIGNED_MUSCLE,
            setsReps: '4 × 10–12',
            weight: '0',
            durationMinutes: '20',
            executionInstructions: '',
            notes: '',
            videoUrl: '',
            imageUrl: compressed,
          });
        } catch {
          // Skip unreadable image file without blocking remaining files
        }
      }

      if (loaded.length === 0) {
        setErrorMsg('Não foi possível processar as imagens selecionadas.');
      } else {
        setDrafts((prev) => [...prev, ...loaded]);
      }
    } finally {
      setIsProcessingFiles(false);
    }
  };

  const updateDraft = (tempId: string, patch: Partial<BulkDraftItem>) => {
    setDrafts((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, ...patch } : item))
    );
  };

  const handlePublish = async (e: FormEvent) => {
    e.preventDefault();
    if (drafts.length === 0) {
      setErrorMsg('Selecione pelo menos uma imagem do seu PC.');
      return;
    }

    const invalid = drafts.find((d) => !d.name.trim());
    if (invalid) {
      setErrorMsg('Preencha o nome de todos os exercícios antes de publicar.');
      return;
    }

    setIsPublishing(true);
    setErrorMsg('');
    try {
      const now = Date.now();
      const nowIso = new Date(now).toISOString();
      const exercisesToSave: Exercise[] = drafts.map((d, idx) => {
        const isCardio = d.muscle === 'Cardio';
        const parsedWeight = parseFloat(d.weight);
        const parsedMinutes = parseFloat(d.durationMinutes);
        return {
          id: `ex-${now + idx}`,
          name: d.name.trim(),
          muscle: d.muscle,
          setsReps: isCardio ? '' : d.setsReps.trim() || '4 × 10–12',
          weight: isCardio
            ? 0
            : Number.isNaN(parsedWeight)
              ? 0
              : Math.max(0, parsedWeight),
          durationSeconds: isCardio
            ? Math.round(
                Math.max(1, Number.isNaN(parsedMinutes) ? 20 : parsedMinutes) * 60
              )
            : undefined,
          completed: false,
          imageUrl: d.imageUrl,
          executionInstructions: d.executionInstructions.trim() || undefined,
          notes: d.notes.trim() || undefined,
          videoUrl: d.videoUrl.trim() || undefined,
          gymCode: GALLERY_GYM_CODE,
          updatedAt: nowIso,
        };
      });

      const res = await onPublishAll(exercisesToSave);
      if (!res.syncedToCloud) {
        setErrorMsg(
          'Os exercícios foram adicionados localmente, mas houve falha ao sincronizar com o Firebase.'
        );
        return;
      }
      onClose();
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-gallery-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPublishing) onClose();
      }}
    >
      <div className="w-full sm:max-w-4xl bg-[#14161a] border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
        <div className="w-10 h-1.5 bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" aria-hidden="true" />

        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-400">
              <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Galeria Oficial FitTrack</span>
            </div>
            <h2
              id="bulk-gallery-title"
              className="font-display text-2xl font-bold text-zinc-50 mt-0.5"
            >
              Trazer Várias Imagens da Galeria do PC
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Selecione várias fotos do computador sem precisar escolher grupo muscular. Cada professor organiza os exercícios na biblioteca da academia.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            aria-label="Fechar modal"
            className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handlePublish} className="space-y-4">
          {errorMsg && (
            <p
              role="alert"
              className="text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3.5 py-2.5"
            >
              {errorMsg}
            </p>
          )}

          {/* Multi-file Dropzone & Native Label Picker */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                void processSelectedFiles(e.dataTransfer.files);
              }
            }}
            className={`rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${
              isDragging
                ? 'border-orange-500 bg-orange-500/10'
                : 'border-zinc-700 bg-[#0b0c0e]'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-[#14161a] border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-orange-400">
              <FolderOpen className="w-6 h-6" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-zinc-100">
              {isProcessingFiles
                ? 'Processando imagens selecionadas...'
                : 'Faça upload das imagens dos exercícios do seu PC'}
            </p>
            <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
              Selecione dezenas de fotos de uma só vez — não precisa definir grupo agora. O nome do arquivo preenche o exercício automaticamente.
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <label
                className={`min-h-[44px] px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                  isProcessingFiles ? 'opacity-60 pointer-events-none' : ''
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isProcessingFiles}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      void processSelectedFiles(e.target.files);
                    }
                    e.target.value = '';
                  }}
                  className="sr-only"
                />
                <ImagePlus className="w-4 h-4" aria-hidden="true" />
                <span>
                  {drafts.length > 0
                    ? 'Fazer upload de mais imagens'
                    : 'Fazer upload de imagens do PC'}
                </span>
              </label>
            </div>
          </div>

          {/* Drafts List */}
          {drafts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                <span>
                  <strong className="text-zinc-100 font-mono">
                    {drafts.length}
                  </strong>{' '}
                  exercício{drafts.length === 1 ? '' : 's'} pronto
                  {drafts.length === 1 ? '' : 's'} para revisar e publicar
                </span>
                <button
                  type="button"
                  onClick={() => setDrafts([])}
                  className="text-rose-400 hover:text-rose-300 cursor-pointer"
                >
                  Limpar lista
                </button>
              </div>

              {drafts.map((item, idx) => {
                const isCardio = item.muscle === 'Cardio';
                return (
                  <div
                    key={item.tempId}
                    className="rounded-2xl bg-[#0b0c0e] border border-zinc-800 p-4 space-y-3"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-20 h-20 rounded-xl overflow-hidden border border-zinc-700 bg-[#14161a] shrink-0">
                        <img
                          src={item.imageUrl}
                          alt={item.name || `Exercício ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        <div className="sm:col-span-5">
                          <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                            Nome do exercício
                          </label>
                          <input
                            type="text"
                            required
                            value={item.name}
                            onChange={(e) =>
                              updateDraft(item.tempId, { name: e.target.value })
                            }
                            placeholder="Nome do exercício"
                            className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#14161a] border border-zinc-700 text-xs sm:text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                            Grupo (opcional)
                          </label>
                          <select
                            value={item.muscle}
                            onChange={(e) => {
                              const nextMuscle = e.target.value as ExerciseMuscle;
                              updateDraft(item.tempId, {
                                muscle: nextMuscle,
                                setsReps:
                                  nextMuscle === 'Cardio'
                                    ? ''
                                    : item.setsReps || '4 × 10–12',
                              });
                            }}
                            className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#14161a] border border-zinc-700 text-xs sm:text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
                          >
                            <option value={UNASSIGNED_MUSCLE}>
                              Sem grupo (professor organiza)
                            </option>
                            {MUSCLE_GROUPS.map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                        </div>

                        {isCardio ? (
                          <div className="sm:col-span-3">
                            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                              Tempo (min)
                            </label>
                            <input
                              type="number"
                              min={1}
                              step="any"
                              value={item.durationMinutes}
                              onChange={(e) =>
                                updateDraft(item.tempId, {
                                  durationMinutes: e.target.value,
                                })
                              }
                              className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#14161a] border border-zinc-700 text-xs sm:text-sm font-mono text-zinc-100 focus:outline-none focus:border-orange-500"
                            />
                          </div>
                        ) : (
                          <div className="sm:col-span-3">
                            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                              Séries / Reps
                            </label>
                            <input
                              type="text"
                              value={item.setsReps}
                              onChange={(e) =>
                                updateDraft(item.tempId, {
                                  setsReps: e.target.value,
                                })
                              }
                              placeholder="4 × 10–12"
                              className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#14161a] border border-zinc-700 text-xs sm:text-sm font-mono text-zinc-100 focus:outline-none focus:border-orange-500"
                            />
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setDrafts((prev) =>
                            prev.filter((d) => d.tempId !== item.tempId)
                          )
                        }
                        aria-label={`Remover ${item.name}`}
                        className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
                      <div className="sm:col-span-6">
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                          Detalhamento / Forma de execução
                        </label>
                        <textarea
                          rows={2}
                          value={item.executionInstructions}
                          onChange={(e) =>
                            updateDraft(item.tempId, {
                              executionInstructions: e.target.value,
                            })
                          }
                          placeholder="Postura, pegada, amplitude e respiração..."
                          className="w-full px-3 py-2 rounded-xl bg-[#14161a] border border-zinc-700 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 resize-y"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                          Observação rápida
                        </label>
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) =>
                            updateDraft(item.tempId, { notes: e.target.value })
                          }
                          placeholder="Ex: Controlar a descida"
                          className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#14161a] border border-zinc-700 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                          Link de vídeo (opcional)
                        </label>
                        <input
                          type="url"
                          value={item.videoUrl}
                          onChange={(e) =>
                            updateDraft(item.tempId, { videoUrl: e.target.value })
                          }
                          placeholder="YouTube / Vimeo / MP4"
                          className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[#14161a] border border-zinc-700 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800">
            <span className="text-xs text-zinc-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
              <span>
                Os professores poderão organizar cada exercício no grupo muscular desejado.
              </span>
            </span>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isPublishing}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-zinc-700 text-sm font-medium text-zinc-300 hover:text-zinc-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={drafts.length === 0 || isPublishing || isProcessingFiles}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-zinc-950 text-sm font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" aria-hidden="true" />
                <span>
                  {isPublishing
                    ? 'Publicando...'
                    : `Publicar ${drafts.length > 0 ? drafts.length : ''} na Galeria`}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
