export type MuscleGroup =
  | 'Peito'
  | 'Costas'
  | 'Pernas'
  | 'Quadríceps'
  | 'Posterior'
  | 'Glúteo'
  | 'Panturrilha'
  | 'Ombros'
  | 'Bíceps'
  | 'Tríceps'
  | 'Abdômen';

export type FilterOption = 'Todos' | MuscleGroup;

export type DayOfWeek = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';

export type DayFilter = 'todos' | DayOfWeek;

export type ScheduleRange = '5' | '6' | '7';

export type DayPlanMode =
  | 'simples'
  | 'conjugado2'
  | 'conjugado3'
  | 'conjugado4'
  | 'conjugado5'
  | 'conjugado6'
  | 'descanso';

export interface DayPlan {
  day: DayOfWeek;
  mode: DayPlanMode;
  muscles: MuscleGroup[];
}

export interface WorkoutPlan {
  range: ScheduleRange;
  days: Record<DayOfWeek, DayPlan>;
}

export interface Exercise {
  id: string;
  name: string;
  muscle: MuscleGroup;
  setsReps: string;
  weight: number;
  durationSeconds?: number;
  completed: boolean;
  imageUrl?: string;
  notes?: string;
  executionInstructions?: string;
  videoUrl?: string;
  videoFileId?: string;
  videoFileName?: string;
  videoDurationLabel?: string;
  days?: DayOfWeek[];
  isConjugated?: boolean;
}

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Peito',
  'Costas',
  'Pernas',
  'Quadríceps',
  'Posterior',
  'Glúteo',
  'Panturrilha',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Abdômen',
];

export const FILTER_OPTIONS: FilterOption[] = ['Todos', ...MUSCLE_GROUPS];

export interface DayMeta {
  id: DayOfWeek;
  short: string;
  label: string;
}

export const DAYS_META: DayMeta[] = [
  { id: 'seg', short: 'Seg', label: 'Segunda-feira' },
  { id: 'ter', short: 'Ter', label: 'Terça-feira' },
  { id: 'qua', short: 'Qua', label: 'Quarta-feira' },
  { id: 'qui', short: 'Qui', label: 'Quinta-feira' },
  { id: 'sex', short: 'Sex', label: 'Sexta-feira' },
  { id: 'sab', short: 'Sáb', label: 'Sábado' },
  { id: 'dom', short: 'Dom', label: 'Domingo' },
];

export function getDaysForRange(range: ScheduleRange): DayMeta[] {
  const count = range === '5' ? 5 : range === '6' ? 6 : 7;
  return DAYS_META.slice(0, count);
}

export function getModeLimit(mode: DayPlanMode): number {
  switch (mode) {
    case 'simples':
      return 1;
    case 'conjugado2':
      return 2;
    case 'conjugado3':
      return 3;
    case 'conjugado4':
      return 4;
    case 'conjugado5':
      return 5;
    case 'conjugado6':
      return 6;
    case 'descanso':
      return 0;
  }
}

export function formatDayPlanSummary(plan: DayPlan): string {
  if (plan.mode === 'descanso') return 'Descanso';
  if (plan.muscles.length === 0) return 'Sem grupo definido';
  return plan.muscles.join(' + ');
}

export const DEFAULT_WORKOUT_PLAN: WorkoutPlan = {
  range: '5',
  days: {
    seg: { day: 'seg', mode: 'conjugado2', muscles: ['Tríceps', 'Bíceps'] },
    ter: { day: 'ter', mode: 'simples', muscles: ['Pernas'] },
    qua: { day: 'qua', mode: 'conjugado2', muscles: ['Peito', 'Ombros'] },
    qui: { day: 'qui', mode: 'simples', muscles: ['Costas'] },
    sex: { day: 'sex', mode: 'conjugado4', muscles: ['Peito', 'Costas', 'Bíceps', 'Tríceps'] },
    sab: { day: 'sab', mode: 'simples', muscles: ['Abdômen'] },
    dom: { day: 'dom', mode: 'descanso', muscles: [] },
  },
};

export interface WaterLog {
  date: string;
  consumedMl: number;
  goalMl: number;
}

export interface ReminderSettings {
  workoutEnabled: boolean;
  workoutTime: string;
  activeDays: DayOfWeek[];
  waterEnabled: boolean;
  waterIntervalMinutes: 60 | 90 | 120;
  lastWorkoutNotifiedDate?: string;
}

export const DEFAULT_REMINDERS: ReminderSettings = {
  workoutEnabled: false,
  workoutTime: '18:00',
  activeDays: ['seg', 'ter', 'qua', 'qui', 'sex'],
  waterEnabled: false,
  waterIntervalMinutes: 90,
};

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayDayId(date = new Date()): DayOfWeek {
  const map: DayOfWeek[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  return map[date.getDay()];
}

export function isTimeBasedExercise(muscle: MuscleGroup, name: string): boolean {
  if (muscle !== 'Abdômen') return false;
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const isCableOrCrossOver =
    /\bcabo\b/.test(normalized) ||
    /cross\s*-?\s*over/.test(normalized);
  return !isCableOrCrossOver;
}

export type UserRole = 'student' | 'professor';

export type BiologicalSex = 'Masculino' | 'Feminino';

export type StudentGoal =
  | 'Hipertrofia'
  | 'Emagrecimento'
  | 'Condicionamento'
  | 'Reabilitação'
  | 'Qualidade de vida'
  | 'Saúde';

export type ActivityLevel =
  | 'Sedentário'
  | 'Iniciante'
  | 'Intermediário'
  | 'Avançado';

export type CompositionMethod = 'pollock3' | 'pollock7' | 'bioimpedancia';

export interface StudentAnamnesis {
  jointOrSpinePain: boolean;
  painDetails?: string;
  surgeriesOrInjuries: boolean;
  surgeryDetails?: string;
  medications: boolean;
  medicationDetails?: string;
  medicalClearance: boolean;
  additionalNotes?: string;
}

export interface ParqChecklist {
  chestPain: boolean;
  dizziness: boolean;
  boneOrJointProblems: boolean;
  bloodPressureOrHeartMeds: boolean;
}

export interface PostureDeviations {
  hyperlordosis?: boolean;
  hyperkyphosis?: boolean;
  scoliosis?: boolean;
  roundedShoulders?: boolean;
  kneeValgusVarus?: boolean;
}

export interface PosturePhotos {
  front?: string;
  back?: string;
  profile?: string;
}

export interface Academy {
  code: string; // normalized uppercase code (document ID in fittrack_academies)
  name: string;
  professorName: string;
  password: string;
  createdAt: string;
}

export interface StudentProfile {
  cpf: string; // 11 digits only (key in fittrack_users)
  formattedCpf: string;
  academyCode: string;
  academyName?: string;
  name: string;
  email?: string;
  password?: string;
  birthDate: string; // YYYY-MM-DD
  age: number;
  phone: string;
  biologicalSex: BiologicalSex;
  goal?: StudentGoal;
  anamnesis?: StudentAnamnesis;
  createdAt: string;
  updatedAt: string;
}

export interface StudentWorkoutRecord {
  cpf: string; // 11 digits only (key in fittrack_student_workouts)
  academyCode: string;
  academyName?: string;
  studentName: string;
  exercises: Exercise[];
  releasedAt: string;
  updatedAt: string;
  professorName?: string;
}

export interface UserSession {
  role: UserRole;
  name: string;
  identifier: string;
  cpf?: string; // normalized 11-digit CPF when role === 'student'
  academyCode?: string;
  academyName?: string;
  loggedInAt: string;
}

export interface PhysicalAssessment {
  id: string;
  academyCode?: string;
  studentName: string;
  studentIdentifier?: string;
  studentCpf?: string;
  studentAge?: number;
  studentPhone?: string;
  biologicalSex?: BiologicalSex;
  date: string;
  nextReassessmentDate?: string;

  // Bloco A — Anamnese e PAR-Q
  goal?: string;
  activityLevel?: ActivityLevel;
  parq?: ParqChecklist;
  sleepHours?: number;
  weeklyFrequency?: number;
  clinicalHistory?: string;
  anamnesisSummary?: string;

  // Bloco B — Dados Gerais & Sinais Vitais
  weightKg: number;
  heightCm: number;
  bmi?: number;
  systolicBp?: number;
  diastolicBp?: number;
  restingHr?: number;

  // Bloco C — Perimetria (cm) e Simetria D/E
  chestCm?: number;
  waistCm?: number;
  abdomenCm?: number;
  hipCm?: number;
  whr?: number; // RCQ
  armRelaxedRightCm?: number;
  armRelaxedLeftCm?: number;
  armContractedRightCm?: number;
  armContractedLeftCm?: number;
  forearmRightCm?: number;
  forearmLeftCm?: number;
  thighProxRightCm?: number;
  thighProxLeftCm?: number;
  thighMedRightCm?: number;
  thighMedLeftCm?: number;
  calfRightCm?: number;
  calfLeftCm?: number;
  // Legacy summary fields kept optional for backwards compatibility
  armCm?: number;
  thighCm?: number;

  // Bloco D — Composição Corporal
  compositionMethod?: CompositionMethod;
  bodyFatPercent?: number;
  fatMassKg?: number;
  leanMassKg?: number;
  // Dobras (mm)
  skinfoldPectoralMm?: number;
  skinfoldAbdominalMm?: number;
  skinfoldThighMm?: number;
  skinfoldTricepsMm?: number;
  skinfoldSuprailiacMm?: number;
  skinfoldSubscapularMm?: number;
  skinfoldMidaxillaryMm?: number;
  // Bioimpedância
  skeletalMuscleMassKg?: number;
  visceralFatLevel?: number;
  bmrKcal?: number;
  bodyWaterPercent?: number;

  // Bloco E — Postural, Fotos e Testes Físicos
  posturePhotos?: PosturePhotos;
  postureDeviations?: PostureDeviations;
  posturalNotes?: string;
  wellsBenchCm?: number;
  pushups1Min?: number;
  situps1Min?: number;
  vo2Max?: number;

  notes?: string;
}

export function normalizeAcademyCode(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 24);
}

export function normalizeCpf(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 11);
}

export function formatCpfMask(raw: string): string {
  const digits = normalizeCpf(raw);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function formatPhoneMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function calculateAgeFromBirthDate(birthDate: string): number | null {
  if (!birthDate) return null;
  const parts = birthDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [year, month, day] = parts;
  const today = new Date();
  let age = today.getFullYear() - year;
  const mDiff = today.getMonth() + 1 - month;
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < day)) {
    age--;
  }
  if (age < 0 || age > 120) return null;
  return age;
}

export function calculateBMI(
  weightKg: number,
  heightCm: number
): { value: number; label: string } | null {
  if (!weightKg || !heightCm || heightCm < 50) return null;
  const meters = heightCm / 100;
  const bmi = weightKg / (meters * meters);
  const rounded = Math.round(bmi * 10) / 10;

  let label = 'Peso normal';
  if (rounded < 18.5) label = 'Abaixo do peso';
  else if (rounded < 25) label = 'Peso normal';
  else if (rounded < 30) label = 'Sobrepeso';
  else if (rounded < 35) label = 'Obesidade grau I';
  else if (rounded < 40) label = 'Obesidade grau II';
  else label = 'Obesidade grau III';

  return { value: rounded, label };
}

export function calculateWHR(
  waistCm: number,
  hipCm: number,
  sex: BiologicalSex
): { value: number; riskLabel: string } | null {
  if (!waistCm || !hipCm || waistCm <= 0 || hipCm <= 0) return null;
  const value = Math.round((waistCm / hipCm) * 100) / 100;
  const threshold = sex === 'Masculino' ? 0.9 : 0.85;
  const riskLabel =
    value > threshold ? 'Risco metabólico aumentado' : 'Dentro do esperado';
  return { value, riskLabel };
}

export function calculatePollock3BodyFat(
  sex: BiologicalSex,
  age: number,
  folds: {
    pectoral?: number;
    abdominal?: number;
    thigh?: number;
    triceps?: number;
    suprailiac?: number;
  }
): number | null {
  const safeAge = age > 0 && age < 120 ? age : 25;
  let sum = 0;
  let density = 0;

  if (sex === 'Masculino') {
    const { pectoral, abdominal, thigh } = folds;
    if (!pectoral || !abdominal || !thigh) return null;
    sum = pectoral + abdominal + thigh;
    density =
      1.10938 -
      0.0008267 * sum +
      0.0000016 * sum * sum -
      0.0002574 * safeAge;
  } else {
    const { triceps, suprailiac, thigh } = folds;
    if (!triceps || !suprailiac || !thigh) return null;
    sum = triceps + suprailiac + thigh;
    density =
      1.0994921 -
      0.0009929 * sum +
      0.0000023 * sum * sum -
      0.0001392 * safeAge;
  }

  if (density <= 0) return null;
  const bf = 495 / density - 450;
  if (!Number.isFinite(bf) || bf < 2 || bf > 70) return null;
  return Math.round(bf * 10) / 10;
}

export function calculatePollock7BodyFat(
  sex: BiologicalSex,
  age: number,
  folds: {
    triceps?: number;
    subscapular?: number;
    pectoral?: number;
    midaxillary?: number;
    suprailiac?: number;
    abdominal?: number;
    thigh?: number;
  }
): number | null {
  const {
    triceps,
    subscapular,
    pectoral,
    midaxillary,
    suprailiac,
    abdominal,
    thigh,
  } = folds;
  if (
    !triceps ||
    !subscapular ||
    !pectoral ||
    !midaxillary ||
    !suprailiac ||
    !abdominal ||
    !thigh
  ) {
    return null;
  }

  const safeAge = age > 0 && age < 120 ? age : 25;
  const sum =
    triceps +
    subscapular +
    pectoral +
    midaxillary +
    suprailiac +
    abdominal +
    thigh;

  const density =
    sex === 'Masculino'
      ? 1.112 - 0.00043499 * sum + 0.00000055 * sum * sum - 0.00028826 * safeAge
      : 1.097 - 0.00046971 * sum + 0.00000056 * sum * sum - 0.00012828 * safeAge;

  if (density <= 0) return null;
  const bf = 495 / density - 450;
  if (!Number.isFinite(bf) || bf < 2 || bf > 70) return null;
  return Math.round(bf * 10) / 10;
}

export function addDaysToDateKey(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  const base =
    parts.length === 3 && !parts.some((n) => Number.isNaN(n))
      ? new Date(parts[0], parts[1] - 1, parts[2])
      : new Date();
  base.setDate(base.getDate() + days);
  return getLocalDateKey(base);
}

export function formatDateBr(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function getReassessmentStatus(nextDate?: string): {
  status: 'ok' | 'soon' | 'overdue' | 'none';
  daysDiff: number | null;
  label: string;
} {
  if (!nextDate) {
    return { status: 'none', daysDiff: null, label: 'Sem reavaliação agendada' };
  }
  const parts = nextDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return { status: 'none', daysDiff: null, label: 'Data inválida' };
  }
  const today = new Date();
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const targetMidnight = new Date(parts[0], parts[1] - 1, parts[2]);
  const diffDays = Math.round(
    (targetMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    return {
      status: 'overdue',
      daysDiff: diffDays,
      label: `Reavaliação vencida há ${Math.abs(diffDays)} dia${Math.abs(diffDays) === 1 ? '' : 's'}`,
    };
  }
  if (diffDays === 0) {
    return {
      status: 'soon',
      daysDiff: 0,
      label: 'Reavaliação vence hoje',
    };
  }
  if (diffDays <= 10) {
    return {
      status: 'soon',
      daysDiff: diffDays,
      label: `Reavaliação em ${diffDays} dia${diffDays === 1 ? '' : 's'}`,
    };
  }
  return {
    status: 'ok',
    daysDiff: diffDays,
    label: `Válida até ${formatDateBr(nextDate)}`,
  };
}

export function formatAnamnesisSummary(anamnesis?: StudentAnamnesis): string {
  if (!anamnesis) return 'Anamnese preenchida pelo professor na avaliação.';
  const items: string[] = [];
  items.push(
    anamnesis.jointOrSpinePain
      ? `Dores articulares/coluna: Sim${anamnesis.painDetails ? ` (${anamnesis.painDetails})` : ''}`
      : 'Dores articulares/coluna: Não'
  );
  items.push(
    anamnesis.surgeriesOrInjuries
      ? `Cirurgias/lesões: Sim${anamnesis.surgeryDetails ? ` (${anamnesis.surgeryDetails})` : ''}`
      : 'Cirurgias/lesões: Não'
  );
  items.push(
    anamnesis.medications
      ? `Medicamentos: Sim${anamnesis.medicationDetails ? ` (${anamnesis.medicationDetails})` : ''}`
      : 'Medicamentos: Não'
  );
  items.push(
    anamnesis.medicalClearance
      ? 'Liberação médica: Sim'
      : 'Liberação médica: Não informada'
  );
  if (anamnesis.additionalNotes?.trim()) {
    items.push(`Obs: ${anamnesis.additionalNotes.trim()}`);
  }
  return items.join(' · ');
}




