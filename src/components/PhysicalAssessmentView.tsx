import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import {
  ActivityLevel,
  BiologicalSex,
  CompositionMethod,
  DAYS_META,
  DayOfWeek,
  Exercise,
  FILTER_OPTIONS,
  FilterOption,
  ParqChecklist,
  PhysicalAssessment,
  PostureDeviations,
  PosturePhotos,
  StudentGoal,
  StudentProfile,
  addDaysToDateKey,
  calculateBMI,
  calculatePollock3BodyFat,
  calculatePollock7BodyFat,
  calculateWHR,
  formatCpfMask,
  formatDateBr,
  getLocalDateKey,
  getReassessmentStatus,
  isTimeBasedExercise,
  normalizeCpf,
} from '../types/workout';
import { compressImageFile } from '../utils/imageCompression';
import {
  deleteAssessmentRecord,
  fetchAssessmentsByAcademy,
  fetchStudentProfileByCpf,
  fetchStudentWorkoutByCpf,
  fetchStudentsByAcademy,
  fetchWorkoutStatusMapForCpfs,
  listLocalStudentProfiles,
  loadLocalAssessments,
  saveAssessmentRecord,
  saveStudentWorkout,
} from '../utils/fittrackStore';
import { AssessmentEvolutionSection } from './AssessmentEvolutionSection';

interface PhysicalAssessmentViewProps {
  academyCode: string;
  academyName: string;
  libraryExercises: Exercise[];
  professorName: string;
}

interface SelectedWorkoutDraft {
  selected: boolean;
  setsReps: string;
  weight: number;
  durationSeconds: number;
  days: DayOfWeek[];
}

const CLINICAL_GOALS: StudentGoal[] = [
  'Hipertrofia',
  'Emagrecimento',
  'Condicionamento',
  'Reabilitação',
  'Qualidade de vida',
];

const ACTIVITY_LEVELS: ActivityLevel[] = [
  'Sedentário',
  'Iniciante',
  'Intermediário',
  'Avançado',
];

const WEEKLY_FREQUENCIES = [2, 3, 4, 5, 6, 7];

const DEFAULT_PARQ: ParqChecklist = {
  chestPain: false,
  dizziness: false,
  boneOrJointProblems: false,
  bloodPressureOrHeartMeds: false,
};

const PARQ_ITEMS: Array<{ key: keyof ParqChecklist; label: string }> = [
  { key: 'chestPain', label: 'Dores no peito ao fazer esforço físico' },
  { key: 'dizziness', label: 'Tonturas ou perda de equilíbrio/consciência' },
  {
    key: 'boneOrJointProblems',
    label: 'Problemas ósseos ou articulares agravados por exercício',
  },
  {
    key: 'bloodPressureOrHeartMeds',
    label: 'Uso de medicamento para pressão arterial ou coração',
  },
];

const DEVIATION_ITEMS: Array<{ key: keyof PostureDeviations; label: string }> = [
  { key: 'hyperlordosis', label: 'Hiperlordose' },
  { key: 'hyperkyphosis', label: 'Hipercifose' },
  { key: 'scoliosis', label: 'Escoliose' },
  { key: 'roundedShoulders', label: 'Ombros protusos' },
  { key: 'kneeValgusVarus', label: 'Joelhos valgos/varos' },
];

export function PhysicalAssessmentView({
  academyCode,
  academyName,
  libraryExercises,
  professorName,
}: PhysicalAssessmentViewProps) {
  const [assessments, setAssessments] = useState<PhysicalAssessment[]>(() =>
    loadLocalAssessments(academyCode)
  );
  const [registeredStudents, setRegisteredStudents] = useState<StudentProfile[]>(
    () => listLocalStudentProfiles(academyCode)
  );
  const [workoutStatusMap, setWorkoutStatusMap] = useState<
    Record<string, boolean>
  >({});
  const [crossAcademyWarning, setCrossAcademyWarning] = useState('');

  // Top CPF Lookup State
  const [cpfSearchInput, setCpfSearchInput] = useState('');
  const [foundStudent, setFoundStudent] = useState<StudentProfile | null>(null);
  const [cpfLookupStatus, setCpfLookupStatus] = useState<
    'idle' | 'searching' | 'found' | 'not_found'
  >('idle');

  // Identificação do aluno no formulário
  const [studentName, setStudentName] = useState('');
  const [studentAge, setStudentAge] = useState('');
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex>('Masculino');
  const [studentPhone, setStudentPhone] = useState('');

  // Bloco A — Anamnese e PAR-Q
  const [goal, setGoal] = useState<string>('Hipertrofia');
  const [activityLevel, setActivityLevel] =
    useState<ActivityLevel>('Iniciante');
  const [parq, setParq] = useState<ParqChecklist>(DEFAULT_PARQ);
  const [sleepHours, setSleepHours] = useState('');
  const [weeklyFrequency, setWeeklyFrequency] = useState<number>(3);
  const [clinicalHistory, setClinicalHistory] = useState('');

  // Bloco B — Dados Gerais & Sinais Vitais
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [systolicBp, setSystolicBp] = useState('');
  const [diastolicBp, setDiastolicBp] = useState('');
  const [restingHr, setRestingHr] = useState('');

  // Bloco C — Perimetria (cm) e Simetria D/E
  const [chestCm, setChestCm] = useState('');
  const [waistCm, setWaistCm] = useState('');
  const [abdomenCm, setAbdomenCm] = useState('');
  const [hipCm, setHipCm] = useState('');
  const [armRelaxedRightCm, setArmRelaxedRightCm] = useState('');
  const [armRelaxedLeftCm, setArmRelaxedLeftCm] = useState('');
  const [armContractedRightCm, setArmContractedRightCm] = useState('');
  const [armContractedLeftCm, setArmContractedLeftCm] = useState('');
  const [forearmRightCm, setForearmRightCm] = useState('');
  const [forearmLeftCm, setForearmLeftCm] = useState('');
  const [thighProxRightCm, setThighProxRightCm] = useState('');
  const [thighProxLeftCm, setThighProxLeftCm] = useState('');
  const [thighMedRightCm, setThighMedRightCm] = useState('');
  const [thighMedLeftCm, setThighMedLeftCm] = useState('');
  const [calfRightCm, setCalfRightCm] = useState('');
  const [calfLeftCm, setCalfLeftCm] = useState('');

  // Bloco D — Composição Corporal
  const [compositionMethod, setCompositionMethod] =
    useState<CompositionMethod>('pollock3');
  const [skinfoldPectoralMm, setSkinfoldPectoralMm] = useState('');
  const [skinfoldAbdominalMm, setSkinfoldAbdominalMm] = useState('');
  const [skinfoldThighMm, setSkinfoldThighMm] = useState('');
  const [skinfoldTricepsMm, setSkinfoldTricepsMm] = useState('');
  const [skinfoldSuprailiacMm, setSkinfoldSuprailiacMm] = useState('');
  const [skinfoldSubscapularMm, setSkinfoldSubscapularMm] = useState('');
  const [skinfoldMidaxillaryMm, setSkinfoldMidaxillaryMm] = useState('');
  // Bioimpedância
  const [bioBodyFatPercent, setBioBodyFatPercent] = useState('');
  const [skeletalMuscleMassKg, setSkeletalMuscleMassKg] = useState('');
  const [visceralFatLevel, setVisceralFatLevel] = useState('');
  const [bmrKcal, setBmrKcal] = useState('');
  const [bodyWaterPercent, setBodyWaterPercent] = useState('');

  // Bloco E — Postural, Fotos e Testes Físicos
  const [posturePhotos, setPosturePhotos] = useState<PosturePhotos>({});
  const [postureDeviations, setPostureDeviations] = useState<PostureDeviations>(
    {}
  );
  const [posturalNotes, setPosturalNotes] = useState('');
  const [wellsBenchCm, setWellsBenchCm] = useState('');
  const [pushups1Min, setPushups1Min] = useState('');
  const [situps1Min, setSitups1Min] = useState('');
  const [vo2Max, setVo2Max] = useState('');

  // Bloco F — Validade & Observações
  const todayKey = getLocalDateKey();
  const [date, setDate] = useState(todayKey);
  const [nextReassessmentDate, setNextReassessmentDate] = useState(() =>
    addDaysToDateKey(todayKey, 90)
  );
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [savedNotice, setSavedNotice] = useState('');

  // Montar Treino do Aluno State
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryMuscleFilter, setLibraryMuscleFilter] =
    useState<FilterOption>('Todos');
  const [draftByExerciseId, setDraftByExerciseId] = useState<
    Record<string, SelectedWorkoutDraft>
  >({});
  const [isReleasingWorkout, setIsReleasingWorkout] = useState(false);
  const [workoutReleasedMsg, setWorkoutReleasedMsg] = useState('');
  const [workoutErrorMsg, setWorkoutErrorMsg] = useState('');

  // History Search
  const [historySearch, setHistorySearch] = useState('');

  const loadAcademyRosterAndAssessments = async () => {
    const [students, history] = await Promise.all([
      fetchStudentsByAcademy(academyCode),
      fetchAssessmentsByAcademy(academyCode),
    ]);
    setRegisteredStudents(students);
    setAssessments(history);
    if (students.length > 0) {
      const status = await fetchWorkoutStatusMapForCpfs(
        students.map((s) => s.cpf)
      );
      setWorkoutStatusMap(status);
    } else {
      setWorkoutStatusMap({});
    }
  };

  useEffect(() => {
    void loadAcademyRosterAndAssessments();
  }, [academyCode]);

  const syncDraftsFromExistingWorkout = async (cpfDigits: string) => {
    const existing = await fetchStudentWorkoutByCpf(cpfDigits);
    const nextDrafts: Record<string, SelectedWorkoutDraft> = {};

    libraryExercises.forEach((libEx) => {
      const matched = existing?.exercises.find(
        (ex) =>
          ex.id === libEx.id ||
          ex.name.trim().toLowerCase() === libEx.name.trim().toLowerCase()
      );
      if (matched) {
        nextDrafts[libEx.id] = {
          selected: true,
          setsReps: matched.setsReps,
          weight: matched.weight,
          durationSeconds: matched.durationSeconds ?? 45,
          days: matched.days ?? [],
        };
      } else {
        nextDrafts[libEx.id] = {
          selected: false,
          setsReps: libEx.setsReps,
          weight: libEx.weight,
          durationSeconds: libEx.durationSeconds ?? 45,
          days: libEx.days ?? [],
        };
      }
    });

    setDraftByExerciseId(nextDrafts);
  };

  const applyStudentProfile = async (profile: StudentProfile) => {
    setCrossAcademyWarning('');
    setFoundStudent(profile);
    setCpfSearchInput(profile.formattedCpf);
    setCpfLookupStatus('found');
    setStudentName(profile.name);
    setStudentAge(String(profile.age));
    setBiologicalSex(profile.biologicalSex);
    setStudentPhone(profile.phone ?? '');
    if (profile.goal) setGoal(profile.goal);
    setWorkoutReleasedMsg('');
    setWorkoutErrorMsg('');
    await syncDraftsFromExistingWorkout(profile.cpf);
  };

  const handleSearchCpf = async (rawValue?: string) => {
    const targetRaw = rawValue ?? cpfSearchInput;
    const digits = normalizeCpf(targetRaw);
    setWorkoutReleasedMsg('');
    setWorkoutErrorMsg('');
    setCrossAcademyWarning('');

    if (digits.length !== 11) {
      setFoundStudent(null);
      setCpfLookupStatus('idle');
      return;
    }

    setCpfLookupStatus('searching');
    const profile = await fetchStudentProfileByCpf(digits);
    if (profile) {
      if (
        academyCode &&
        profile.academyCode &&
        profile.academyCode !== academyCode
      ) {
        setFoundStudent(null);
        setCpfLookupStatus('idle');
        setCrossAcademyWarning(
          `O CPF ${profile.formattedCpf} está vinculado a outra academia (${profile.academyName ?? profile.academyCode}).`
        );
        return;
      }
      await applyStudentProfile(profile);
    } else {
      setFoundStudent(null);
      setCpfLookupStatus('not_found');
      await syncDraftsFromExistingWorkout(digits);
    }
  };

  const parseOpt = (raw: string): number | undefined => {
    const num = parseFloat(raw);
    return Number.isNaN(num) || num <= 0 ? undefined : num;
  };

  const parseOptAllowZero = (raw: string): number | undefined => {
    if (raw.trim() === '') return undefined;
    const num = parseFloat(raw);
    return Number.isNaN(num) ? undefined : num;
  };

  const liveBmi = useMemo(
    () => calculateBMI(parseFloat(weightKg), parseFloat(heightCm)),
    [weightKg, heightCm]
  );

  const liveWhr = useMemo(
    () => calculateWHR(parseFloat(waistCm), parseFloat(hipCm), biologicalSex),
    [waistCm, hipCm, biologicalSex]
  );

  const liveComposition = useMemo(() => {
    const ageNum = parseInt(studentAge, 10) || 25;
    const weight = parseFloat(weightKg);
    let bf: number | null = null;

    if (compositionMethod === 'pollock3') {
      bf = calculatePollock3BodyFat(biologicalSex, ageNum, {
        pectoral: parseOpt(skinfoldPectoralMm),
        abdominal: parseOpt(skinfoldAbdominalMm),
        thigh: parseOpt(skinfoldThighMm),
        triceps: parseOpt(skinfoldTricepsMm),
        suprailiac: parseOpt(skinfoldSuprailiacMm),
      });
    } else if (compositionMethod === 'pollock7') {
      bf = calculatePollock7BodyFat(biologicalSex, ageNum, {
        triceps: parseOpt(skinfoldTricepsMm),
        subscapular: parseOpt(skinfoldSubscapularMm),
        pectoral: parseOpt(skinfoldPectoralMm),
        midaxillary: parseOpt(skinfoldMidaxillaryMm),
        suprailiac: parseOpt(skinfoldSuprailiacMm),
        abdominal: parseOpt(skinfoldAbdominalMm),
        thigh: parseOpt(skinfoldThighMm),
      });
    } else {
      const parsedBio = parseOpt(bioBodyFatPercent);
      bf = parsedBio ?? null;
    }

    if (bf === null) return null;
    const fatMassKg =
      !Number.isNaN(weight) && weight > 0
        ? Math.round(weight * (bf / 100) * 10) / 10
        : null;
    const leanMassKg =
      fatMassKg !== null ? Math.round((weight - fatMassKg) * 10) / 10 : null;

    return { bodyFatPercent: bf, fatMassKg, leanMassKg };
  }, [
    compositionMethod,
    biologicalSex,
    studentAge,
    weightKg,
    skinfoldPectoralMm,
    skinfoldAbdominalMm,
    skinfoldThighMm,
    skinfoldTricepsMm,
    skinfoldSuprailiacMm,
    skinfoldSubscapularMm,
    skinfoldMidaxillaryMm,
    bioBodyFatPercent,
  ]);

  const latestAssessmentByCpf = useMemo(() => {
    const map: Record<string, PhysicalAssessment> = {};
    assessments.forEach((a) => {
      const cpf = normalizeCpf(a.studentCpf ?? '');
      if (!cpf) return;
      if (!map[cpf] || a.date > map[cpf].date) {
        map[cpf] = a;
      }
    });
    return map;
  }, [assessments]);

  const selectedStudentAssessments = useMemo(() => {
    const targetCpf = foundStudent?.cpf ?? normalizeCpf(cpfSearchInput);
    if (targetCpf.length !== 11) return [];
    return assessments.filter(
      (a) => normalizeCpf(a.studentCpf ?? '') === targetCpf
    );
  }, [assessments, foundStudent, cpfSearchInput]);

  const filteredLibraryExercises = useMemo(() => {
    const q = librarySearch.trim().toLowerCase();
    return libraryExercises.filter((ex) => {
      const matchesFilter =
        libraryMuscleFilter === 'Todos' || ex.muscle === libraryMuscleFilter;
      const matchesSearch =
        !q ||
        ex.name.toLowerCase().includes(q) ||
        ex.muscle.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [libraryExercises, libraryMuscleFilter, librarySearch]);

  const selectedLibraryCount = useMemo(
    () =>
      libraryExercises.filter((ex) => draftByExerciseId[ex.id]?.selected).length,
    [libraryExercises, draftByExerciseId]
  );

  const filteredAssessments = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    const digits = normalizeCpf(historySearch);
    if (!q) return assessments;
    return assessments.filter(
      (a) =>
        a.studentName.toLowerCase().includes(q) ||
        (a.studentIdentifier?.toLowerCase().includes(q) ?? false) ||
        (digits.length >= 3 && (a.studentCpf?.includes(digits) ?? false))
    );
  }, [assessments, historySearch]);

  const handlePosturePhotoUpload = async (
    slot: keyof PosturePhotos,
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 420, 0.65);
      setPosturePhotos((prev) => ({ ...prev, [slot]: compressed }));
    } catch {
      // Fail gracefully without alert
    }
  };

  const resetClinicalMeasurementFields = () => {
    setWeightKg('');
    setHeightCm('');
    setSystolicBp('');
    setDiastolicBp('');
    setRestingHr('');
    setChestCm('');
    setWaistCm('');
    setAbdomenCm('');
    setHipCm('');
    setArmRelaxedRightCm('');
    setArmRelaxedLeftCm('');
    setArmContractedRightCm('');
    setArmContractedLeftCm('');
    setForearmRightCm('');
    setForearmLeftCm('');
    setThighProxRightCm('');
    setThighProxLeftCm('');
    setThighMedRightCm('');
    setThighMedLeftCm('');
    setCalfRightCm('');
    setCalfLeftCm('');
    setSkinfoldPectoralMm('');
    setSkinfoldAbdominalMm('');
    setSkinfoldThighMm('');
    setSkinfoldTricepsMm('');
    setSkinfoldSuprailiacMm('');
    setSkinfoldSubscapularMm('');
    setSkinfoldMidaxillaryMm('');
    setBioBodyFatPercent('');
    setSkeletalMuscleMassKg('');
    setVisceralFatLevel('');
    setBmrKcal('');
    setBodyWaterPercent('');
    setPosturePhotos({});
    setPostureDeviations({});
    setPosturalNotes('');
    setWellsBenchCm('');
    setPushups1Min('');
    setSitups1Min('');
    setVo2Max('');
    setNotes('');
  };

  const handleSubmitAssessment = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanName = studentName.trim();
    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm);
    const cpfDigits = foundStudent?.cpf ?? normalizeCpf(cpfSearchInput);

    if (!cleanName) {
      setErrorMsg('Busque um aluno pelo CPF ou informe o nome do aluno.');
      return;
    }
    if (Number.isNaN(w) || w <= 0 || Number.isNaN(h) || h <= 0) {
      setErrorMsg(
        'Preencha Peso (kg) e Altura (cm) válidos no Bloco B antes de salvar.'
      );
      return;
    }

    const parsedAge = parseInt(studentAge, 10);
    const evalDate = date || getLocalDateKey();
    const hasPosturePhotos = Boolean(
      posturePhotos.front || posturePhotos.back || posturePhotos.profile
    );

    const newItem: PhysicalAssessment = {
      id: `av-${Date.now()}`,
      academyCode,
      studentName: cleanName,
      studentIdentifier:
        cpfDigits.length === 11 ? formatCpfMask(cpfDigits) : undefined,
      studentCpf: cpfDigits.length === 11 ? cpfDigits : undefined,
      studentAge: Number.isNaN(parsedAge) ? undefined : parsedAge,
      studentPhone: studentPhone.trim() || undefined,
      biologicalSex,
      date: evalDate,
      nextReassessmentDate:
        nextReassessmentDate || addDaysToDateKey(evalDate, 90),

      // Bloco A
      goal: goal.trim() || undefined,
      activityLevel,
      parq,
      sleepHours: parseOpt(sleepHours),
      weeklyFrequency,
      clinicalHistory: clinicalHistory.trim() || undefined,

      // Bloco B
      weightKg: w,
      heightCm: h,
      bmi: liveBmi?.value,
      systolicBp: parseOpt(systolicBp),
      diastolicBp: parseOpt(diastolicBp),
      restingHr: parseOpt(restingHr),

      // Bloco C
      chestCm: parseOpt(chestCm),
      waistCm: parseOpt(waistCm),
      abdomenCm: parseOpt(abdomenCm),
      hipCm: parseOpt(hipCm),
      whr: liveWhr?.value,
      armRelaxedRightCm: parseOpt(armRelaxedRightCm),
      armRelaxedLeftCm: parseOpt(armRelaxedLeftCm),
      armContractedRightCm: parseOpt(armContractedRightCm),
      armContractedLeftCm: parseOpt(armContractedLeftCm),
      forearmRightCm: parseOpt(forearmRightCm),
      forearmLeftCm: parseOpt(forearmLeftCm),
      thighProxRightCm: parseOpt(thighProxRightCm),
      thighProxLeftCm: parseOpt(thighProxLeftCm),
      thighMedRightCm: parseOpt(thighMedRightCm),
      thighMedLeftCm: parseOpt(thighMedLeftCm),
      calfRightCm: parseOpt(calfRightCm),
      calfLeftCm: parseOpt(calfLeftCm),

      // Bloco D
      compositionMethod,
      bodyFatPercent: liveComposition?.bodyFatPercent,
      fatMassKg: liveComposition?.fatMassKg ?? undefined,
      leanMassKg: liveComposition?.leanMassKg ?? undefined,
      skinfoldPectoralMm: parseOpt(skinfoldPectoralMm),
      skinfoldAbdominalMm: parseOpt(skinfoldAbdominalMm),
      skinfoldThighMm: parseOpt(skinfoldThighMm),
      skinfoldTricepsMm: parseOpt(skinfoldTricepsMm),
      skinfoldSuprailiacMm: parseOpt(skinfoldSuprailiacMm),
      skinfoldSubscapularMm: parseOpt(skinfoldSubscapularMm),
      skinfoldMidaxillaryMm: parseOpt(skinfoldMidaxillaryMm),
      skeletalMuscleMassKg: parseOpt(skeletalMuscleMassKg),
      visceralFatLevel: parseOpt(visceralFatLevel),
      bmrKcal: parseOpt(bmrKcal),
      bodyWaterPercent: parseOpt(bodyWaterPercent),

      // Bloco E
      posturePhotos: hasPosturePhotos ? posturePhotos : undefined,
      postureDeviations,
      posturalNotes: posturalNotes.trim() || undefined,
      wellsBenchCm: parseOptAllowZero(wellsBenchCm),
      pushups1Min: parseOptAllowZero(pushups1Min),
      situps1Min: parseOptAllowZero(situps1Min),
      vo2Max: parseOpt(vo2Max),

      notes: notes.trim() || undefined,
    };

    const res = await saveAssessmentRecord(newItem);
    setAssessments((prev) => [newItem, ...prev]);
    resetClinicalMeasurementFields();
    setSavedNotice(
      res.syncedToCloud
        ? 'Avaliação salva no Firebase'
        : 'Avaliação salva localmente'
    );
    window.setTimeout(() => setSavedNotice(''), 3500);
  };

  const handleDeleteAssessment = async (id: string) => {
    setAssessments((prev) => prev.filter((item) => item.id !== id));
    await deleteAssessmentRecord(id);
  };

  const getDraft = (ex: Exercise): SelectedWorkoutDraft => {
    return (
      draftByExerciseId[ex.id] ?? {
        selected: false,
        setsReps: ex.setsReps,
        weight: ex.weight,
        durationSeconds: ex.durationSeconds ?? 45,
        days: ex.days ?? [],
      }
    );
  };

  const toggleExerciseSelection = (ex: Exercise) => {
    const current = getDraft(ex);
    setDraftByExerciseId((prev) => ({
      ...prev,
      [ex.id]: { ...current, selected: !current.selected },
    }));
    setWorkoutReleasedMsg('');
    setWorkoutErrorMsg('');
  };

  const updateDraftField = (
    ex: Exercise,
    patch: Partial<SelectedWorkoutDraft>
  ) => {
    const current = getDraft(ex);
    setDraftByExerciseId((prev) => ({
      ...prev,
      [ex.id]: { ...current, ...patch },
    }));
  };

  const toggleDraftDay = (ex: Exercise, dayId: DayOfWeek) => {
    const current = getDraft(ex);
    const nextDays = current.days.includes(dayId)
      ? current.days.filter((d) => d !== dayId)
      : [...current.days, dayId];
    updateDraftField(ex, { days: nextDays });
  };

  const handleReleaseWorkout = async () => {
    setWorkoutErrorMsg('');
    setWorkoutReleasedMsg('');

    const cpfDigits = foundStudent?.cpf ?? normalizeCpf(cpfSearchInput);
    const targetName = (foundStudent?.name ?? studentName).trim();

    if (cpfDigits.length !== 11) {
      setWorkoutErrorMsg(
        'Busque ou informe um CPF válido (11 dígitos) antes de liberar o treino.'
      );
      return;
    }

    const chosenExercises: Exercise[] = libraryExercises
      .filter((ex) => draftByExerciseId[ex.id]?.selected)
      .map((libEx) => {
        const draft = getDraft(libEx);
        const useTime = isTimeBasedExercise(libEx.muscle, libEx.name);
        return {
          ...libEx,
          completed: false,
          setsReps: draft.setsReps.trim() || libEx.setsReps,
          weight: useTime ? 0 : Math.max(0, draft.weight),
          durationSeconds: useTime ? Math.max(0, draft.durationSeconds) : undefined,
          days: draft.days.length > 0 ? draft.days : undefined,
        };
      });

    if (chosenExercises.length === 0) {
      setWorkoutErrorMsg(
        'Marque pelo menos 1 exercício da biblioteca para liberar ao aluno.'
      );
      return;
    }

    setIsReleasingWorkout(true);
    try {
      const nowIso = new Date().toISOString();
      const res = await saveStudentWorkout({
        cpf: cpfDigits,
        academyCode,
        academyName,
        studentName: targetName || formatCpfMask(cpfDigits),
        exercises: chosenExercises,
        releasedAt: nowIso,
        updatedAt: nowIso,
        professorName,
      });

      setWorkoutStatusMap((prev) => ({ ...prev, [cpfDigits]: true }));
      setWorkoutReleasedMsg(
        `Treino com ${chosenExercises.length} exercício${
          chosenExercises.length > 1 ? 's' : ''
        } liberado para ${targetName || formatCpfMask(cpfDigits)}${
          res.syncedToCloud
            ? ' (sincronizado com Firebase).'
            : ' (salvo localmente).'
        }`
      );
    } finally {
      setIsReleasingWorkout(false);
    }
  };

  const inputCls =
    'w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-xs sm:text-sm font-mono tabular-nums text-zinc-100 placeholder:text-zinc-500 placeholder:font-sans focus:outline-none focus:border-purple-500';
  const selectCls =
    'w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-xs sm:text-sm text-zinc-100 focus:outline-none focus:border-purple-500';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-6">
      {/* 1. Top CPF Search Card & Academy Roster */}
      <section
        aria-label="Buscar aluno por CPF"
        className="bg-[#14161a] border border-zinc-800 rounded-2xl p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-zinc-50">
              Buscar Aluno por CPF
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Carregue automaticamente os dados cadastrais para realizar a avaliação clínica completa e prescrever o treino
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadAcademyRosterAndAssessments()}
            className="min-h-[40px] px-3 py-1.5 rounded-xl border border-zinc-700 hover:border-purple-500/50 text-xs font-medium text-zinc-300 hover:text-zinc-100 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Atualizar alunos ({registeredStudents.length})</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              inputMode="numeric"
              aria-label="Buscar Aluno por CPF"
              placeholder="000.000.000-00"
              value={cpfSearchInput}
              onChange={(e) => {
                const masked = formatCpfMask(e.target.value);
                setCpfSearchInput(masked);
                if (normalizeCpf(masked).length === 11) {
                  void handleSearchCpf(masked);
                } else {
                  setCpfLookupStatus('idle');
                }
              }}
              className="w-full min-h-[44px] pl-10 pr-10 py-2.5 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm font-mono tabular-nums text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
            />
            {cpfSearchInput && (
              <button
                type="button"
                onClick={() => {
                  setCpfSearchInput('');
                  setFoundStudent(null);
                  setCpfLookupStatus('idle');
                  setStudentName('');
                  setStudentAge('');
                  setStudentPhone('');
                }}
                aria-label="Limpar CPF"
                className="min-w-[44px] min-h-[44px] absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center text-zinc-400 hover:text-zinc-100 cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleSearchCpf()}
            disabled={normalizeCpf(cpfSearchInput).length !== 11}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-45 text-white text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            {cpfLookupStatus === 'searching' ? 'Buscando...' : 'Buscar CPF'}
          </button>
        </div>

        {/* Registered Students Roster scoped to this Academy/Personal */}
        <div className="space-y-2 pt-2 border-t border-zinc-800/80">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>
              Alunos vinculados a <strong className="text-zinc-200">{academyName}</strong> ({academyCode})
            </span>
            <span className="font-mono tabular-nums">{registeredStudents.length}</span>
          </div>

          {registeredStudents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[240px] overflow-y-auto pr-1">
              {registeredStudents.map((st) => {
                const isSelected = foundStudent?.cpf === st.cpf;
                const hasActiveWorkout = Boolean(workoutStatusMap[st.cpf]);
                const latestAv = latestAssessmentByCpf[st.cpf];
                const reeval = getReassessmentStatus(latestAv?.nextReassessmentDate);

                return (
                  <button
                    key={st.cpf}
                    type="button"
                    onClick={() => void applyStudentProfile(st)}
                    className={`min-h-[56px] px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600/20 border-purple-500 text-zinc-100'
                        : 'bg-[#0b0c0e] border-zinc-800 hover:border-purple-500/50 text-zinc-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{st.name}</p>
                      <p className="text-xs font-mono tabular-nums text-zinc-400 truncate">
                        {st.formattedCpf} · {st.age} anos · {st.phone}
                      </p>
                      {latestAv?.nextReassessmentDate && (
                        <p
                          className={`text-[11px] font-medium mt-0.5 flex items-center gap-1 ${
                            reeval.status === 'overdue'
                              ? 'text-rose-400'
                              : reeval.status === 'soon'
                                ? 'text-amber-400'
                                : 'text-zinc-400'
                          }`}
                        >
                          {(reeval.status === 'overdue' || reeval.status === 'soon') && (
                            <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
                          )}
                          <span>{reeval.label}</span>
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                        hasActiveWorkout ? 'text-orange-400' : 'text-amber-400'
                      }`}
                    >
                      {hasActiveWorkout ? 'Treino ativo' : 'Aguardando treino'}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-400 bg-[#0b0c0e] border border-zinc-800/80 rounded-xl px-3.5 py-3">
              Nenhum aluno vinculado ao código <span className="font-mono text-purple-300">{academyCode}</span> ainda. Compartilhe este código para que seus alunos criem suas contas.
            </p>
          )}
        </div>

        {crossAcademyWarning && (
          <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3.5 py-2.5">
            {crossAcademyWarning}
          </p>
        )}

        {cpfLookupStatus === 'not_found' && (
          <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3.5 py-2.5">
            Nenhum cadastro encontrado para este CPF em <span className="font-mono">fittrack_users</span>. Você ainda pode preencher os dados manualmente para avaliar e liberar o treino.
          </p>
        )}

        {foundStudent && (
          <div className="bg-[#0b0c0e] border border-purple-500/40 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
                <UserCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Aluno Selecionado · Dados Pessoais Carregados</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm font-semibold text-zinc-100">
                <span>{foundStudent.name}</span>
                <span className="text-zinc-600" aria-hidden="true">·</span>
                <span className="font-mono text-xs text-zinc-300">
                  {foundStudent.age} anos
                </span>
                <span className="text-zinc-600" aria-hidden="true">·</span>
                <span className="text-xs text-zinc-300">{foundStudent.biologicalSex}</span>
                <span className="text-zinc-600" aria-hidden="true">·</span>
                <span className="font-mono text-xs text-zinc-300">{foundStudent.phone}</span>
              </div>
            </div>
            {foundStudent.email && (
              <span className="text-xs text-zinc-400 font-mono">
                {foundStudent.email}
              </span>
            )}
          </div>
        )}
      </section>

      {/* Main 2-Column Workspace: 6-Block Clinical Assessment + Montar Treino */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Complete 6-Block Clinical Physical Assessment */}
        <section
          aria-label="Avaliação Física Clínica"
          className="lg:col-span-6 bg-[#14161a] border border-zinc-800 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <ClipboardList className="w-5 h-5 text-purple-400 shrink-0" aria-hidden="true" />
              <h3 className="font-display text-2xl font-bold text-zinc-50">
                Avaliação Física
              </h3>
            </div>
            {savedNotice && (
              <span className="text-xs font-semibold text-orange-400">
                {savedNotice}
              </span>
            )}
          </div>

          <form onSubmit={handleSubmitAssessment} className="space-y-3.5">
            {errorMsg && (
              <p className="text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            )}

            {/* Identificação básica (Auto-preenchida ao buscar CPF) */}
            <div className="bg-[#0b0c0e] border border-zinc-800 rounded-xl p-3.5 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="av-student" className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Nome do aluno
                  </label>
                  <input
                    id="av-student"
                    type="text"
                    placeholder="Preenchido ao buscar CPF"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#14161a] border border-zinc-700 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label htmlFor="av-phone" className="block text-[11px] font-medium text-zinc-400 mb-1">
                    WhatsApp
                  </label>
                  <input
                    id="av-phone"
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#14161a] border border-zinc-700 text-xs sm:text-sm font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="av-age" className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Idade
                  </label>
                  <input
                    id="av-age"
                    type="number"
                    min={0}
                    placeholder="25"
                    value={studentAge}
                    onChange={(e) => setStudentAge(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#14161a] border border-zinc-700 text-xs sm:text-sm font-mono tabular-nums text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label htmlFor="av-sex" className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Sexo Biológico
                  </label>
                  <select
                    id="av-sex"
                    value={biologicalSex}
                    onChange={(e) => setBiologicalSex(e.target.value as BiologicalSex)}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#14161a] border border-zinc-700 text-xs sm:text-sm text-zinc-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                </div>
              </div>
            </div>

            {/* BLOCO A — Anamnese e PAR-Q */}
            <details open className="bg-[#0b0c0e] border border-zinc-800 rounded-xl overflow-hidden group">
              <summary className="min-h-[46px] px-4 py-3 flex items-center justify-between cursor-pointer select-none text-xs font-bold text-purple-300 hover:bg-zinc-900/50">
                <span>Bloco A · Anamnese e PAR-Q</span>
                <span className="text-[11px] font-normal text-zinc-400">
                  {goal} · {activityLevel}
                </span>
              </summary>
              <div className="px-4 pb-4 pt-2 border-t border-zinc-800/80 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="av-goal" className="block text-[11px] text-zinc-400 mb-1">
                      Objetivo principal
                    </label>
                    <select
                      id="av-goal"
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      className={selectCls}
                    >
                      {CLINICAL_GOALS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="av-level" className="block text-[11px] text-zinc-400 mb-1">
                      Nível atual
                    </label>
                    <select
                      id="av-level"
                      value={activityLevel}
                      onChange={(e) =>
                        setActivityLevel(e.target.value as ActivityLevel)
                      }
                      className={selectCls}
                    >
                      {ACTIVITY_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="av-sleep" className="block text-[11px] text-zinc-400 mb-1">
                      Horas de sono / noite
                    </label>
                    <input
                      id="av-sleep"
                      type="number"
                      step={0.5}
                      min={0}
                      max={24}
                      placeholder="Ex: 7.5"
                      value={sleepHours}
                      onChange={(e) => setSleepHours(e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label htmlFor="av-freq" className="block text-[11px] text-zinc-400 mb-1">
                      Frequência semanal disponível
                    </label>
                    <select
                      id="av-freq"
                      value={weeklyFrequency}
                      onChange={(e) =>
                        setWeeklyFrequency(parseInt(e.target.value, 10))
                      }
                      className={selectCls}
                    >
                      {WEEKLY_FREQUENCIES.map((f) => (
                        <option key={f} value={f}>
                          {f}x por semana
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-zinc-300">
                    Triagem PAR-Q (marque se positivo):
                  </p>
                  <div className="space-y-1.5">
                    {PARQ_ITEMS.map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center gap-2.5 min-h-[36px] px-2.5 py-1.5 rounded-lg bg-[#14161a] border border-zinc-800 text-xs text-zinc-200 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={parq[item.key]}
                          onChange={(e) =>
                            setParq((prev) => ({
                              ...prev,
                              [item.key]: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="av-history" className="block text-[11px] text-zinc-400 mb-1">
                    Histórico clínico / cirurgias / restrições
                  </label>
                  <textarea
                    id="av-history"
                    rows={2}
                    placeholder="Lesões prévias, medicamentos contínuos, liberação médica..."
                    value={clinicalHistory}
                    onChange={(e) => setClinicalHistory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#14161a] border border-zinc-700 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 resize-y"
                  />
                </div>
              </div>
            </details>

            {/* BLOCO B — Dados Gerais & Sinais Vitais */}
            <details open className="bg-[#0b0c0e] border border-zinc-800 rounded-xl overflow-hidden">
              <summary className="min-h-[46px] px-4 py-3 flex items-center justify-between cursor-pointer select-none text-xs font-bold text-purple-300 hover:bg-zinc-900/50">
                <span>Bloco B · Dados Gerais & Sinais Vitais</span>
                {liveBmi && (
                  <span className="font-mono text-[11px] text-orange-400">
                    IMC {liveBmi.value}
                  </span>
                )}
              </summary>
              <div className="px-4 pb-4 pt-2 border-t border-zinc-800/80 space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="av-weight" className="block text-[11px] text-zinc-400 mb-1">
                      Peso (kg) *
                    </label>
                    <input
                      id="av-weight"
                      type="number"
                      step={0.1}
                      min={0}
                      placeholder="74.5"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="av-height" className="block text-[11px] text-zinc-400 mb-1">
                      Altura (cm) *
                    </label>
                    <input
                      id="av-height"
                      type="number"
                      step={1}
                      min={0}
                      placeholder="175"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                {liveBmi && (
                  <div className="bg-[#14161a] border border-zinc-800 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">IMC Automático</span>
                    <span className="font-mono tabular-nums font-semibold text-purple-300">
                      {liveBmi.value} · {liveBmi.label}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label htmlFor="av-pas" className="block text-[11px] text-zinc-400 mb-1">
                      PA Sist. (mmHg)
                    </label>
                    <input
                      id="av-pas"
                      type="number"
                      min={0}
                      placeholder="120"
                      value={systolicBp}
                      onChange={(e) => setSystolicBp(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="av-pad" className="block text-[11px] text-zinc-400 mb-1">
                      PA Diast. (mmHg)
                    </label>
                    <input
                      id="av-pad"
                      type="number"
                      min={0}
                      placeholder="80"
                      value={diastolicBp}
                      onChange={(e) => setDiastolicBp(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="av-fc" className="block text-[11px] text-zinc-400 mb-1">
                      FC Repouso (bpm)
                    </label>
                    <input
                      id="av-fc"
                      type="number"
                      min={0}
                      placeholder="68"
                      value={restingHr}
                      onChange={(e) => setRestingHr(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            </details>

            {/* BLOCO C — Perimetria (cm) e Simetria D/E */}
            <details className="bg-[#0b0c0e] border border-zinc-800 rounded-xl overflow-hidden">
              <summary className="min-h-[46px] px-4 py-3 flex items-center justify-between cursor-pointer select-none text-xs font-bold text-purple-300 hover:bg-zinc-900/50">
                <span>Bloco C · Perimetria (cm) e Simetria D/E</span>
                {liveWhr && (
                  <span className="font-mono text-[11px] text-orange-400">
                    RCQ {liveWhr.value}
                  </span>
                )}
              </summary>
              <div className="px-4 pb-4 pt-2 border-t border-zinc-800/80 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold text-zinc-300 mb-1.5">
                    Tronco (cm)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      placeholder="Tórax"
                      aria-label="Tórax em cm"
                      value={chestCm}
                      onChange={(e) => setChestCm(e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      placeholder="Cintura"
                      aria-label="Cintura em cm"
                      value={waistCm}
                      onChange={(e) => setWaistCm(e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      placeholder="Abdômen"
                      aria-label="Abdômen em cm"
                      value={abdomenCm}
                      onChange={(e) => setAbdomenCm(e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      placeholder="Quadril"
                      aria-label="Quadril em cm"
                      value={hipCm}
                      onChange={(e) => setHipCm(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                {liveWhr && (
                  <div className="bg-[#14161a] border border-zinc-800 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Relação Cintura/Quadril (RCQ)</span>
                    <span className="font-mono tabular-nums font-semibold text-purple-300">
                      {liveWhr.value} · {liveWhr.riskLabel}
                    </span>
                  </div>
                )}

                <div>
                  <p className="text-[11px] font-semibold text-zinc-300 mb-1.5">
                    Membros Superiores D / E (cm)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      placeholder="Braço relaxado D"
                      value={armRelaxedRightCm}
                      onChange={(e) => setArmRelaxedRightCm(e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      placeholder="Braço relaxado E"
                      value={armRelaxedLeftCm}
                      onChange={(e) => setArmRelaxedLeftCm(e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      placeholder="Braço contraído D"
                      value={armContractedRightCm}
                      onChange={(e) => setArmContractedRightCm(e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      placeholder="Braço contraído E"
                      value={armContractedLeftCm}
                      onChange={(e) => setArmContractedLeftCm(e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      placeholder="Antebraço D"
                      value={forearmRightCm}
                      onChange={(e) => setForearmRightCm(e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      placeholder="Antebraço E"
                      value={forearmLeftCm}
                      onChange={(e) => setForearmLeftCm(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-zinc-300 mb-1.5">
                    Membros Inferiores D / E (cm)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      placeholder="Coxa proximal D"
                      value={thighProxRightCm}
                      onChange={(e) => setThighProxRightCm(e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      placeholder="Coxa proximal E"
                      value={thighProxLeftCm}
                      onChange={(e) => setThighProxLeftCm(e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      placeholder="Coxa medial D"
                      value={thighMedRightCm}
                      onChange={(e) => setThighMedRightCm(e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      placeholder="Coxa medial E"
                      value={thighMedLeftCm}
                      onChange={(e) => setThighMedLeftCm(e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      placeholder="Panturrilha D"
                      value={calfRightCm}
                      onChange={(e) => setCalfRightCm(e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      placeholder="Panturrilha E"
                      value={calfLeftCm}
                      onChange={(e) => setCalfLeftCm(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            </details>

            {/* BLOCO D — Composição Corporal */}
            <details className="bg-[#0b0c0e] border border-zinc-800 rounded-xl overflow-hidden">
              <summary className="min-h-[46px] px-4 py-3 flex items-center justify-between cursor-pointer select-none text-xs font-bold text-purple-300 hover:bg-zinc-900/50">
                <span>Bloco D · Composição Corporal</span>
                {liveComposition && (
                  <span className="font-mono text-[11px] text-orange-400">
                    {liveComposition.bodyFatPercent}% GC
                  </span>
                )}
              </summary>
              <div className="px-4 pb-4 pt-2 border-t border-zinc-800/80 space-y-3">
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#14161a] border border-zinc-800">
                  {[
                    { id: 'pollock3' as CompositionMethod, label: 'Pollock 3' },
                    { id: 'pollock7' as CompositionMethod, label: 'Pollock 7' },
                    { id: 'bioimpedancia' as CompositionMethod, label: 'Bioimpedância' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setCompositionMethod(m.id)}
                      className={`min-h-[38px] px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                        compositionMethod === m.id
                          ? 'bg-purple-600 text-white font-bold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {compositionMethod === 'pollock3' && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-zinc-400">
                      Pollock 3 Dobras ({biologicalSex}): informe em mm
                    </p>
                    {biologicalSex === 'Masculino' ? (
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          step={0.5}
                          min={0}
                          placeholder="Peitoral (mm)"
                          value={skinfoldPectoralMm}
                          onChange={(e) => setSkinfoldPectoralMm(e.target.value)}
                          className={inputCls}
                        />
                        <input
                          type="number"
                          step={0.5}
                          min={0}
                          placeholder="Abdominal (mm)"
                          value={skinfoldAbdominalMm}
                          onChange={(e) => setSkinfoldAbdominalMm(e.target.value)}
                          className={inputCls}
                        />
                        <input
                          type="number"
                          step={0.5}
                          min={0}
                          placeholder="Coxa (mm)"
                          value={skinfoldThighMm}
                          onChange={(e) => setSkinfoldThighMm(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          step={0.5}
                          min={0}
                          placeholder="Tríceps (mm)"
                          value={skinfoldTricepsMm}
                          onChange={(e) => setSkinfoldTricepsMm(e.target.value)}
                          className={inputCls}
                        />
                        <input
                          type="number"
                          step={0.5}
                          min={0}
                          placeholder="Supra-ilíaca (mm)"
                          value={skinfoldSuprailiacMm}
                          onChange={(e) => setSkinfoldSuprailiacMm(e.target.value)}
                          className={inputCls}
                        />
                        <input
                          type="number"
                          step={0.5}
                          min={0}
                          placeholder="Coxa (mm)"
                          value={skinfoldThighMm}
                          onChange={(e) => setSkinfoldThighMm(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                    )}
                  </div>
                )}

                {compositionMethod === 'pollock7' && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-zinc-400">
                      Pollock 7 Dobras ({biologicalSex}): informe em mm
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <input
                        type="number"
                        step={0.5}
                        min={0}
                        placeholder="Tríceps"
                        value={skinfoldTricepsMm}
                        onChange={(e) => setSkinfoldTricepsMm(e.target.value)}
                        className={inputCls}
                      />
                      <input
                        type="number"
                        step={0.5}
                        min={0}
                        placeholder="Subescapular"
                        value={skinfoldSubscapularMm}
                        onChange={(e) => setSkinfoldSubscapularMm(e.target.value)}
                        className={inputCls}
                      />
                      <input
                        type="number"
                        step={0.5}
                        min={0}
                        placeholder="Peitoral"
                        value={skinfoldPectoralMm}
                        onChange={(e) => setSkinfoldPectoralMm(e.target.value)}
                        className={inputCls}
                      />
                      <input
                        type="number"
                        step={0.5}
                        min={0}
                        placeholder="Axilar média"
                        value={skinfoldMidaxillaryMm}
                        onChange={(e) => setSkinfoldMidaxillaryMm(e.target.value)}
                        className={inputCls}
                      />
                      <input
                        type="number"
                        step={0.5}
                        min={0}
                        placeholder="Supra-ilíaca"
                        value={skinfoldSuprailiacMm}
                        onChange={(e) => setSkinfoldSuprailiacMm(e.target.value)}
                        className={inputCls}
                      />
                      <input
                        type="number"
                        step={0.5}
                        min={0}
                        placeholder="Abdominal"
                        value={skinfoldAbdominalMm}
                        onChange={(e) => setSkinfoldAbdominalMm(e.target.value)}
                        className={inputCls}
                      />
                      <input
                        type="number"
                        step={0.5}
                        min={0}
                        placeholder="Coxa"
                        value={skinfoldThighMm}
                        onChange={(e) => setSkinfoldThighMm(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                )}

                {compositionMethod === 'bioimpedancia' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      placeholder="% Gordura"
                      value={bioBodyFatPercent}
                      onChange={(e) => setBioBodyFatPercent(e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      placeholder="Massa Musc. (kg)"
                      value={skeletalMuscleMassKg}
                      onChange={(e) => setSkeletalMuscleMassKg(e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      step={1}
                      min={0}
                      placeholder="Gordura Visceral"
                      value={visceralFatLevel}
                      onChange={(e) => setVisceralFatLevel(e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      step={1}
                      min={0}
                      placeholder="TMB (kcal)"
                      value={bmrKcal}
                      onChange={(e) => setBmrKcal(e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      placeholder="Água Corp. (%)"
                      value={bodyWaterPercent}
                      onChange={(e) => setBodyWaterPercent(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                )}

                {liveComposition && (
                  <div className="bg-[#14161a] border border-purple-500/35 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums">
                    <span className="text-orange-400 font-bold">
                      {liveComposition.bodyFatPercent}% Gordura
                    </span>
                    {liveComposition.fatMassKg !== null && (
                      <span className="text-zinc-300">
                        Massa Gorda {liveComposition.fatMassKg} kg
                      </span>
                    )}
                    {liveComposition.leanMassKg !== null && (
                      <span className="text-emerald-400 font-semibold">
                        Massa Magra {liveComposition.leanMassKg} kg
                      </span>
                    )}
                  </div>
                )}
              </div>
            </details>

            {/* BLOCO E — Postural, Fotos e Testes Físicos */}
            <details className="bg-[#0b0c0e] border border-zinc-800 rounded-xl overflow-hidden">
              <summary className="min-h-[46px] px-4 py-3 flex items-center justify-between cursor-pointer select-none text-xs font-bold text-purple-300 hover:bg-zinc-900/50">
                <span>Bloco E · Postural, Fotos & Testes Físicos</span>
              </summary>
              <div className="px-4 pb-4 pt-2 border-t border-zinc-800/80 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold text-zinc-300 mb-1.5">
                    Fotos Posturais (Frente / Costas / Perfil)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { slot: 'front', label: 'Frente' },
                        { slot: 'back', label: 'Costas' },
                        { slot: 'profile', label: 'Perfil' },
                      ] as Array<{ slot: keyof PosturePhotos; label: string }>
                    ).map(({ slot, label }) => {
                      const src = posturePhotos[slot];
                      return (
                        <div
                          key={slot}
                          className="bg-[#14161a] border border-zinc-800 rounded-xl p-2 flex flex-col items-center gap-1.5"
                        >
                          {src ? (
                            <>
                              <img
                                src={src}
                                alt={`Foto postural ${label}`}
                                className="w-full h-24 object-cover rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setPosturePhotos((prev) => ({
                                    ...prev,
                                    [slot]: undefined,
                                  }))
                                }
                                className="text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
                              >
                                Remover {label}
                              </button>
                            </>
                          ) : (
                            <label className="w-full h-24 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-purple-300 cursor-pointer">
                              <Camera className="w-5 h-5" aria-hidden="true" />
                              <span className="text-[11px] font-medium">
                                {label}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) =>
                                  void handlePosturePhotoUpload(slot, e)
                                }
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-zinc-300 mb-1.5">
                    Checklist de desvios posturais
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {DEVIATION_ITEMS.map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center gap-2 min-h-[36px] px-2.5 py-1.5 rounded-lg bg-[#14161a] border border-zinc-800 text-xs text-zinc-200 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(postureDeviations[item.key])}
                          onChange={(e) =>
                            setPostureDeviations((prev) => ({
                              ...prev,
                              [item.key]: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="av-posture-notes" className="block text-[11px] text-zinc-400 mb-1">
                    Observações posturais
                  </label>
                  <input
                    id="av-posture-notes"
                    type="text"
                    placeholder="Assimetria de ombros, encurtamento posterior..."
                    value={posturalNotes}
                    onChange={(e) => setPosturalNotes(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#14161a] border border-zinc-700 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-zinc-300 mb-1.5">
                    Testes Físicos
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <input
                      type="number"
                      step={0.5}
                      placeholder="Wells (cm)"
                      value={wellsBenchCm}
                      onChange={(e) => setWellsBenchCm(e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Flexões 1m"
                      value={pushups1Min}
                      onChange={(e) => setPushups1Min(e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Abdom. 1m"
                      value={situps1Min}
                      onChange={(e) => setSitups1Min(e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      placeholder="VO2 máx"
                      value={vo2Max}
                      onChange={(e) => setVo2Max(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            </details>

            {/* BLOCO F — Validade & Notas Finais */}
            <details open className="bg-[#0b0c0e] border border-zinc-800 rounded-xl overflow-hidden">
              <summary className="min-h-[46px] px-4 py-3 flex items-center justify-between cursor-pointer select-none text-xs font-bold text-purple-300 hover:bg-zinc-900/50">
                <span>Bloco F · Validade & Observações</span>
                {nextReassessmentDate && (
                  <span className="font-mono text-[11px] text-zinc-400">
                    Reavaliação {formatDateBr(nextReassessmentDate)}
                  </span>
                )}
              </summary>
              <div className="px-4 pb-4 pt-2 border-t border-zinc-800/80 space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="av-date" className="block text-[11px] text-zinc-400 mb-1">
                      Data da avaliação
                    </label>
                    <input
                      id="av-date"
                      type="date"
                      value={date}
                      onChange={(e) => {
                        const nextDate = e.target.value;
                        setDate(nextDate);
                        if (nextDate) {
                          setNextReassessmentDate(addDaysToDateKey(nextDate, 90));
                        }
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="av-next-date" className="block text-[11px] text-zinc-400 mb-1">
                      Próxima reavaliação (+90d)
                    </label>
                    <input
                      id="av-next-date"
                      type="date"
                      value={nextReassessmentDate}
                      onChange={(e) => setNextReassessmentDate(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="av-notes" className="block text-[11px] text-zinc-400 mb-1">
                    Conduta e recomendações gerais
                  </label>
                  <textarea
                    id="av-notes"
                    rows={2}
                    placeholder="Recomendações de carga, prioridades musculares..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#14161a] border border-zinc-700 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 resize-y"
                  />
                </div>
              </div>
            </details>

            <button
              type="submit"
              className="w-full min-h-[48px] rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Salvar Avaliação Clínica</span>
            </button>
          </form>
        </section>

        {/* Right Column: Montar Treino do Aluno */}
        <section
          aria-label="Montar Treino do Aluno"
          className="lg:col-span-6 bg-[#14161a] border border-zinc-800 rounded-2xl p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-orange-400 shrink-0" aria-hidden="true" />
                <h3 className="font-display text-2xl font-bold text-zinc-50">
                  Montar Treino do Aluno
                </h3>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {foundStudent
                  ? `Prescrevendo para ${foundStudent.name} (${foundStudent.formattedCpf})`
                  : normalizeCpf(cpfSearchInput).length === 11
                    ? `Prescrevendo para CPF ${formatCpfMask(cpfSearchInput)}`
                    : 'Busque o CPF do aluno acima, marque os exercícios da biblioteca e libere o treino'}
              </p>
            </div>

            <span className="text-xs font-mono tabular-nums font-semibold text-orange-400">
              {selectedLibraryCount} selecionado{selectedLibraryCount === 1 ? '' : 's'}
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="relative">
              <Search
                className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder="Filtrar exercícios da biblioteca..."
                aria-label="Filtrar exercícios da biblioteca"
                className="w-full min-h-[44px] pl-10 pr-10 py-2 rounded-xl bg-[#0b0c0e] border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-orange-500"
              />
              {librarySearch && (
                <button
                  type="button"
                  onClick={() => setLibrarySearch('')}
                  aria-label="Limpar busca da biblioteca"
                  className="min-w-[44px] min-h-[44px] absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center text-zinc-400 hover:text-zinc-100 cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setLibraryMuscleFilter(opt)}
                  className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    libraryMuscleFilter === opt
                      ? 'bg-orange-500 text-zinc-950 font-bold'
                      : 'bg-[#0b0c0e] text-zinc-300 border border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
            {filteredLibraryExercises.map((ex) => {
              const draft = getDraft(ex);
              const isTimeBased = isTimeBasedExercise(ex.muscle, ex.name);

              return (
                <div
                  key={ex.id}
                  className={`rounded-xl border p-3.5 transition-colors ${
                    draft.selected
                      ? 'bg-[#0b0c0e] border-orange-500/50'
                      : 'bg-[#0b0c0e]/70 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleExerciseSelection(ex)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                    >
                      <span
                        className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          draft.selected
                            ? 'bg-orange-500 border-orange-500 text-zinc-950'
                            : 'bg-[#14161a] border-zinc-600'
                        }`}
                      >
                        {draft.selected && (
                          <Check className="w-4 h-4 stroke-[3]" aria-hidden="true" />
                        )}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                          <span className="font-semibold text-orange-400">
                            {ex.muscle}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{ex.setsReps}</span>
                        </div>
                        <p className="text-sm font-semibold text-zinc-100 truncate">
                          {ex.name}
                        </p>
                      </div>
                    </button>
                  </div>

                  {draft.selected && (
                    <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-2.5">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] text-zinc-400 mb-1">
                            Séries e repetições
                          </label>
                          <input
                            type="text"
                            value={draft.setsReps}
                            onChange={(e) =>
                              updateDraftField(ex, { setsReps: e.target.value })
                            }
                            className="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg bg-[#14161a] border border-zinc-700 text-xs font-mono text-zinc-100 focus:outline-none focus:border-orange-500"
                          />
                        </div>

                        {isTimeBased ? (
                          <div>
                            <label className="block text-[11px] text-zinc-400 mb-1">
                              Tempo inicial (seg)
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={5}
                              value={draft.durationSeconds}
                              onChange={(e) =>
                                updateDraftField(ex, {
                                  durationSeconds: Math.max(
                                    0,
                                    parseInt(e.target.value, 10) || 0
                                  ),
                                })
                              }
                              className="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg bg-[#14161a] border border-zinc-700 text-xs font-mono tabular-nums text-zinc-100 focus:outline-none focus:border-orange-500"
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="block text-[11px] text-zinc-400 mb-1">
                              Carga inicial (kg)
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              value={draft.weight}
                              onChange={(e) =>
                                updateDraftField(ex, {
                                  weight: Math.max(
                                    0,
                                    parseFloat(e.target.value) || 0
                                  ),
                                })
                              }
                              className="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg bg-[#14161a] border border-zinc-700 text-xs font-mono tabular-nums text-zinc-100 focus:outline-none focus:border-orange-500"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-zinc-400 mr-1">
                          Dias:
                        </span>
                        {DAYS_META.map((day) => {
                          const active = draft.days.includes(day.id);
                          return (
                            <button
                              key={day.id}
                              type="button"
                              onClick={() => toggleDraftDay(ex, day.id)}
                              className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-colors ${
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
                  )}
                </div>
              );
            })}
          </div>

          {workoutErrorMsg && (
            <p className="text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3.5 py-2.5">
              {workoutErrorMsg}
            </p>
          )}

          {workoutReleasedMsg && (
            <div className="flex items-center gap-2 text-xs font-medium text-orange-300 bg-orange-500/10 border border-orange-500/35 rounded-xl px-3.5 py-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-orange-400" aria-hidden="true" />
              <span>{workoutReleasedMsg}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleReleaseWorkout()}
            disabled={isReleasingWorkout}
            className="w-full min-h-[48px] rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-zinc-950 text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span>
              {isReleasingWorkout
                ? 'Liberando treino...'
                : 'Liberar Treino para o Aluno'}
            </span>
          </button>
        </section>
      </div>

      {/* Selected Student Comparative Evolution Charts */}
      {selectedStudentAssessments.length > 0 && (
        <AssessmentEvolutionSection
          assessments={selectedStudentAssessments}
          studentName={foundStudent?.name ?? studentName}
          accent="purple"
        />
      )}

      {/* Saved Assessments History */}
      <section aria-label="Histórico de avaliações físicas" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-display text-2xl font-bold text-zinc-50">
            Histórico de Avaliações ({filteredAssessments.length})
          </h3>

          <div className="relative w-full sm:w-80">
            <Search
              className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Filtrar histórico por nome ou CPF..."
              aria-label="Filtrar histórico de avaliações"
              className="w-full min-h-[44px] pl-10 pr-10 py-2 rounded-xl bg-[#14161a] border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
            />
            {historySearch && (
              <button
                type="button"
                onClick={() => setHistorySearch('')}
                aria-label="Limpar busca do histórico"
                className="min-w-[44px] min-h-[44px] absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center text-zinc-400 hover:text-zinc-100 cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {filteredAssessments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAssessments.map((item) => {
              const bmi = calculateBMI(item.weightKg, item.heightCm);
              const reeval = getReassessmentStatus(item.nextReassessmentDate);
              const trunkMeasures = [
                item.chestCm ? `Tórax ${item.chestCm}cm` : null,
                item.waistCm ? `Cintura ${item.waistCm}cm` : null,
                item.abdomenCm ? `Abdômen ${item.abdomenCm}cm` : null,
                item.hipCm ? `Quadril ${item.hipCm}cm` : null,
                item.whr ? `RCQ ${item.whr}` : null,
              ].filter(Boolean);

              const testItems = [
                item.wellsBenchCm !== undefined ? `Wells ${item.wellsBenchCm}cm` : null,
                item.pushups1Min !== undefined ? `Flexões ${item.pushups1Min}` : null,
                item.situps1Min !== undefined ? `Abdom. ${item.situps1Min}` : null,
                item.vo2Max !== undefined ? `VO2 ${item.vo2Max}` : null,
              ].filter(Boolean);

              return (
                <article
                  key={item.id}
                  className="bg-[#14161a] border border-zinc-800 rounded-2xl p-4 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-400">
                        <span className="font-mono tabular-nums text-purple-300 font-semibold">
                          {formatDateBr(item.date)}
                        </span>
                        {item.studentIdentifier && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">{item.studentIdentifier}</span>
                          </>
                        )}
                        {item.studentAge !== undefined && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">{item.studentAge} anos</span>
                          </>
                        )}
                        {item.goal && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{item.goal}</span>
                          </>
                        )}
                      </div>
                      <h4 className="text-base font-semibold text-zinc-100 mt-0.5 truncate">
                        {item.studentName}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleDeleteAssessment(item.id)}
                      aria-label={`Excluir avaliação de ${item.studentName}`}
                      className="min-w-[44px] min-h-[44px] -mr-2 -mt-1 flex items-center justify-center rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono tabular-nums text-zinc-200 bg-[#0b0c0e] border border-zinc-800/80 rounded-xl px-3.5 py-2.5">
                    <span>{item.weightKg} kg</span>
                    <span className="text-zinc-600" aria-hidden="true">·</span>
                    <span>{item.heightCm} cm</span>
                    {bmi && (
                      <>
                        <span className="text-zinc-600" aria-hidden="true">·</span>
                        <span className="text-purple-300">
                          IMC {bmi.value} ({bmi.label})
                        </span>
                      </>
                    )}
                    {item.bodyFatPercent !== undefined && (
                      <>
                        <span className="text-zinc-600" aria-hidden="true">·</span>
                        <span className="text-orange-400">
                          {item.bodyFatPercent}% GC
                        </span>
                      </>
                    )}
                    {item.leanMassKg !== undefined && (
                      <>
                        <span className="text-zinc-600" aria-hidden="true">·</span>
                        <span className="text-emerald-400">
                          Magra {item.leanMassKg} kg
                        </span>
                      </>
                    )}
                  </div>

                  {trunkMeasures.length > 0 && (
                    <p className="text-xs font-mono tabular-nums text-zinc-400">
                      Tronco: {trunkMeasures.join(' · ')}
                    </p>
                  )}

                  {testItems.length > 0 && (
                    <p className="text-xs font-mono tabular-nums text-zinc-400">
                      Testes: {testItems.join(' · ')}
                    </p>
                  )}

                  {item.nextReassessmentDate && (
                    <p
                      className={`text-xs font-medium ${
                        reeval.status === 'overdue'
                          ? 'text-rose-400'
                          : reeval.status === 'soon'
                            ? 'text-amber-400'
                            : 'text-zinc-400'
                      }`}
                    >
                      {reeval.label}
                    </p>
                  )}

                  {item.notes && (
                    <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                      {item.notes}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#14161a] border border-zinc-800 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#0b0c0e] border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-purple-400">
              <ClipboardList className="w-6 h-6" aria-hidden="true" />
            </div>
            <h4 className="text-base font-semibold text-zinc-100">
              Nenhuma avaliação registrada
            </h4>
            <p className="text-sm text-zinc-400 mt-1 max-w-sm mx-auto">
              Busque o CPF do aluno acima para preencher a avaliação física clínica e montar o treino personalizado.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
