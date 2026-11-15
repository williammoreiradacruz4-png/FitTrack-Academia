import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarRange, Link2, Plus, Search, X, Dumbbell } from 'lucide-react';
import { DEFAULT_EXERCISES } from './data/defaultExercises';
import {
  DAYS_META,
  DEFAULT_WORKOUT_PLAN,
  DayFilter,
  DayOfWeek,
  Exercise,
  FILTER_OPTIONS,
  FilterOption,
  WorkoutPlan,
  formatDayPlanSummary,
  getDaysForRange,
} from './types/workout';
import { compressImageFile } from './utils/imageCompression';
import { Header } from './components/Header';
import { WorkoutSummary } from './components/WorkoutSummary';
import { ExerciseCard } from './components/ExerciseCard';
import { ExerciseModal } from './components/ExerciseModal';
import { WorkoutPlanModal } from './components/WorkoutPlanModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SplashScreen } from './components/SplashScreen';

const STORAGE_KEY = 'fittrack_exercises_v1';
const PLAN_STORAGE_KEY = 'fittrack_plan_v1';

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

function loadInitialPlan(): WorkoutPlan {
  try {
    const raw = window.localStorage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return DEFAULT_WORKOUT_PLAN;
    const parsed = JSON.parse(raw) as WorkoutPlan;
    if (parsed && parsed.range && parsed.days) {
      return parsed;
    }
    return DEFAULT_WORKOUT_PLAN;
  } catch {
    return DEFAULT_WORKOUT_PLAN;
  }
}

export default function App() {
  const [exercises, setExercises] = useState<Exercise[]>(loadInitialExercises);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan>(loadInitialPlan);
  const [activeDay, setActiveDay] = useState<DayFilter>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
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
    try {
      window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(workoutPlan));
    } catch {
      // Ignore quota errors silently if storage is full
    }
  }, [workoutPlan]);

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

  const availableDays = useMemo(
    () => getDaysForRange(workoutPlan.range),
    [workoutPlan.range]
  );

  // If user shrinks schedule range (e.g. 7 -> 5 days) while viewing Sáb/Dom, return to Todos
  useEffect(() => {
    if (
      activeDay !== 'todos' &&
      !availableDays.some((d) => d.id === activeDay)
    ) {
      setActiveDay('todos');
    }
  }, [activeDay, availableDays]);

  const dayScopedExercises = useMemo(() => {
    if (activeDay === 'todos') return exercises;
    return exercises.filter((ex) => ex.days?.includes(activeDay));
  }, [exercises, activeDay]);

  const filteredExercises = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return dayScopedExercises.filter((ex) => {
      const matchesFilter = activeFilter === 'Todos' || ex.muscle === activeFilter;
      const matchesSearch =
        !normalizedSearch ||
        ex.name.toLowerCase().includes(normalizedSearch) ||
        ex.muscle.toLowerCase().includes(normalizedSearch);
      return matchesFilter && matchesSearch;
    });
  }, [dayScopedExercises, activeFilter, searchQuery]);

  const completedCount = useMemo(
    () => dayScopedExercises.filter((ex) => ex.completed).length,
    [dayScopedExercises]
  );

  const currentDayMeta =
    activeDay === 'todos'
      ? null
      : (DAYS_META.find((d) => d.id === activeDay) ?? null);

  const currentDayPlan =
    activeDay === 'todos' ? null : workoutPlan.days[activeDay];

  const matchingUnlinkedExercises = useMemo(() => {
    if (
      activeDay === 'todos' ||
      !currentDayPlan ||
      currentDayPlan.mode === 'descanso' ||
      currentDayPlan.muscles.length === 0
    ) {
      return [];
    }
    return exercises.filter(
      (ex) =>
        currentDayPlan.muscles.includes(ex.muscle) &&
        !ex.days?.includes(activeDay)
    );
  }, [activeDay, currentDayPlan, exercises]);

  const handleLinkMatchingToDay = () => {
    if (activeDay === 'todos' || matchingUnlinkedExercises.length === 0) return;
    const targetIds = new Set(matchingUnlinkedExercises.map((ex) => ex.id));
    setExercises((prev) =>
      prev.map((ex) => {
        if (!targetIds.has(ex.id)) return ex;
        const nextDays = ex.days ? [...ex.days, activeDay] : [activeDay];
        return { ...ex, days: nextDays };
      })
    );
  };

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
    if (activeDay === 'todos') {
      setExercises((prev) => prev.map((ex) => ({ ...ex, completed: false })));
      showUndoToast('Marcações do dia zeradas.', snapshot);
    } else {
      setExercises((prev) =>
        prev.map((ex) =>
          ex.days?.includes(activeDay) ? { ...ex, completed: false } : ex
        )
      );
      showUndoToast(`Marcações de ${currentDayMeta?.short ?? 'hoje'} zeradas.`, snapshot);
    }
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

  const handleSavePlan = (nextPlan: WorkoutPlan) => {
    setWorkoutPlan(nextPlan);
  };

  const defaultDayForNewExercise: DayOfWeek | undefined =
    activeDay === 'todos' ? undefined : activeDay;

  const defaultMuscleForNewExercise =
    currentDayPlan && currentDayPlan.muscles.length > 0
      ? currentDayPlan.muscles[0]
      : undefined;

  return (
    <div className="min-h-screen bg-[#0b0c0e] text-zinc-100 pb-24 sm:pb-12">
      {showSplash && (
        <SplashScreen durationMs={5000} onFinish={() => setShowSplash(false)} />
      )}
      <Header
        completedCount={completedCount}
        totalCount={dayScopedExercises.length}
        onResetChecks={handleResetChecks}
        onOpenNewModal={handleOpenNewModal}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar / Summary & Rest Timer */}
        <div className="lg:col-span-4">
          <WorkoutSummary
            exercises={dayScopedExercises}
            activeFilter={activeFilter}
            onSelectFilter={setActiveFilter}
          />
        </div>

        {/* Right Main Exercise Feed */}
        <section aria-label="Lista de exercícios" className="lg:col-span-8 space-y-4">
          {/* Weekly Plan Strip */}
          <div className="flex items-center justify-between gap-2">
            <div
              role="tablist"
              aria-label="Dias do plano semanal"
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeDay === 'todos'}
                onClick={() => setActiveDay('todos')}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                  activeDay === 'todos'
                    ? 'bg-zinc-100 text-zinc-950 font-bold'
                    : 'bg-[#14161a] text-zinc-300 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-100'
                }`}
              >
                Geral
              </button>

              {availableDays.map((day) => {
                const isActive = activeDay === day.id;
                const dayPlan = workoutPlan.days[day.id];
                const isRest = dayPlan.mode === 'descanso';
                return (
                  <button
                    key={day.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveDay(day.id)}
                    className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                      isActive
                        ? 'bg-orange-500 text-zinc-950 font-bold'
                        : isRest
                          ? 'bg-[#14161a] text-zinc-500 border border-zinc-800/80 hover:text-zinc-300'
                          : 'bg-[#14161a] text-zinc-300 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-100'
                    }`}
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsPlanModalOpen(true)}
              className="min-h-[40px] px-3 py-2 rounded-xl bg-[#14161a] border border-zinc-800 hover:border-orange-500/50 text-xs font-semibold text-zinc-200 hover:text-orange-300 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              <CalendarRange className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
              <span className="hidden xs:inline sm:inline">Plano Semanal</span>
            </button>
          </div>

          {/* Active Day Focus Banner (unboxed editorial header) */}
          {currentDayMeta && currentDayPlan && (
            <div className="bg-[#14161a] border border-zinc-800 rounded-2xl px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span>{currentDayMeta.label}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {currentDayPlan.mode === 'simples'
                      ? 'Treino simples'
                      : currentDayPlan.mode === 'descanso'
                        ? 'Dia de descanso'
                        : `Conjugado (${currentDayPlan.muscles.length} grupos)`}
                  </span>
                </div>
                <p className="text-base font-bold text-orange-400 mt-0.5 truncate">
                  {formatDayPlanSummary(currentDayPlan)}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {matchingUnlinkedExercises.length > 0 && (
                  <button
                    type="button"
                    onClick={handleLinkMatchingToDay}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-orange-500/15 border border-orange-500/40 hover:bg-orange-500/25 text-xs font-semibold text-orange-300 flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
                  >
                    <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Vincular existentes ({matchingUnlinkedExercises.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(true)}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl border border-zinc-700 hover:border-zinc-600 text-xs font-medium text-zinc-300 hover:text-zinc-100 whitespace-nowrap transition-colors cursor-pointer"
                >
                  Editar dia
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
                  showAssignedDays={activeDay === 'todos'}
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
                {currentDayPlan?.mode === 'descanso'
                  ? `Descanso em ${currentDayMeta?.label}`
                  : 'Nenhum exercício encontrado'}
              </h3>
              <p className="text-sm text-zinc-400 mt-1 max-w-sm mx-auto">
                {searchQuery || activeFilter !== 'Todos'
                  ? 'Tente limpar a busca ou selecionar outro grupo muscular.'
                  : activeDay !== 'todos' && currentDayPlan
                    ? currentDayPlan.mode === 'descanso'
                      ? 'Este dia está marcado como descanso no plano semanal. Você ainda pode adicionar um exercício ou editar o dia.'
                      : `Adicione exercícios para ${currentDayMeta?.label} (${formatDayPlanSummary(currentDayPlan)}) ou vincule os que já existem.`
                    : 'Adicione seu primeiro exercício para montar sua ficha de treino.'}
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
                {matchingUnlinkedExercises.length > 0 && (
                  <button
                    type="button"
                    onClick={handleLinkMatchingToDay}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-orange-500/40 bg-orange-500/15 text-xs font-semibold text-orange-300 hover:bg-orange-500/25 transition-colors cursor-pointer"
                  >
                    Vincular existentes ({matchingUnlinkedExercises.length})
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
        defaultDay={defaultDayForNewExercise}
        defaultMuscle={defaultMuscleForNewExercise}
        scheduleRange={workoutPlan.range}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveExercise}
      />

      {/* Weekly Workout Plan Modal */}
      <WorkoutPlanModal
        isOpen={isPlanModalOpen}
        initialPlan={workoutPlan}
        initialDay={activeDay === 'todos' ? 'seg' : activeDay}
        onClose={() => setIsPlanModalOpen(false)}
        onSave={handleSavePlan}
      />

      <OfflineIndicator />
    </div>
  );
}
