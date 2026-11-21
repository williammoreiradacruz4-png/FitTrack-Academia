import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BellRing,
  ClipboardList,
  Dumbbell,
  FolderOpen,
  Images,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { DEFAULT_EXERCISES } from './data/defaultExercises';
import {
  Academy,
  DAYS_META,
  DEFAULT_REMINDERS,
  DEFAULT_WORKOUT_PLAN,
  DayFilter,
  DayOfWeek,
  Exercise,
  ExerciseMuscle,
  FILTER_OPTIONS,
  FilterOption,
  GALLERY_GYM_CODE,
  MUSCLE_GROUPS,
  ReminderSettings,
  StudentProfile,
  StudentWorkoutRecord,
  UNASSIGNED_MUSCLE,
  UserSession,
  WorkoutPlan,
  formatDayPlanSummary,
  getDaysForRange,
  getLocalDateKey,
  getTodayDayId,
  normalizeAcademyCode,
  normalizeCpf,
} from './types/workout';
import { compressImageFile, compressLogoFile } from './utils/imageCompression';
import {
  deleteLibraryExercise,
  fetchStudentWorkoutByCpf,
  importGalleryExercisesToGym,
  saveBulkLibraryExercises,
  saveLibraryExercise,
  subscribeAcademyByCode,
  subscribeGlobalGallery,
  subscribeLibraryByGym,
  subscribeStudentProfileByCpf,
  subscribeStudentWorkout,
  updateAcademyLogo,
  updateStudentWorkoutExercises,
} from './utils/fittrackStore';
import { Header } from './components/Header';
import { WorkoutSummary } from './components/WorkoutSummary';
import { ExerciseCard } from './components/ExerciseCard';
import { ExerciseModal } from './components/ExerciseModal';
import { ExerciseDetailsModal } from './components/ExerciseDetailsModal';
import { RemindersModal } from './components/RemindersModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './components/LoginScreen';
import { PhysicalAssessmentView } from './components/PhysicalAssessmentView';
import { StudentWaitingScreen } from './components/StudentWaitingScreen';
import { StudentAssessmentView } from './components/StudentAssessmentView';
import { LinkAcademyModal } from './components/LinkAcademyModal';
import { QrCodeModal } from './components/QrCodeModal';
import { GlobalGalleryView } from './components/GlobalGalleryView';
import { BulkGalleryUploadModal } from './components/BulkGalleryUploadModal';
import { CreatorAccessModal } from './components/CreatorAccessModal';

const PLAN_STORAGE_KEY = 'fittrack_plan_v1';
const REMINDERS_STORAGE_KEY = 'fittrack_reminders_v1';
const SESSION_STORAGE_KEY = 'fittrack_session_v1';

interface UndoToastState {
  message: string;
  previousExercises: Exercise[];
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

function loadInitialReminders(): ReminderSettings {
  try {
    const raw = window.localStorage.getItem(REMINDERS_STORAGE_KEY);
    if (!raw) return DEFAULT_REMINDERS;
    const parsed = JSON.parse(raw) as ReminderSettings;
    if (parsed && typeof parsed.workoutTime === 'string') {
      return { ...DEFAULT_REMINDERS, ...parsed };
    }
    return DEFAULT_REMINDERS;
  } catch {
    return DEFAULT_REMINDERS;
  }
}

function loadInitialSession(): UserSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserSession;
    if (
      parsed &&
      (parsed.role === 'student' || parsed.role === 'professor') &&
      typeof parsed.name === 'string' &&
      parsed.name.trim()
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

interface ActiveReminderBanner {
  title: string;
  body: string;
  targetDay?: DayOfWeek;
}

type ProfessorTab = 'workouts' | 'gallery' | 'assessment';
type StudentTab = 'workout' | 'assessment';

export default function App() {
  const [session, setSession] = useState<UserSession | null>(loadInitialSession);
  const [professorTab, setProfessorTab] = useState<ProfessorTab>('workouts');
  const [studentTab, setStudentTab] = useState<StudentTab>('workout');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [galleryExercises, setGalleryExercises] = useState<Exercise[]>([]);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [studentWorkout, setStudentWorkout] = useState<StudentWorkoutRecord | null>(null);
  const [isCheckingWorkout, setIsCheckingWorkout] = useState(false);
  const [workoutPlan] = useState<WorkoutPlan>(loadInitialPlan);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(loadInitialReminders);
  const [activeDay, setActiveDay] = useState<DayFilter>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isCreatorAccessOpen, setIsCreatorAccessOpen] = useState(false);
  const [isRemindersModalOpen, setIsRemindersModalOpen] = useState(false);
  const [isLinkAcademyModalOpen, setIsLinkAcademyModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [detailsExercise, setDetailsExercise] = useState<Exercise | null>(null);
  const [detailsFromGallery, setDetailsFromGallery] = useState(false);
  const [undoToast, setUndoToast] = useState<UndoToastState | null>(null);
  const [reminderBanner, setReminderBanner] = useState<ActiveReminderBanner | null>(null);
  const [gymMissingInCloud, setGymMissingInCloud] = useState(false);
  const [syncWarning, setSyncWarning] = useState('');
  const [showSplash, setShowSplash] = useState(true);

  const uploadTargetIdRef = useRef<string | null>(null);
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<number | null>(null);
  const exercisesRef = useRef<Exercise[]>(exercises);
  exercisesRef.current = exercises;

  useEffect(() => {
    try {
      window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(workoutPlan));
    } catch {
      // Ignore quota errors silently if storage is full
    }
  }, [workoutPlan]);

  useEffect(() => {
    try {
      if (session) {
        window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } else {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, [session]);

  useEffect(() => {
    try {
      window.localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminderSettings));
    } catch {
      // Ignore storage errors
    }
  }, [reminderSettings]);

  const handleLogin = (nextSession: UserSession) => {
    setSession(nextSession);
    setProfessorTab('workouts');
    setStudentTab('workout');
    setActiveDay('todos');
    setSearchQuery('');
    setActiveFilter('Todos');
  };

  const handleLogout = () => {
    setSession(null);
    setExercises([]);
    setGalleryExercises([]);
    setStudentProfile(null);
    setStudentWorkout(null);
    setProfessorTab('workouts');
    setStudentTab('workout');
    setActiveDay('todos');
    setSearchQuery('');
    setActiveFilter('Todos');
    setIsModalOpen(false);
    setIsBulkModalOpen(false);
    setIsCreatorAccessOpen(false);
    setIsRemindersModalOpen(false);
    setIsQrModalOpen(false);
    setDetailsExercise(null);
    setDetailsFromGallery(false);
    setEditingExercise(null);
    setUndoToast(null);
    setReminderBanner(null);
  };

  const isProfessor = session?.role === 'professor';
  const professorGymCode = normalizeAcademyCode(
    session?.academyCode ?? session?.identifier ?? ''
  );
  const isCreator = Boolean(
    isProfessor && (session?.isCreator || professorGymCode === GALLERY_GYM_CODE)
  );
  const studentCpf =
    session?.role === 'student'
      ? (session.cpf ?? normalizeCpf(session.identifier))
      : '';
  const studentHasWorkout = Boolean(
    studentWorkout && studentWorkout.exercises.length > 0
  );
  const activeExercises = isProfessor
    ? exercises
    : (studentWorkout?.exercises ?? []);
  const showWorkouts = isProfessor
    ? isCreator || professorTab === 'workouts'
    : studentTab === 'workout' && studentHasWorkout;

  // Real-time onSnapshot subscription for Professor Exercise Library (fittrack_library)
  useEffect(() => {
    if (!session || session.role !== 'professor' || !professorGymCode) {
      setExercises([]);
      return;
    }

    const unsubscribeLibrary = subscribeLibraryByGym(
      professorGymCode,
      isCreator ? [] : DEFAULT_EXERCISES,
      (cloudExercises) => setExercises(cloudExercises)
    );

    return () => {
      unsubscribeLibrary();
    };
  }, [session?.role, professorGymCode, isCreator]);

  // Real-time onSnapshot subscription for the Global Creator Gallery (visible to all professors/academies)
  useEffect(() => {
    if (!session || session.role !== 'professor' || isCreator) {
      setGalleryExercises([]);
      return;
    }

    const unsubscribeGallery = subscribeGlobalGallery((items) => {
      setGalleryExercises(items);
    });

    return () => {
      unsubscribeGallery();
    };
  }, [session?.role, isCreator]);

  // Load & subscribe in real time to personalized workout + profile when a student logs in
  useEffect(() => {
    if (!session || session.role !== 'student' || studentCpf.length !== 11) {
      setStudentProfile(null);
      setStudentWorkout(null);
      return;
    }

    const unsubProfile = subscribeStudentProfileByCpf(studentCpf, (prof) => {
      setStudentProfile(prof);
    });

    const unsubWorkout = subscribeStudentWorkout(studentCpf, (record) => {
      setStudentWorkout(record);
    });

    return () => {
      unsubProfile();
      unsubWorkout();
    };
  }, [session?.role, studentCpf]);

  // Keep academy name and custom logo synced in real time with Firestore (fittrack_gyms)
  useEffect(() => {
    const code = session?.academyCode;
    if (!code) {
      setGymMissingInCloud(false);
      return;
    }
    const unsubscribe = subscribeAcademyByCode(code, (academy, fromServer) => {
      if (!academy) {
        if (fromServer) {
          setGymMissingInCloud(true);
        }
        return;
      }
      setGymMissingInCloud(false);
      setSession((prev) => {
        if (!prev || normalizeAcademyCode(prev.academyCode ?? '') !== academy.gymCode) {
          return prev;
        }
        if (
          prev.academyName === academy.name &&
          prev.academyLogo === academy.logoUrl
        ) {
          return prev;
        }
        return {
          ...prev,
          academyName: academy.name,
          academyLogo: academy.logoUrl,
        };
      });
    });
    return () => {
      unsubscribe();
    };
  }, [session?.academyCode]);

  const handleUploadAcademyLogo = async (file: File) => {
    const code = session?.academyCode ?? session?.identifier;
    if (!isProfessor || !code) return;
    try {
      const compressedLogo = await compressLogoFile(file);
      await updateAcademyLogo(code, compressedLogo);
      setSession((prev) =>
        prev ? { ...prev, academyLogo: compressedLogo } : prev
      );
    } catch {
      // Fail gracefully without alert
    }
  };

  const handleRefreshStudentWorkout = async () => {
    if (studentCpf.length !== 11) return;
    setIsCheckingWorkout(true);
    try {
      const record = await fetchStudentWorkoutByCpf(studentCpf);
      setStudentWorkout(record);
    } finally {
      setIsCheckingWorkout(false);
    }
  };

  const sendSystemNotification = async (title: string, body: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (window.Notification.permission !== 'granted') return;
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.showNotification(title, {
            body,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
          });
          return;
        }
      }
      new window.Notification(title, {
        body,
        icon: '/pwa-192x192.png',
      });
    } catch {
      // Fallback safely to in-app banner only
    }
  };

  // Weekly workout reminder scheduler (Student only)
  useEffect(() => {
    if (!session || session.role !== 'student' || !reminderSettings.workoutEnabled) return;

    const checkWorkoutReminder = () => {
      const now = new Date();
      const todayKey = getLocalDateKey(now);
      const todayId = getTodayDayId(now);
      if (reminderSettings.lastWorkoutNotifiedDate === todayKey) return;
      if (!reminderSettings.activeDays.includes(todayId)) return;

      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      if (currentHHMM < reminderSettings.workoutTime) return;

      const dayMeta = DAYS_META.find((d) => d.id === todayId);
      const dayPlan = workoutPlan.days[todayId];
      const focusSummary = formatDayPlanSummary(dayPlan);
      const title = `Hora do treino — ${dayMeta?.label ?? 'Hoje'}`;
      const body =
        dayPlan.mode === 'descanso'
          ? 'Hoje é dia de descanso programado no seu plano.'
          : `Foco de hoje: ${focusSummary}`;

      setReminderBanner({
        title,
        body,
        targetDay: todayId,
      });
      void sendSystemNotification(title, body);
      setReminderSettings((prev) => ({
        ...prev,
        lastWorkoutNotifiedDate: todayKey,
      }));
    };

    checkWorkoutReminder();
    const interval = window.setInterval(checkWorkoutReminder, 30000);
    return () => window.clearInterval(interval);
  }, [session, reminderSettings, workoutPlan]);

  // Periodic daily water intake reminder while app is active (Student only)
  useEffect(() => {
    if (!session || session.role !== 'student' || !reminderSettings.waterEnabled) return;
    const ms = reminderSettings.waterIntervalMinutes * 60 * 1000;
    const interval = window.setInterval(() => {
      const title = 'Hora de beber água';
      const body = 'Mantenha sua hidratação em dia e registre no FitTrack.';
      setReminderBanner({ title, body });
      void sendSystemNotification(title, body);
    }, ms);
    return () => window.clearInterval(interval);
  }, [session, reminderSettings.waterEnabled, reminderSettings.waterIntervalMinutes]);

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
    if (isProfessor) {
      const currentIds = new Set(exercises.map((ex) => ex.id));
      const restored = undoToast.previousExercises.filter(
        (ex) => !currentIds.has(ex.id)
      );
      setExercises(undoToast.previousExercises);
      if (professorGymCode) {
        restored.forEach((ex) => {
          void saveLibraryExercise(professorGymCode, ex);
        });
      }
    } else if (studentCpf) {
      setStudentWorkout((prev) =>
        prev ? { ...prev, exercises: undoToast.previousExercises } : prev
      );
      void updateStudentWorkoutExercises(studentCpf, undoToast.previousExercises);
    }
    setUndoToast(null);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
  };

  const availableDays = useMemo(() => {
    const base = getDaysForRange(workoutPlan.range);
    if (isProfessor) return base;
    const hasSab = activeExercises.some((ex) => ex.days?.includes('sab'));
    const hasDom = activeExercises.some((ex) => ex.days?.includes('dom'));
    if (hasDom) return DAYS_META;
    if (hasSab && base.length < 6) return DAYS_META.slice(0, 6);
    return base;
  }, [workoutPlan.range, isProfessor, activeExercises]);

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
    if (isProfessor || activeDay === 'todos') return activeExercises;
    return activeExercises.filter((ex) => ex.days?.includes(activeDay));
  }, [isProfessor, activeExercises, activeDay]);

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

  const unassignedCount = useMemo(
    () =>
      isProfessor
        ? dayScopedExercises.filter((ex) => ex.muscle === UNASSIGNED_MUSCLE).length
        : 0,
    [isProfessor, dayScopedExercises]
  );

  const libraryFilterTabs = useMemo<FilterOption[]>(() => {
    if (isProfessor && unassignedCount > 0) {
      return ['Todos', UNASSIGNED_MUSCLE, ...MUSCLE_GROUPS];
    }
    return FILTER_OPTIONS;
  }, [isProfessor, unassignedCount]);

  useEffect(() => {
    if (activeFilter === UNASSIGNED_MUSCLE && unassignedCount === 0) {
      setActiveFilter('Todos');
    }
  }, [activeFilter, unassignedCount]);

  const currentDayMeta =
    activeDay === 'todos'
      ? null
      : (DAYS_META.find((d) => d.id === activeDay) ?? null);

  const currentDayPlan =
    activeDay === 'todos' ? null : workoutPlan.days[activeDay];

  const applyExerciseMutation = (
    updater: (list: Exercise[]) => Exercise[],
    changedId?: string
  ) => {
    if (isProfessor) {
      const nextList = updater(exercises);
      setExercises(nextList);
      if (professorGymCode && changedId) {
        const updatedItem = nextList.find((ex) => ex.id === changedId);
        if (updatedItem) {
          void saveLibraryExercise(professorGymCode, updatedItem).then((res) => {
            if (!res.syncedToCloud) {
              setSyncWarning(
                'Não foi possível sincronizar este exercício com o Firebase. Verifique sua conexão.'
              );
            } else {
              setSyncWarning('');
            }
          });
        }
      }
      return;
    }
    if (!studentCpf || !studentWorkout) return;
    const nextList = updater(studentWorkout.exercises);
    setStudentWorkout((prev) => (prev ? { ...prev, exercises: nextList } : prev));
    void updateStudentWorkoutExercises(studentCpf, nextList);
  };

  const handleToggleComplete = (id: string) => {
    applyExerciseMutation(
      (list) => list.map((ex) => (ex.id === id ? { ...ex, completed: !ex.completed } : ex)),
      id
    );
  };

  const handleUpdateWeight = (id: string, weight: number) => {
    applyExerciseMutation(
      (list) => list.map((ex) => (ex.id === id ? { ...ex, weight } : ex)),
      id
    );
  };

  const handleUpdateDuration = (id: string, durationSeconds: number) => {
    applyExerciseMutation(
      (list) =>
        list.map((ex) =>
          ex.id === id ? { ...ex, durationSeconds, weight: 0 } : ex
        ),
      id
    );
  };

  const handleUpdateMuscle = (id: string, nextMuscle: ExerciseMuscle) => {
    applyExerciseMutation(
      (list) =>
        list.map((ex) => {
          if (ex.id !== id) return ex;
          const becomingCardio = nextMuscle === 'Cardio';
          const wasCardio = ex.muscle === 'Cardio';
          return {
            ...ex,
            muscle: nextMuscle,
            setsReps: becomingCardio
              ? ''
              : wasCardio
                ? ex.setsReps || '4 × 10–12'
                : ex.setsReps,
            weight: becomingCardio ? 0 : ex.weight,
            durationSeconds: becomingCardio
              ? ex.durationSeconds || 1200
              : wasCardio
                ? undefined
                : ex.durationSeconds,
          };
        }),
      id
    );
  };

  const handleResetChecks = () => {
    if (completedCount === 0) return;
    const snapshot = activeExercises;
    if (activeDay === 'todos') {
      applyExerciseMutation((list) =>
        list.map((ex) => ({ ...ex, completed: false }))
      );
      showUndoToast('Marcações do dia zeradas.', snapshot);
    } else {
      applyExerciseMutation((list) =>
        list.map((ex) =>
          ex.days?.includes(activeDay) ? { ...ex, completed: false } : ex
        )
      );
      showUndoToast(`Marcações de ${currentDayMeta?.short ?? 'hoje'} zeradas.`, snapshot);
    }
  };

  const handleUploadImageFile = async (targetId: string, file: File) => {
    try {
      const compressed = await compressImageFile(file);
      const target = exercisesRef.current.find((ex) => ex.id === targetId);
      const updatedExercise = target
        ? { ...target, imageUrl: compressed, gymCode: professorGymCode || target.gymCode }
        : null;
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === targetId ? { ...ex, imageUrl: compressed } : ex
        )
      );
      setDetailsExercise((prev) =>
        prev && prev.id === targetId ? { ...prev, imageUrl: compressed } : prev
      );
      if (professorGymCode && updatedExercise) {
        void saveLibraryExercise(professorGymCode, updatedExercise).then((res) => {
          if (!res.syncedToCloud) {
            setSyncWarning(
              'Não foi possível sincronizar a imagem com o Firebase. Tente uma imagem menor ou verifique sua conexão.'
            );
          } else {
            setSyncWarning('');
          }
        });
      }
    } catch {
      setSyncWarning('Não foi possível processar a imagem selecionada.');
    }
  };

  const handleTriggerImageUpload = (id: string) => {
    uploadTargetIdRef.current = id;
    hiddenFileInputRef.current?.click();
  };

  const handleHiddenImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const file = inputEl.files?.[0];
    const targetId = uploadTargetIdRef.current;
    if (!file || !targetId) {
      inputEl.value = '';
      uploadTargetIdRef.current = null;
      return;
    }

    try {
      await handleUploadImageFile(targetId, file);
    } finally {
      inputEl.value = '';
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
      const target = exercises.find((ex) => ex.id === existingId);
      const updatedExercise: Exercise | null = target
        ? { ...target, ...data, gymCode: professorGymCode || target.gymCode }
        : null;
      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === existingId
            ? { ...ex, ...data, gymCode: professorGymCode || ex.gymCode }
            : ex
        )
      );
      if (professorGymCode && updatedExercise) {
        void saveLibraryExercise(professorGymCode, updatedExercise).then((res) => {
          if (!res.syncedToCloud) {
            setSyncWarning(
              'Não foi possível salvar a alteração no Firebase. Verifique sua conexão.'
            );
          } else {
            setSyncWarning('');
          }
        });
      }
      return;
    }

    const newExercise: Exercise = {
      id: `ex-${Date.now()}`,
      completed: false,
      gymCode: professorGymCode || undefined,
      ...data,
    };
    setExercises((prev) => [newExercise, ...prev]);
    if (professorGymCode) {
      void saveLibraryExercise(professorGymCode, newExercise).then((res) => {
        if (!res.syncedToCloud) {
          setSyncWarning(
            'Não foi possível sincronizar o novo exercício com o Firebase. Verifique sua conexão.'
          );
        } else {
          setSyncWarning('');
        }
      });
    }
    if (activeFilter !== 'Todos' && activeFilter !== data.muscle) {
      setActiveFilter('Todos');
    }
  };

  const handleDeleteExercise = (id: string) => {
    const target = exercises.find((ex) => ex.id === id);
    if (!target) return;
    const snapshot = exercises;
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
    if (professorGymCode) {
      void deleteLibraryExercise(professorGymCode, id).then((res) => {
        if (!res.syncedToCloud) {
          setSyncWarning(
            'Não foi possível remover o exercício no Firebase. Verifique sua conexão.'
          );
        } else {
          setSyncWarning('');
        }
      });
    }
    showUndoToast(`"${target.name}" removido.`, snapshot);
  };

  const handleImportGalleryExercises = async (
    items: Exercise[],
    muscleOverrides?: Record<string, ExerciseMuscle>
  ): Promise<{ addedCount: number; syncedToCloud: boolean }> => {
    if (!professorGymCode || isCreator) {
      return { addedCount: 0, syncedToCloud: false };
    }
    const res = await importGalleryExercisesToGym(
      professorGymCode,
      items,
      exercisesRef.current,
      muscleOverrides
    );
    if (res.addedExercises.length > 0) {
      setExercises((prev) => [...res.addedExercises, ...prev]);
    }
    if (!res.syncedToCloud && res.addedExercises.length > 0) {
      setSyncWarning(
        'Não foi possível sincronizar os exercícios importados com o Firebase. Verifique sua conexão.'
      );
    } else if (res.syncedToCloud) {
      setSyncWarning('');
    }
    return {
      addedCount: res.addedExercises.length,
      syncedToCloud: res.syncedToCloud,
    };
  };

  const handlePublishBulkGalleryExercises = async (
    items: Exercise[]
  ): Promise<{ syncedToCloud: boolean }> => {
    if (!isCreator || items.length === 0) {
      return { syncedToCloud: false };
    }
    setExercises((prev) => [...items, ...prev]);
    const res = await saveBulkLibraryExercises(GALLERY_GYM_CODE, items);
    if (!res.syncedToCloud) {
      setSyncWarning(
        'Não foi possível sincronizar todos os exercícios com o Firebase. Verifique sua conexão.'
      );
    } else {
      setSyncWarning('');
    }
    return res;
  };

  const defaultDayForNewExercise: DayOfWeek | undefined =
    isProfessor || activeDay === 'todos' ? undefined : activeDay;

  const defaultMuscleForNewExercise =
    !isProfessor && currentDayPlan && currentDayPlan.muscles.length > 0
      ? currentDayPlan.muscles[0]
      : undefined;

  if (showSplash) {
    return (
      <>
        <SplashScreen durationMs={5000} onFinish={() => setShowSplash(false)} />
        <OfflineIndicator />
      </>
    );
  }

  if (!session) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
        <OfflineIndicator />
      </>
    );
  }

  return (
    <>
      <div
        className={`min-h-screen bg-[#0b0c0e] text-zinc-100 pb-24 sm:pb-12 ${
          isQrModalOpen ? 'no-print' : ''
        }`}
      >
        <Header
          session={session}
          completedCount={completedCount}
          totalCount={dayScopedExercises.length}
          showWorkoutActions={showWorkouts}
          onResetChecks={handleResetChecks}
          onOpenNewModal={handleOpenNewModal}
          onOpenBulkUpload={isCreator ? () => setIsBulkModalOpen(true) : undefined}
          onOpenQrModal={() => setIsQrModalOpen(true)}
          onUploadAcademyLogo={
            isProfessor ? (file) => void handleUploadAcademyLogo(file) : undefined
          }
          onAcademyBadgeClick={() => setIsLinkAcademyModalOpen(true)}
          onLogout={handleLogout}
        />

      {(gymMissingInCloud || syncWarning) && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-3 space-y-2">
          {gymMissingInCloud && (
            <div
              role="alert"
              className="rounded-xl bg-amber-500/15 border border-amber-500/50 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200"
            >
              <span>
                A academia <strong className="font-mono">{session.academyCode}</strong> não foi encontrada no Firebase (<span className="font-mono">fittrack_gyms</span>). Clique em <strong>Sair</strong> e cadastre ou vincule uma academia ativa para sincronizar entre PC e celular.
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="min-h-[36px] px-3 py-1.5 rounded-lg bg-amber-500 text-zinc-950 font-bold cursor-pointer"
              >
                Sair e recadastrar
              </button>
            </div>
          )}
          {syncWarning && (
            <div
              role="alert"
              className="rounded-xl bg-rose-500/15 border border-rose-500/40 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-rose-200"
            >
              <span>{syncWarning}</span>
              <button
                type="button"
                onClick={() => setSyncWarning('')}
                aria-label="Fechar aviso de sincronização"
                className="p-1 text-rose-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}

      {isCreator ? (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
          <div className="rounded-2xl bg-orange-500/10 border border-orange-500/35 px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <Sparkles className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs text-zinc-200 leading-relaxed">
                <strong className="text-orange-300">Modo Criador · Galeria Oficial FitTrack:</strong>{' '}
                traga várias imagens da galeria do PC sem precisar escolher grupo muscular e adicione o detalhamento quando desejar. Todas as academias acessam na aba <strong>Galeria Global</strong> e cada professor organiza os exercícios na biblioteca.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(true)}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 text-xs font-bold inline-flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer"
              >
                <FolderOpen className="w-4 h-4" aria-hidden="true" />
                <span>Fazer upload de imagens do PC</span>
              </button>

              <button
                type="button"
                onClick={handleOpenNewModal}
                className="min-h-[42px] px-3.5 py-2 rounded-xl border border-orange-500/45 bg-[#14161a] hover:bg-orange-500/15 text-orange-300 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Novo Exercício</span>
              </button>
            </div>
          </div>
        </div>
      ) : isProfessor ? (
        <nav
          aria-label="Painel do professor"
          className="max-w-6xl mx-auto px-4 sm:px-6 pt-4"
        >
          <div
            role="tablist"
            className="flex flex-wrap sm:inline-flex gap-1.5 p-1 rounded-xl bg-[#14161a] border border-zinc-800"
          >
            <button
              type="button"
              role="tab"
              aria-selected={professorTab === 'workouts'}
              onClick={() => setProfessorTab('workouts')}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                professorTab === 'workouts'
                  ? 'bg-orange-500 text-zinc-950 font-bold'
                  : 'text-zinc-300 hover:text-zinc-100'
              }`}
            >
              <Dumbbell className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Biblioteca de Exercícios</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={professorTab === 'gallery'}
              onClick={() => setProfessorTab('gallery')}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                professorTab === 'gallery'
                  ? 'bg-orange-500 text-zinc-950 font-bold'
                  : 'text-zinc-300 hover:text-zinc-100'
              }`}
            >
              <Images className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                Galeria Global{galleryExercises.length > 0 ? ` (${galleryExercises.length})` : ''}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={professorTab === 'assessment'}
              onClick={() => setProfessorTab('assessment')}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                professorTab === 'assessment'
                  ? 'bg-purple-600 text-white font-bold'
                  : 'text-zinc-300 hover:text-zinc-100'
              }`}
            >
              <ClipboardList className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Avaliação Física</span>
            </button>
          </div>
        </nav>
      ) : (
        <nav
          aria-label="Painel do aluno"
          className="max-w-6xl mx-auto px-4 sm:px-6 pt-4"
        >
          <div
            role="tablist"
            className="grid grid-cols-2 sm:inline-grid gap-2 p-1 rounded-xl bg-[#14161a] border border-zinc-800"
          >
            <button
              type="button"
              role="tab"
              aria-selected={studentTab === 'workout'}
              onClick={() => setStudentTab('workout')}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                studentTab === 'workout'
                  ? 'bg-orange-500 text-zinc-950 font-bold'
                  : 'text-zinc-300 hover:text-zinc-100'
              }`}
            >
              <Dumbbell className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Meu Treino</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={studentTab === 'assessment'}
              onClick={() => setStudentTab('assessment')}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                studentTab === 'assessment'
                  ? 'bg-orange-500 text-zinc-950 font-bold'
                  : 'text-zinc-300 hover:text-zinc-100'
              }`}
            >
              <ClipboardList className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Minha Avaliação</span>
            </button>
          </div>
        </nav>
      )}

      {isProfessor && !isCreator && professorTab === 'gallery' ? (
        <GlobalGalleryView
          galleryExercises={galleryExercises}
          academyExercises={exercises}
          academyName={session.academyName ?? session.name}
          onSelectExercise={(ex) => {
            setDetailsFromGallery(true);
            setDetailsExercise(ex);
          }}
          onImportExercises={handleImportGalleryExercises}
          onGoToLibrary={() => {
            setProfessorTab('workouts');
            setActiveFilter('Todos');
          }}
          onOpenCreatorAccess={() => setIsCreatorAccessOpen(true)}
        />
      ) : isProfessor && !isCreator && professorTab === 'assessment' ? (
        <PhysicalAssessmentView
          academyCode={session.academyCode ?? session.identifier}
          academyName={session.academyName ?? session.name}
          libraryExercises={exercises}
          professorName={session.name}
        />
      ) : !isProfessor && studentTab === 'assessment' ? (
        <StudentAssessmentView
          studentCpf={studentCpf}
          studentName={session.name}
        />
      ) : !isProfessor && !studentHasWorkout ? (
        <StudentWaitingScreen
          studentName={session.name}
          studentProfile={studentProfile}
          academyName={session.academyName ?? studentProfile?.academyName}
          academyCode={session.academyCode ?? studentProfile?.academyCode}
          reminderSettings={reminderSettings}
          isChecking={isCheckingWorkout}
          onRefreshCheck={() => void handleRefreshStudentWorkout()}
          onOpenReminders={() => setIsRemindersModalOpen(true)}
          onOpenLinkAcademy={() => setIsLinkAcademyModalOpen(true)}
        />
      ) : (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Sidebar / Summary, Water & Rest Timer (Student) or Library Overview (Professor) */}
          <div className="lg:col-span-4">
            <WorkoutSummary
              exercises={dayScopedExercises}
              isProfessor={Boolean(isProfessor)}
              activeFilter={activeFilter}
              reminderSettings={reminderSettings}
              onSelectFilter={setActiveFilter}
              onOpenReminders={() => setIsRemindersModalOpen(true)}
            />
          </div>

        {/* Right Main Exercise Feed */}
        <section aria-label="Lista de exercícios" className="lg:col-span-8 space-y-4">
          {!isProfessor && reminderBanner && (
            <div
              role="status"
              className="bg-[#14161a] border border-orange-500/50 rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                <BellRing className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-100 truncate">
                    {reminderBanner.title}
                  </p>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    {reminderBanner.body}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {reminderBanner.targetDay &&
                  availableDays.some((d) => d.id === reminderBanner.targetDay) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (reminderBanner.targetDay) {
                          setActiveDay(reminderBanner.targetDay);
                        }
                        setReminderBanner(null);
                      }}
                      className="min-h-[40px] px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 text-xs font-bold whitespace-nowrap cursor-pointer"
                    >
                      Ver treino
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() => setReminderBanner(null)}
                  aria-label="Fechar lembrete"
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-100 cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
          {/* Weekly Plan Strip (Student only) */}
          {!isProfessor && (
            <>
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
              </div>

              {/* Active Day Focus Banner (Student only) */}
              {currentDayMeta && (
                <div className="bg-[#14161a] border border-zinc-800 rounded-2xl px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span>{currentDayMeta.label}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {`${dayScopedExercises.length} exercício${dayScopedExercises.length === 1 ? '' : 's'} prescrito${dayScopedExercises.length === 1 ? '' : 's'}`}
                      </span>
                    </div>
                    <p className="text-base font-bold text-orange-400 mt-0.5 truncate">
                      {dayScopedExercises.length > 0
                        ? Array.from(new Set(dayScopedExercises.map((e) => e.muscle))).join(' + ')
                        : 'Descanso'}
                    </p>
                  </div>
                </div>
              )}
            </>
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
              {libraryFilterTabs.map((option) => {
                const isActive = activeFilter === option;
                const isUnassignedTab = option === UNASSIGNED_MUSCLE;
                return (
                  <button
                    key={option}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveFilter(option)}
                    className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                      isActive
                        ? isUnassignedTab
                          ? 'bg-amber-400 text-zinc-950 font-bold'
                          : 'bg-orange-500 text-zinc-950 font-bold'
                        : isUnassignedTab
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/40 hover:border-amber-400'
                          : 'bg-[#14161a] text-zinc-300 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-100'
                    }`}
                  >
                    {isUnassignedTab ? `Sem grupo (${unassignedCount})` : option}
                  </button>
                );
              })}
            </div>
          </div>

          {isProfessor && !isCreator && unassignedCount > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-amber-200 leading-relaxed">
                <strong className="text-amber-300">
                  {unassignedCount} exercício{unassignedCount === 1 ? '' : 's'} sem grupo muscular definido.
                </strong>{' '}
                Escolha o grupo muscular diretamente no seletor de cada exercício abaixo para organizar sua biblioteca.
              </div>
              <button
                type="button"
                onClick={() =>
                  setActiveFilter(
                    activeFilter === UNASSIGNED_MUSCLE ? 'Todos' : UNASSIGNED_MUSCLE
                  )
                }
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer"
              >
                {activeFilter === UNASSIGNED_MUSCLE ? 'Ver todos' : 'Filtrar sem grupo'}
              </button>
            </div>
          )}

          {isProfessor && !isCreator && (
            <div className="bg-[#14161a] border border-zinc-800 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Images className="w-4 h-4 text-orange-400 shrink-0" aria-hidden="true" />
                <span className="text-xs text-zinc-300">
                  {galleryExercises.length > 0
                    ? `${galleryExercises.length} exercício${galleryExercises.length === 1 ? '' : 's'} na Galeria Global pronto${galleryExercises.length === 1 ? '' : 's'} para importar para sua academia.`
                    : 'Acesse a Galeria Global para visualizar e importar exercícios cadastrados pelo criador.'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setProfessorTab('gallery')}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-orange-500/15 border border-orange-500/40 hover:bg-orange-500 hover:text-zinc-950 text-xs font-bold text-orange-300 whitespace-nowrap transition-colors cursor-pointer"
              >
                Explorar Galeria
              </button>
            </div>
          )}

          {/* Exercise Cards List */}
          {filteredExercises.length > 0 ? (
            <div className="space-y-3">
              {filteredExercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  isProfessor={Boolean(isProfessor)}
                  showAssignedDays={!isProfessor && activeDay === 'todos'}
                  onSelectExercise={(ex) => {
                    setDetailsFromGallery(false);
                    setDetailsExercise(ex);
                  }}
                  onToggleComplete={handleToggleComplete}
                  onUpdateWeight={handleUpdateWeight}
                  onUpdateDuration={handleUpdateDuration}
                  onUpdateMuscle={isProfessor ? handleUpdateMuscle : undefined}
                  onTriggerImageUpload={handleTriggerImageUpload}
                  onUploadImageFile={
                    isProfessor ? (id, file) => void handleUploadImageFile(id, file) : undefined
                  }
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
                  : !isProfessor && activeDay !== 'todos' && currentDayPlan
                    ? currentDayPlan.mode === 'descanso'
                      ? 'Hoje é dia de descanso programado na sua ficha semanal.'
                      : `Ainda não há exercícios vinculados para ${currentDayMeta?.label}.`
                    : isCreator
                      ? 'Adicione seu primeiro exercício para disponibilizar na Galeria Global.'
                      : isProfessor
                        ? 'Adicione seu primeiro exercício ou importe da Galeria Global.'
                        : 'Nenhum exercício cadastrado na ficha no momento.'}
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
                {isProfessor && !isCreator && (
                  <button
                    type="button"
                    onClick={() => setProfessorTab('gallery')}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-orange-500/40 text-orange-300 hover:bg-orange-500/10 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Abrir Galeria Global
                  </button>
                )}
                {isCreator && (
                  <button
                    type="button"
                    onClick={() => setIsBulkModalOpen(true)}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-orange-500/40 text-orange-300 hover:bg-orange-500/10 text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4" aria-hidden="true" />
                    <span>Trazer várias imagens do PC</span>
                  </button>
                )}
                {isProfessor && (
                  <button
                    type="button"
                    onClick={handleOpenNewModal}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-zinc-950 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Adicionar exercício
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
      )}

      {/* Hidden file input for card image upload (Professor only) */}
      {isProfessor && (
        <input
          ref={hiddenFileInputRef}
          type="file"
          accept="image/*"
          onChange={handleHiddenImageChange}
          className="hidden"
        />
      )}

      {/* Mobile Floating Action Button (Professor only, on workouts tab) */}
      {isProfessor && showWorkouts && (
        <button
          type="button"
          onClick={handleOpenNewModal}
          className="sm:hidden fixed bottom-4 right-4 z-30 h-11 px-4 rounded-full bg-orange-500 hover:bg-orange-400 active:scale-[0.98] text-zinc-950 text-sm font-bold shadow-lg shadow-black/60 flex items-center gap-1.5 transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
          <span>Exercício</span>
        </button>
      )}

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

      {/* Add / Edit Exercise Modal (Professor & Creator) */}
      {isProfessor && (
        <ExerciseModal
          isOpen={isModalOpen}
          editingExercise={editingExercise}
          isCreator={isCreator}
          defaultDay={defaultDayForNewExercise}
          defaultMuscle={defaultMuscleForNewExercise}
          scheduleRange={workoutPlan.range}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveExercise}
        />
      )}

      {/* Bulk PC Image Upload Modal (Creator only) */}
      {isCreator && (
        <BulkGalleryUploadModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          onPublishAll={handlePublishBulkGalleryExercises}
        />
      )}

      {/* Creator Access Modal (Quick switch from Global Gallery) */}
      <CreatorAccessModal
        isOpen={isCreatorAccessOpen}
        onClose={() => setIsCreatorAccessOpen(false)}
        onAuthenticated={(creatorSession) => handleLogin(creatorSession)}
      />

      {/* Weekly & Water Reminders Modal (Student only) */}
      {!isProfessor && (
        <RemindersModal
          isOpen={isRemindersModalOpen}
          initialSettings={reminderSettings}
          workoutPlan={workoutPlan}
          onClose={() => setIsRemindersModalOpen(false)}
          onSave={(next) => setReminderSettings(next)}
          onTestReminder={() => {
            const todayId = getTodayDayId();
            const dayMeta = DAYS_META.find((d) => d.id === todayId);
            const dayPlan = workoutPlan.days[todayId];
            const title = `Lembrete FitTrack — ${dayMeta?.label ?? 'Hoje'}`;
            const body = `Foco: ${formatDayPlanSummary(dayPlan)} · Beba água e bom treino!`;
            setReminderBanner({ title, body, targetDay: todayId });
            void sendSystemNotification(title, body);
            setIsRemindersModalOpen(false);
          }}
        />
      )}

      {/* Exercise Details & Explanatory Video Modal */}
      <ExerciseDetailsModal
        exercise={detailsExercise}
        isProfessor={Boolean(isProfessor && !detailsFromGallery)}
        onClose={() => {
          setDetailsExercise(null);
          setDetailsFromGallery(false);
        }}
        onEditAsTeacher={(ex) => handleOpenEditModal(ex)}
      />

      {/* Student Link / Switch Academy Modal */}
      {!isProfessor && (
        <LinkAcademyModal
          isOpen={isLinkAcademyModalOpen}
          currentCode={session.academyCode ?? studentProfile?.academyCode}
          studentProfile={studentProfile}
          onClose={() => setIsLinkAcademyModalOpen(false)}
          onLinked={(academy: Academy, updatedProfile: StudentProfile | null) => {
            if (updatedProfile) setStudentProfile(updatedProfile);
            setSession((prev) =>
              prev
                ? {
                    ...prev,
                    academyCode: academy.code,
                    academyName: academy.name,
                    academyLogo: academy.logoUrl,
                  }
                : prev
            );
          }}
        />
      )}

      <OfflineIndicator />
    </div>

    {isProfessor && !isCreator && (
      <QrCodeModal
        isOpen={isQrModalOpen}
        academyCode={session.academyCode ?? session.identifier}
        academyName={session.academyName ?? session.name}
        academyLogo={session.academyLogo}
        onClose={() => setIsQrModalOpen(false)}
      />
    )}
    </>
  );
}
