export type MuscleGroup =
  | 'Peito'
  | 'Costas'
  | 'Pernas'
  | 'Ombros'
  | 'Bíceps'
  | 'Tríceps'
  | 'Abdômen';

export type FilterOption = 'Todos' | MuscleGroup;

export interface Exercise {
  id: string;
  name: string;
  muscle: MuscleGroup;
  setsReps: string;
  weight: number;
  completed: boolean;
  imageUrl?: string;
  notes?: string;
}

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Peito',
  'Costas',
  'Pernas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Abdômen',
];

export const FILTER_OPTIONS: FilterOption[] = ['Todos', ...MUSCLE_GROUPS];
