// ─── Core Data Types ────────────────────────────────────────────────────────

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type ProgramCategory = 'strength' | 'hypertrophy' | 'powerlifting' | 'general';
export type EquipmentType = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'cable' | 'kettlebell';
export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core' | 'full body';

// ─── Exercise Library ────────────────────────────────────────────────────────

export interface Exercise {
  id: string;
  name: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: EquipmentType[];
  category: 'compound' | 'isolation' | 'bodyweight';
  instructions: string[];
  tips?: string[];
}

// ─── Program Structure ───────────────────────────────────────────────────────

export interface SetScheme {
  reps: string;          // "5", "8-12", "AMRAP", "5+"
  weightNote?: string;   // "45", "70% 1RM", "bodyweight"
  rpe?: number;
  isAmrap?: boolean;
  restSeconds?: number;
}

export interface ProgramExercise {
  exerciseId: string;
  sets: SetScheme[];
  notes?: string;
  supersetWith?: string; // exerciseId
}

export interface WorkoutDay {
  id: string;
  name: string;         // "Day A", "Push", "Upper Body"
  exercises: ProgramExercise[];
  isRestDay?: boolean;
  estimatedMinutes?: number;
}

export interface ProgramWeek {
  weekNumber: number;
  title?: string;       // "Deload Week", "Intensity Week"
  days: WorkoutDay[];
}

export interface Program {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  level: DifficultyLevel;
  daysPerWeek: number;
  duration: string;      // "8 weeks", "12 weeks", "Ongoing"
  category: ProgramCategory;
  isPremium: boolean;
  accentColor: string;
  author: string;
  tags: string[];
  weeks: ProgramWeek[];
  equipment: EquipmentType[];
}

// ─── Workout Session ─────────────────────────────────────────────────────────

export interface CompletedSet {
  exerciseId: string;
  exerciseName: string;
  setIndex: number;
  reps: number;
  weight: number;        // in user's preferred unit
  rpe?: number;
  notes?: string;
  completedAt: string;   // ISO date string
}

export interface WorkoutSession {
  id: string;
  programId?: string;
  programName?: string;
  dayId: string;
  dayName: string;
  startedAt: string;
  completedAt?: string;
  durationSeconds: number;
  completedSets: CompletedSet[];
  notes?: string;
  isComplete: boolean;
  totalVolume: number;   // total weight × reps
}

// ─── Progress & Stats ────────────────────────────────────────────────────────

export interface ExercisePR {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  achievedAt: string;
}

export interface WeeklyStats {
  weekStart: string;
  sessionsCompleted: number;
  totalVolume: number;
  totalMinutes: number;
}

// ─── User ────────────────────────────────────────────────────────────────────

export type UnitSystem = 'imperial' | 'metric';

export interface UserProfile {
  name: string;
  isPremium: boolean;
  premiumExpiresAt?: string;
  currentProgramId?: string;
  currentWeek: number;
  currentDay: number;
  unitSystem: UnitSystem;
  bodyWeight?: number;
  hasCompletedOnboarding: boolean;
  joinedAt: string;
  goals: string[];
}

// ─── Navigation Types ────────────────────────────────────────────────────────

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  ProgramDetail: { programId: string };
  ActiveWorkout: { programId: string; dayId: string; programName: string; dayName: string };
  Paywall: { feature?: string };
  WorkoutComplete: { sessionId: string };
};

export type TabParamList = {
  Home: undefined;
  Programs: undefined;
  History: undefined;
  Profile: undefined;
};
