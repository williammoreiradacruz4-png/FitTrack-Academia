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
  completed: boolean;
  imageUrl?: string;
  notes?: string;
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
