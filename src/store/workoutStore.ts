import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  CompletedSet,
  ExercisePR,
  UnitSystem,
  UserProfile,
  WorkoutSession,
} from '../types';
import { calculateTotalVolume } from '../utils/calculations';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_STORED_SESSIONS = 200;

const DEFAULT_USER: UserProfile = {
  name: '',
  isPremium: false,
  currentProgramId: undefined,
  currentWeek: 1,
  currentDay: 0,
  unitSystem: 'imperial',
  hasCompletedOnboarding: false,
  joinedAt: new Date().toISOString(),
  goals: [],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Return midnight (00:00:00.000) of the Monday for the week containing `date`. */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  const diffToMonday = (day + 6) % 7; // days since Monday
  d.setDate(d.getDate() - diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── State & Actions Types ───────────────────────────────────────────────────

interface WorkoutState {
  user: UserProfile;
  sessions: WorkoutSession[];
  prs: ExercisePR[];
  activeSession: WorkoutSession | null;
}

interface WorkoutActions {
  // ── User / onboarding ──────────────────────────────────────────────────────
  completeOnboarding(name: string, goals: string[], unitSystem: UnitSystem): void;
  setCurrentProgram(programId: string): void;
  setPremium(isPremium: boolean, expiresAt?: string): void;
  updateUser(updates: Partial<UserProfile>): void;

  // ── Session lifecycle ──────────────────────────────────────────────────────
  startWorkout(
    programId: string,
    dayId: string,
    programName: string,
    dayName: string,
  ): void;
  addSet(set: Omit<CompletedSet, 'completedAt'>): void;
  removeLastSet(exerciseId: string): void;
  finishWorkout(): WorkoutSession | null;
  deleteSession(sessionId: string): void;

  // ── Read / derived helpers ─────────────────────────────────────────────────
  getRecentSessions(count: number): WorkoutSession[];
  getSessionsThisWeek(): WorkoutSession[];
  getPRForExercise(exerciseId: string): ExercisePR | undefined;
  getTotalVolume(): number;
  getStreakDays(): number;
}

export type WorkoutStore = WorkoutState & WorkoutActions;

// ─── Store ───────────────────────────────────────────────────────────────────

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      // ── Initial state ────────────────────────────────────────────────────
      user: { ...DEFAULT_USER, joinedAt: new Date().toISOString() },
      sessions: [],
      prs: [],
      activeSession: null,

      // ── User / onboarding ────────────────────────────────────────────────

      completeOnboarding(name, goals, unitSystem) {
        set((state) => ({
          user: {
            ...state.user,
            name,
            goals,
            unitSystem,
            hasCompletedOnboarding: true,
          },
        }));
      },

      setCurrentProgram(programId) {
        set((state) => ({
          user: {
            ...state.user,
            currentProgramId: programId,
            // Reset progress when switching programs
            currentWeek: 1,
            currentDay: 0,
          },
        }));
      },

      setPremium(isPremium, expiresAt) {
        set((state) => ({
          user: {
            ...state.user,
            isPremium,
            premiumExpiresAt: expiresAt,
          },
        }));
      },

      updateUser(updates) {
        set((state) => ({
          user: { ...state.user, ...updates },
        }));
      },

      // ── Session lifecycle ────────────────────────────────────────────────

      startWorkout(programId, dayId, programName, dayName) {
        // Discard any previous incomplete session silently
        const session: WorkoutSession = {
          id: generateId(),
          programId,
          programName,
          dayId,
          dayName,
          startedAt: new Date().toISOString(),
          completedAt: undefined,
          durationSeconds: 0,
          completedSets: [],
          isComplete: false,
          totalVolume: 0,
        };
        set({ activeSession: session });
      },

      addSet(newSet: Omit<CompletedSet, 'completedAt'>) {
        const completedSet: CompletedSet = {
          ...newSet,
          completedAt: new Date().toISOString(),
        };
        set((state) => {
          if (!state.activeSession) return state;
          return {
            activeSession: {
              ...state.activeSession,
              completedSets: [
                ...state.activeSession.completedSets,
                completedSet,
              ],
            },
          };
        });
      },

      removeLastSet(exerciseId) {
        set((state) => {
          if (!state.activeSession) return state;

          const sets = state.activeSession.completedSets;
          // Find the index of the last set belonging to this exercise
          let lastIdx = -1;
          for (let i = sets.length - 1; i >= 0; i--) {
            if (sets[i].exerciseId === exerciseId) {
              lastIdx = i;
              break;
            }
          }
          if (lastIdx === -1) return state;

          return {
            activeSession: {
              ...state.activeSession,
              completedSets: [
                ...sets.slice(0, lastIdx),
                ...sets.slice(lastIdx + 1),
              ],
            },
          };
        });
      },

      finishWorkout() {
        const state = get();
        if (!state.activeSession) return null;

        const now = new Date();
        const startedAt = new Date(state.activeSession.startedAt);
        const durationSeconds = Math.round(
          (now.getTime() - startedAt.getTime()) / 1000,
        );
        const totalVolume = calculateTotalVolume(
          state.activeSession.completedSets,
        );

        const finishedSession: WorkoutSession = {
          ...state.activeSession,
          completedAt: now.toISOString(),
          durationSeconds,
          totalVolume,
          isComplete: true,
        };

        // ── Advance program day/week ────────────────────────────────────
        // currentDay is 0-based index; we simply increment and leave
        // week management to the caller unless we have a fixed cycle
        // (we don't know the program length here, so just increment day).
        const updatedUser: UserProfile = {
          ...state.user,
          currentDay: state.user.currentDay + 1,
        };

        // ── Check for new PRs ───────────────────────────────────────────
        // Group sets by exerciseId and check whether 1RM improved.
        const updatedPRs: ExercisePR[] = [...state.prs];

        const setsByExercise = finishedSession.completedSets.reduce<
          Record<string, CompletedSet[]>
        >((acc, s) => {
          if (!acc[s.exerciseId]) acc[s.exerciseId] = [];
          acc[s.exerciseId].push(s);
          return acc;
        }, {});

        for (const [exerciseId, sets] of Object.entries(setsByExercise)) {
          // Find the best (heaviest weight, then most reps) set
          const best = sets.reduce((prev, curr) => {
            if (curr.weight > prev.weight) return curr;
            if (curr.weight === prev.weight && curr.reps > prev.reps)
              return curr;
            return prev;
          });

          const existingPRIdx = updatedPRs.findIndex(
            (pr) => pr.exerciseId === exerciseId,
          );

          const isNewPR =
            existingPRIdx === -1 ||
            best.weight > updatedPRs[existingPRIdx].weight ||
            (best.weight === updatedPRs[existingPRIdx].weight &&
              best.reps > updatedPRs[existingPRIdx].reps);

          if (isNewPR) {
            const newPR: ExercisePR = {
              exerciseId,
              exerciseName: best.exerciseName,
              weight: best.weight,
              reps: best.reps,
              achievedAt: now.toISOString(),
            };
            if (existingPRIdx === -1) {
              updatedPRs.push(newPR);
            } else {
              updatedPRs[existingPRIdx] = newPR;
            }
          }
        }

        // ── Persist, cap history ────────────────────────────────────────
        const updatedSessions = [finishedSession, ...state.sessions].slice(
          0,
          MAX_STORED_SESSIONS,
        );

        set({
          activeSession: null,
          sessions: updatedSessions,
          prs: updatedPRs,
          user: updatedUser,
        });

        return finishedSession;
      },

      deleteSession(sessionId) {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
        }));
      },

      // ── Read / derived helpers ───────────────────────────────────────────

      getRecentSessions(count) {
        return get().sessions.slice(0, count);
      },

      getSessionsThisWeek() {
        const weekStart = getWeekStart(new Date());
        return get().sessions.filter(
          (s) =>
            s.isComplete &&
            s.completedAt !== undefined &&
            new Date(s.completedAt) >= weekStart,
        );
      },

      getPRForExercise(exerciseId) {
        return get().prs.find((pr) => pr.exerciseId === exerciseId);
      },

      getTotalVolume() {
        return get().sessions.reduce((total, s) => total + s.totalVolume, 0);
      },

      getStreakDays() {
        const completedSessions = get()
          .sessions.filter((s) => s.isComplete && s.completedAt)
          .sort(
            (a, b) =>
              new Date(b.completedAt!).getTime() -
              new Date(a.completedAt!).getTime(),
          );

        if (completedSessions.length === 0) return 0;

        // Build a set of unique calendar dates that have a completed session
        const datesWithSession = new Set<string>();
        for (const s of completedSessions) {
          const d = new Date(s.completedAt!);
          datesWithSession.add(
            `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
          );
        }

        const today = new Date();
        let streak = 0;
        let cursor = new Date(today);

        // Tolerate today not yet having a session (start check from today or
        // yesterday, whichever has a session first)
        const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
        if (!datesWithSession.has(todayKey)) {
          cursor.setDate(cursor.getDate() - 1);
        }

        while (true) {
          const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
          if (!datesWithSession.has(key)) break;
          streak += 1;
          cursor.setDate(cursor.getDate() - 1);
        }

        return streak;
      },
    }),
    {
      name: 'ironpath-workout-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist durable state; activeSession is intentionally persisted
      // so users can resume a workout after backgrounding the app.
      partialize: (state) => ({
        user: state.user,
        sessions: state.sessions,
        prs: state.prs,
        activeSession: state.activeSession,
      }),
    },
  ),
);
