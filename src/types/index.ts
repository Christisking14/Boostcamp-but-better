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
  reps: string;           // "5", "8-12", "AMRAP", "5+"
  weightNote?: string;    // "45 lbs", "70% 1RM", "bodyweight"
  rpe?: number;           // 1–10
  isAmrap?: boolean;
  restSeconds?: number;
  isWarmup?: boolean;
}

export interface ProgramExercise {
  exerciseId: string;
  sets: SetScheme[];
  notes?: string;
  supersetWith?: string;  // exerciseId of the exercise to superset with
}

export interface WorkoutDay {
  id: string;
  name: string;
  exercises: ProgramExercise[];
  isRestDay?: boolean;
  estimatedMinutes?: number;
  notes?: string;
}

export interface ProgramWeek {
  weekNumber: number;
  title?: string;         // "Deload Week", "Volume Block", etc.
  days: WorkoutDay[];
  isDeload?: boolean;
}

export interface Program {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  level: DifficultyLevel;
  daysPerWeek: number;
  duration: string;
  category: ProgramCategory;
  isPremium: boolean;
  accentColor: string;
  gradientColors?: [string, string];
  author: string;
  authorCredentials?: string;
  tags: string[];
  weeks: ProgramWeek[];
  equipment: EquipmentType[];
  goals?: string[];
}

// ─── Workout Session ─────────────────────────────────────────────────────────

export type SetType = 'working' | 'warmup' | 'dropset' | 'backoff';

export interface CompletedSet {
  exerciseId: string;
  exerciseName: string;
  setIndex: number;
  setType: SetType;       // NEW
  reps: number;
  weight: number;
  rpe?: number;           // 1–10 Rate of Perceived Exertion
  notes?: string;
  completedAt: string;
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
  bodyWeight?: number;    // bodyweight at time of session
  isComplete: boolean;
  totalVolume: number;
}

// ─── Progress & Stats ────────────────────────────────────────────────────────

export interface ExercisePR {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  e1rm: number;           // estimated 1RM at time of PR
  achievedAt: string;
}

export interface E1RMDataPoint {
  date: string;           // ISO string
  e1rm: number;
  weight: number;
  reps: number;
}

export interface VolumeDataPoint {
  date: string;
  volume: number;         // total session volume
  sessionCount: number;
}

export interface BodyweightEntry {
  date: string;           // ISO date string YYYY-MM-DD
  weight: number;         // in user's preferred unit
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
  defaultRestSeconds: number;   // NEW — default rest timer
  showRPE: boolean;             // NEW — toggle RPE column
}

// ─── Community Workouts ──────────────────────────────────────────────────────

export interface CommunityExercise {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: string;
  notes?: string;
}

export interface CommunityWorkout {
  id: string;
  title: string;
  description: string;
  authorName: string;
  authorId: string;
  exercises: CommunityExercise[];
  estimatedMinutes: number;
  likes: number;
  likedBy: string[];
  tags: string[];
  category: 'strength' | 'hypertrophy' | 'cardio' | 'custom';
  createdAt: string;
}

// ─── Bodyweight tracking ─────────────────────────────────────────────────────

export interface BodyweightLog {
  entries: BodyweightEntry[];
}

// ─── Navigation Types ────────────────────────────────────────────────────────

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  ProgramDetail: { programId: string };
  ActiveWorkout: { programId: string; dayId: string; programName: string; dayName: string };
  ActiveCommunityWorkout: { workout: CommunityWorkout };
  Paywall: { feature?: string };
  WorkoutComplete: { sessionId: string };
  CreateWorkout: undefined;
  CommunityWorkoutDetail: { workoutId: string };
  ExerciseProgress: { exerciseId: string; exerciseName: string };
  History: undefined;
  Profile: undefined;
};

export type TabParamList = {
  Home: undefined;
  Programs: undefined;
  Community: undefined;
  Progress: undefined;
  Tools: undefined;
};
