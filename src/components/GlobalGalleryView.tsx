import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Download,
  Dumbbell,
  FileText,
  Images,
  PlayCircle,
  Plus,
  Search,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import {
  Exercise,
  ExerciseMuscle,
  FILTER_OPTIONS,
  FilterOption,
  MUSCLE_GROUPS,
  UNASSIGNED_MUSCLE,
  formatCardioMinutes,
  isTimeBasedExercise,
} from '../types/workout';

interface GlobalGalleryViewProps {
  galleryExercises: Exercise[];
  academyExercises: Exercise[];
  academyName: string;
  onSelectExercise: (exercise: Exercise) => void;
  onImportExercises: (
    exercises: Exercise[],
    muscleOverrides?: Record<string, ExerciseMuscle>
  ) => Promise<{ addedCount: number; syncedToCloud: boolean }>;
  onGoToLibrary?: () => void;
  onOpenCreatorAccess?: () => void;
}

function normalizeMatchKey(ex: Pick<Exercise, 'name' | 'muscle'>): string {
  return `${ex.muscle}::${ex.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()}`;
}

function normalizeNameOnly(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function GalleryThumb({ exercise }: { exercise: Exercise }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [exercise.imageUrl]);

  if (exercise.imageUrl && !imgError) {
    return (
      <img
        key={exercise.imageUrl}
        src={exercise.imageUrl}
        alt={exercise.name}
        referrerPolicy={exercise.imageUrl.startsWith('data:') ? undefined : 'no-referrer'}
        onError={() => setImgError(true)}
        className="w-full h-full object-cover"
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center text-zinc-500">
      <Dumbbell className="w-6 h-6" aria-hidden="true" />
    </div>
  );
}

export function GlobalGalleryView({
  galleryExercises,
  academyExercises,
  academyName,
  onSelectExercise,
  onImportExercises,
  onGoToLibrary,
  onOpenCreatorAccess,
}: GlobalGalleryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('Todos');
  const [selectedMuscles, setSelectedMuscles] = useState<Record<string, ExerciseMuscle>>({});
  const [isImportingAll, setIsImportingAll] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const hasUnassignedInGallery = useMemo(
    () => galleryExercises.some((ex) => ex.muscle === UNASSIGNED_MUSCLE),
    [galleryExercises]
  );

  const filterTabs = useMemo<FilterOption[]>(() => {
    if (!hasUnassignedInGallery) return FILTER_OPTIONS;
    return ['Todos', UNASSIGNED_MUSCLE, ...MUSCLE_GROUPS];
  }, [hasUnassignedInGallery]);

  const academyLookup = useMemo(() => {
    const byId = new Map<string, Exercise>();
    const byKey = new Map<string, Exercise>();
    const byName = new Map<string, Exercise>();
    academyExercises.forEach((ex) => {
      byId.set(ex.id, ex);
      byKey.set(normalizeMatchKey(ex), ex);
      byName.set(normalizeNameOnly(ex.name), ex);
    });
    return { byId, byKey, byName };
  }, [academyExercises]);

  const getChosenMuscle = (galEx: Exercise): ExerciseMuscle =>
    selectedMuscles[galEx.id] ?? galEx.muscle;

  const findImportedMatch = (galEx: Exercise): Exercise | undefined => {
    const chosen = getChosenMuscle(galEx);
    return (
      academyLookup.byId.get(`gal-${galEx.id}`) ??
      academyLookup.byKey.get(normalizeMatchKey({ name: galEx.name, muscle: chosen })) ??
      academyLookup.byName.get(normalizeNameOnly(galEx.name))
    );
  };

  const filteredGallery = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return galleryExercises.filter((ex) => {
      const matchesFilter = activeFilter === 'Todos' || ex.muscle === activeFilter;
      const matchesSearch =
        !normalizedSearch ||
        ex.name.toLowerCase().includes(normalizedSearch) ||
        ex.muscle.toLowerCase().includes(normalizedSearch) ||
        (ex.notes ?? '').toLowerCase().includes(normalizedSearch);
      return matchesFilter && matchesSearch;
    });
  }, [galleryExercises, activeFilter, searchQuery]);

  const pendingToImport = useMemo(
    () => filteredGallery.filter((ex) => !findImportedMatch(ex)),
    [filteredGallery, academyLookup, selectedMuscles]
  );

  const totalPendingInAll = useMemo(
    () => galleryExercises.filter((ex) => !findImportedMatch(ex)).length,
    [galleryExercises, academyLookup, selectedMuscles]
  );

  const handleImportSingle = async (exercise: Exercise) => {
    setImportingId(exercise.id);
    setFeedbackMsg('');
    const chosenMuscle = getChosenMuscle(exercise);
    try {
      const res = await onImportExercises([exercise], {
        [exercise.id]: chosenMuscle,
      });
      if (res.addedCount > 0) {
        const destLabel =
          chosenMuscle === UNASSIGNED_MUSCLE
            ? 'Sem grupo (pronto para organizar na Biblioteca)'
            : chosenMuscle;
        setFeedbackMsg(
          res.syncedToCloud
            ? `"${exercise.name}" adicionado em ${destLabel} na biblioteca de ${academyName}.`
            : `"${exercise.name}" adicionado localmente em ${destLabel} (sem conexão com o Firebase).`
        );
      }
    } finally {
      setImportingId(null);
    }
  };

  const handleImportFiltered = async () => {
    if (pendingToImport.length === 0) return;
    setIsImportingAll(true);
    setFeedbackMsg('');
    try {
      const res = await onImportExercises(pendingToImport, selectedMuscles);
      if (res.addedCount > 0) {
        setFeedbackMsg(
          res.syncedToCloud
            ? `${res.addedCount} exercício${res.addedCount === 1 ? '' : 's'} importado${res.addedCount === 1 ? '' : 's'} para a biblioteca de ${academyName}.`
            : `${res.addedCount} exercício${res.addedCount === 1 ? '' : 's'} adicionado${res.addedCount === 1 ? '' : 's'} localmente.`
        );
      }
    } finally {
      setIsImportingAll(false);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5">
      {/* Header Banner */}
      <section className="bg-[#14161a] border border-zinc-800 rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-400">
            <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Galeria Oficial FitTrack</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-50 tracking-tight">
            Catálogo Global de Exercícios
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Explore os exercícios com imagens e detalhamento completo cadastrados pelo criador do app. Escolha em qual grupo muscular deseja organizar cada exercício e adicione à biblioteca de <strong className="text-zinc-200">{academyName}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="px-3.5 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-800 text-xs">
            <span className="text-zinc-400">Disponíveis: </span>
            <strong className="font-mono tabular-nums text-zinc-100">
              {galleryExercises.length}
            </strong>
            {totalPendingInAll > 0 && (
              <>
                <span className="text-zinc-600 mx-1.5">·</span>
                <span className="text-orange-400 font-semibold">
                  {totalPendingInAll} novo{totalPendingInAll === 1 ? '' : 's'}
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            disabled={pendingToImport.length === 0 || isImportingAll}
            onClick={() => void handleImportFiltered()}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-45 disabled:pointer-events-none text-zinc-950 text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {isImportingAll
                ? 'Importando...'
                : pendingToImport.length > 0
                  ? `Importar ${activeFilter === 'Todos' ? 'todos' : activeFilter} (${pendingToImport.length})`
                  : 'Todos já importados'}
            </span>
          </button>

          {onOpenCreatorAccess && (
            <button
              type="button"
              onClick={onOpenCreatorAccess}
              className="min-h-[44px] px-3.5 py-2 rounded-xl border border-orange-500/45 bg-orange-500/10 hover:bg-orange-500/20 text-xs font-bold text-orange-300 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Sou o Criador · Upload</span>
            </button>
          )}
        </div>
      </section>

      {feedbackMsg && (
        <div
          role="status"
          className="rounded-xl bg-emerald-500/15 border border-emerald-500/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs font-medium text-emerald-200"
        >
          <span>{feedbackMsg}</span>
          <div className="flex items-center gap-2">
            {onGoToLibrary && (
              <button
                type="button"
                onClick={onGoToLibrary}
                className="min-h-[34px] px-3 py-1 rounded-lg bg-emerald-500 text-zinc-950 font-bold hover:bg-emerald-400 transition-colors cursor-pointer"
              >
                Organizar na Biblioteca
              </button>
            )}
            <button
              type="button"
              onClick={() => setFeedbackMsg('')}
              aria-label="Fechar aviso"
              className="p-1 text-emerald-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Search & Muscle Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search
            className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar na galeria global por nome ou músculo..."
            aria-label="Buscar exercício na galeria"
            className="w-full min-h-[44px] pl-10 pr-11 py-2.5 rounded-xl bg-[#14161a] border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Limpar busca"
              className="min-w-[44px] min-h-[44px] absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center text-zinc-400 hover:text-zinc-100 cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div
          role="tablist"
          aria-label="Filtrar galeria por grupo muscular"
          className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
        >
          {filterTabs.map((option) => {
            const isActive = activeFilter === option;
            return (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveFilter(option)}
                className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-orange-500 text-zinc-950 font-bold'
                    : 'bg-[#14161a] text-zinc-300 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-100'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {/* Gallery Grid */}
      {filteredGallery.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredGallery.map((exercise) => {
            const importedMatch = findImportedMatch(exercise);
            const chosenMuscle = getChosenMuscle(exercise);
            const isCardio = chosenMuscle === 'Cardio';
            const isTimeBased = isTimeBasedExercise(chosenMuscle, exercise.name);
            const hasWritten = Boolean(
              exercise.executionInstructions?.trim() || exercise.notes?.trim()
            );
            const hasVideo = Boolean(exercise.videoUrl?.trim());
            const metricText = isCardio
              ? `${formatCardioMinutes(exercise.durationSeconds)} min`
              : isTimeBased
                ? `${exercise.durationSeconds ?? exercise.weight} seg`
                : exercise.weight > 0
                  ? `${exercise.weight} kg`
                  : null;

            return (
              <article
                key={exercise.id}
                className="bg-[#14161a] border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 space-y-3 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <button
                    type="button"
                    onClick={() => onSelectExercise(exercise)}
                    className="w-20 h-20 rounded-xl bg-[#0b0c0e] border border-zinc-800 overflow-hidden shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                    aria-label={`Ver detalhes de ${exercise.name}`}
                  >
                    <GalleryThumb exercise={exercise} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-400">
                      <span
                        className={`font-semibold ${
                          exercise.muscle === UNASSIGNED_MUSCLE
                            ? 'text-amber-300'
                            : 'text-orange-400'
                        }`}
                      >
                        {exercise.muscle === UNASSIGNED_MUSCLE
                          ? 'Sem grupo · organizar na biblioteca'
                          : exercise.muscle}
                      </span>
                      {!isCardio && exercise.setsReps.trim().length > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-zinc-200">
                            {exercise.setsReps}
                          </span>
                        </>
                      )}
                      {metricText && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-zinc-300">
                            {metricText}
                          </span>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectExercise(exercise)}
                      className="block text-left font-semibold text-sm sm:text-base text-zinc-100 hover:text-orange-400 transition-colors truncate max-w-full mt-0.5 cursor-pointer"
                    >
                      {exercise.name}
                    </button>

                    {(exercise.executionInstructions?.trim() || exercise.notes?.trim()) && (
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                        {exercise.executionInstructions?.trim() || exercise.notes?.trim()}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2.5 mt-1.5 text-[11px] text-zinc-400">
                      {hasWritten && (
                        <span className="inline-flex items-center gap-1 text-zinc-300">
                          <FileText className="w-3 h-3 text-orange-400" aria-hidden="true" />
                          <span>Detalhamento</span>
                        </span>
                      )}
                      {hasVideo && (
                        <span className="inline-flex items-center gap-1 text-zinc-300">
                          <PlayCircle className="w-3 h-3 text-purple-400" aria-hidden="true" />
                          <span>Vídeo</span>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectExercise(exercise)}
                        className="text-zinc-400 hover:text-orange-300 underline underline-offset-2 cursor-pointer"
                      >
                        Ver ficha completa
                      </button>
                    </div>
                  </div>
                </div>

                {/* Professor Organization Bar: Assign Muscle Group + Import */}
                <div className="pt-2.5 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2.5">
                  {importedMatch ? (
                    <>
                      <span className="text-xs text-zinc-400">
                        Organizado em{' '}
                        <strong className="text-emerald-300">
                          {importedMatch.muscle}
                        </strong>
                      </span>
                      <span className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/35 text-xs font-semibold text-emerald-300 inline-flex items-center gap-1.5 whitespace-nowrap">
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Na academia</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <label className="flex items-center gap-2 text-xs text-zinc-400 min-w-0">
                        <span className="whitespace-nowrap">Grupo:</span>
                        <select
                          value={chosenMuscle}
                          onChange={(e) =>
                            setSelectedMuscles((prev) => ({
                              ...prev,
                              [exercise.id]: e.target.value as ExerciseMuscle,
                            }))
                          }
                          aria-label={`Escolher grupo muscular para ${exercise.name}`}
                          className="min-h-[38px] px-2.5 py-1 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-xs font-medium text-zinc-100 focus:outline-none focus:border-orange-500 cursor-pointer"
                        >
                          {exercise.muscle === UNASSIGNED_MUSCLE && (
                            <option value={UNASSIGNED_MUSCLE}>
                              Organizar na biblioteca (Sem grupo)
                            </option>
                          )}
                          {MUSCLE_GROUPS.map((group) => (
                            <option key={group} value={group}>
                              {group}
                            </option>
                          ))}
                        </select>
                      </label>

                      <button
                        type="button"
                        disabled={importingId === exercise.id || isImportingAll}
                        onClick={() => void handleImportSingle(exercise)}
                        className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-orange-500/15 border border-orange-500/50 hover:bg-orange-500 hover:text-zinc-950 text-xs font-bold text-orange-300 inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>
                          {importingId === exercise.id ? 'Adicionando...' : 'Adicionar'}
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#14161a] border border-zinc-800 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#0b0c0e] border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-400">
            <Images className="w-6 h-6" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-zinc-100">
            {galleryExercises.length === 0
              ? 'Galeria Global ainda vazia'
              : 'Nenhum exercício encontrado na galeria'}
          </h3>
          <p className="text-sm text-zinc-400 mt-1 max-w-md mx-auto">
            {galleryExercises.length === 0
              ? 'Assim que o criador do aplicativo cadastrar os exercícios na Galeria Oficial, todos aparecerão aqui automaticamente em tempo real.'
              : 'Tente limpar a busca ou selecionar outro grupo muscular.'}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {(searchQuery || activeFilter !== 'Todos') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilter('Todos');
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-zinc-700 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
            {onOpenCreatorAccess && (
              <button
                type="button"
                onClick={onOpenCreatorAccess}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" aria-hidden="true" />
                <span>Sou o Criador · Fazer Upload de Imagens</span>
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
