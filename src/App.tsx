import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, X, Dumbbell } from 'lucide-react';
import { DEFAULT_EXERCISES } from './data/defaultExercises';
import { Exercise, FILTER_OPTIONS, FilterOption } from './types/workout';
import { compressImageFile } from './utils/imageCompression';
import { Header } from './components/Header';
import { WorkoutSummary } from './components/WorkoutSummary';
import { ExerciseCard } from './components/ExerciseCard';
import { ExerciseModal } from './components/ExerciseModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SplashScreen } from './components/SplashScreen';

const STORAGE_KEY = 'fittrack_exercises_v1';

interface UndoToastState {
  message: string;
  previousExercises: Exercise[];
}

function loadInitialExercises(): Exercise[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_EXERCISES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_EXERCISES;
  } catch {
    return DEFAULT_EXERCISES;
  }
}

export default function App() {
  const [exercises, setExercises] = useState<Exercise[]>(loadInitialExercises);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [undoToast, setUndoToast] = useState<UndoToastState | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  const uploadTargetIdRef = useRef<string | null>(null);
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(exercises));
    } catch {
      // Ignore quota errors silently if storage is full
    }
  }, [exercises]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showUndoToast = (message: string, previousExercises: Exercise[]) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setUndoToast({ message, previousExercises });
    toastTimerRef.current = window.setTimeout(() => {
      setUndoToast(null);
    }, 5000);
  };

  const handleUndo = () => {
    if (!undoToast) return;
    setExercises(undoToast.previousExercises);
    setUndoToast(null);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
  };

  const filteredExercises = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return exercises.filter((ex) => {
      const matchesFilter = activeFilter === 'Todos' || ex.muscle === activeFilter;
      const matchesSearch =
        !normalizedSearch ||
        ex.name.toLowerCase().includes(normalizedSearch) ||
        ex.muscle.toLowerCase().includes(normalizedSearch);
      return matchesFilter && matchesSearch;
    });
  }, [exercises, activeFilter, searchQuery]);

  const completedCount = useMemo(
    () => exercises.filter((ex) => ex.completed).length,
    [exercises]
  );

  const handleToggleComplete = (id: string) => {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, completed: !ex.completed } : ex))
    );
  };

  const handleUpdateWeight = (id: string, weight: number) => {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, weight } : ex))
    );
  };

  const handleResetChecks = () => {
    if (completedCount === 0) return;
    const snapshot = exercises;
    setExercises((prev) => prev.map((ex) => ({ ...ex, completed: false })));
    showUndoToast('Marcações do dia zeradas.', snapshot);
  };

  const handleTriggerImageUpload = (id: string) => {
    uploadTargetIdRef.current = id;
    hiddenFileInputRef.current?.click();
  };

  const handleHiddenImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetId = uploadTargetIdRef.current;
    e.target.value = '';
    if (!file || !targetId) return;

    try {
      const compressed = await compressImageFile(file);
      setExercises((prev) =>
        prev.map((ex) => (ex.id === targetId ? { ...ex, imageUrl: compressed } : ex))
      );
    } catch {
      // Fail gracefully without alert
    } finally {
      uploadTargetIdRef.current = null;
    }
  };

  const handleOpenNewModal = () => {
    setEditingExercise(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setIsModalOpen(true);
  };

  const handleSaveExercise = (
    data: Omit<Exercise, 'id' | 'completed'>,
    existingId?: string
  ) => {
    if (existingId) {
      setExercises((prev) =>
        prev.map((ex) => (ex.id === existingId ? { ...ex, ...data } : ex))
      );
      return;
    }

    const newExercise: Exercise = {
      id: `ex-${Date.now()}`,
      completed: false,
      ...data,
    };
    setExercises((prev) => [newExercise, ...prev]);
    if (activeFilter !== 'Todos' && activeFilter !== data.muscle) {
      setActiveFilter('Todos');
    }
  };

  const handleDeleteExercise = (id: string) => {
    const target = exercises.find((ex) => ex.id === id);
    if (!target) return;
    const snapshot = exercises;
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
    showUndoToast(`"${target.name}" removido.`, snapshot);
  };

  return (
    <div className="min-h-screen bg-[#0b0c0e] text-zinc-100 pb-24 sm:pb-12">
      {showSplash && (
        <SplashScreen durationMs={5000} onFinish={() => setShowSplash(false)} />
      )}
      <Header
        completedCount={completedCount}
        totalCount={exercises.length}
        onResetChecks={handleResetChecks}
        onOpenNewModal={handleOpenNewModal}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar / Summary & Rest Timer */}
        <div className="lg:col-span-4">
          <WorkoutSummary
            exercises={exercises}
            activeFilter={activeFilter}
            onSelectFilter={setActiveFilter}
          />
        </div>

        {/* Right Main Exercise Feed */}
        <section aria-label="Lista de exercícios" className="lg:col-span-8 space-y-4">
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
                placeholder="Buscar exercício..."
                aria-label="Buscar exercício"
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
              aria-label="Filtrar por grupo muscular"
              className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
            >
              {FILTER_OPTIONS.map((option) => {
                const isActive = activeFilter === option;
                return (
                  <button
                    key={option}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveFilter(option)}
                    className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
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

          {/* Exercise Cards List */}
          {filteredExercises.length > 0 ? (
            <div className="space-y-3">
              {filteredExercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  onToggleComplete={handleToggleComplete}
                  onUpdateWeight={handleUpdateWeight}
                  onTriggerImageUpload={handleTriggerImageUpload}
                  onEdit={handleOpenEditModal}
                  onDelete={handleDeleteExercise}
                />
              ))}
            </div>
          ) : (
            <div className="bg-[#14161a] border border-zinc-800 rounded-2xl p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#0b0c0e] border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-400">
                <Dumbbell className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold text-zinc-100">
                Nenhum exercício encontrado
              </h3>
              <p className="text-sm text-zinc-400 mt-1 max-w-sm mx-auto">
                {searchQuery || activeFilter !== 'Todos'
                  ? 'Tente limpar a busca ou selecionar outro grupo muscular.'
                  : 'Adicione seu primeiro exercício para montar sua ficha de treino.'}
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
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
                <button
                  type="button"
                  onClick={handleOpenNewModal}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 text-xs font-bold transition-colors cursor-pointer"
                >
                  Adicionar exercício
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Hidden file input for card image upload */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleHiddenImageChange}
        className="hidden"
      />

      {/* Mobile Floating Action Button */}
      <button
        type="button"
        onClick={handleOpenNewModal}
        className="sm:hidden fixed bottom-4 right-4 z-30 h-11 px-4 rounded-full bg-orange-500 hover:bg-orange-400 active:scale-[0.98] text-zinc-950 text-sm font-bold shadow-lg shadow-black/60 flex items-center gap-1.5 transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
        <span>Exercício</span>
      </button>

      {/* Undo Toast */}
      {undoToast && (
        <div
          role="status"
          className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-40 sm:max-w-sm bg-[#14161a] border border-zinc-700 rounded-xl px-4 py-3 shadow-xl flex items-center justify-between gap-4"
        >
          <span className="text-xs font-medium text-zinc-200 truncate">
            {undoToast.message}
          </span>
          <button
            type="button"
            onClick={handleUndo}
            className="text-xs font-bold text-orange-400 hover:text-orange-300 whitespace-nowrap shrink-0 cursor-pointer py-1 px-2"
          >
            Desfazer
          </button>
        </div>
      )}

      {/* Add / Edit Exercise Modal */}
      <ExerciseModal
        isOpen={isModalOpen}
        editingExercise={editingExercise}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveExercise}
      />

      <OfflineIndicator />
    </div>
  );
}
