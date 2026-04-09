import type { Program } from '../types';

export const PROGRAMS: Program[] = [
  {
    id: 'stronglifts-5x5',
    name: 'StrongLifts 5x5',
    shortDescription: 'The classic barbell strength program',
    description:
      'A simple, proven strength training program based on 5 sets of 5 reps for the core compound lifts. Perfect for building a strength foundation.',
    level: 'beginner',
    daysPerWeek: 3,
    duration: 'Ongoing',
    category: 'strength',
    isPremium: false,
    accentColor: '#FF6B35',
    author: 'IronPath',
    tags: ['strength', 'barbell', 'compound', 'beginner-friendly'],
    equipment: ['barbell'],
    weeks: [
      {
        weekNumber: 1,
        days: [
          {
            id: 'sl-w1-d1',
            name: 'Workout A',
            estimatedMinutes: 45,
            exercises: [
              {
                exerciseId: 'squat',
                sets: [{ reps: '5', weightNote: '45 lbs' }],
              },
              {
                exerciseId: 'bench-press',
                sets: [{ reps: '5', weightNote: '45 lbs' }],
              },
              {
                exerciseId: 'barbell-row',
                sets: [{ reps: '5', weightNote: '65 lbs' }],
              },
            ],
          },
          {
            id: 'sl-w1-d2',
            name: 'Rest Day',
            isRestDay: true,
            exercises: [],
          },
          {
            id: 'sl-w1-d3',
            name: 'Workout B',
            estimatedMinutes: 45,
            exercises: [
              {
                exerciseId: 'squat',
                sets: [{ reps: '5', weightNote: '47.5 lbs' }],
              },
              {
                exerciseId: 'overhead-press',
                sets: [{ reps: '5', weightNote: '45 lbs' }],
              },
              {
                exerciseId: 'deadlift',
                sets: [{ reps: '5', weightNote: '95 lbs' }],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ppl-hypertrophy',
    name: 'Push / Pull / Legs',
    shortDescription: '6-day hypertrophy split for size & definition',
    description:
      'A 6-day push/pull/legs split designed for maximizing muscle hypertrophy. Each muscle group is trained twice per week with high volume.',
    level: 'intermediate',
    daysPerWeek: 6,
    duration: '12 weeks',
    category: 'hypertrophy',
    isPremium: false,
    accentColor: '#A855F7',
    author: 'IronPath',
    tags: ['hypertrophy', 'size', 'split', '6-day'],
    equipment: ['barbell', 'dumbbell', 'cable', 'machine'],
    weeks: [
      {
        weekNumber: 1,
        days: [
          {
            id: 'ppl-w1-push1',
            name: 'Push 1',
            estimatedMinutes: 60,
            exercises: [
              {
                exerciseId: 'bench-press',
                sets: [
                  { reps: '8-12', rpe: 8 },
                  { reps: '8-12', rpe: 8 },
                  { reps: '8-12', rpe: 8 },
                  { reps: '8-12', rpe: 9 },
                ],
              },
              {
                exerciseId: 'overhead-press',
                sets: [
                  { reps: '8-12', rpe: 8 },
                  { reps: '8-12', rpe: 8 },
                  { reps: '8-12', rpe: 8 },
                ],
              },
            ],
          },
          {
            id: 'ppl-w1-pull1',
            name: 'Pull 1',
            estimatedMinutes: 60,
            exercises: [
              {
                exerciseId: 'barbell-row',
                sets: [
                  { reps: '8-12', rpe: 8 },
                  { reps: '8-12', rpe: 8 },
                  { reps: '8-12', rpe: 8 },
                ],
              },
            ],
          },
          {
            id: 'ppl-w1-legs1',
            name: 'Legs 1',
            estimatedMinutes: 65,
            exercises: [
              {
                exerciseId: 'squat',
                sets: [
                  { reps: '8-12', rpe: 8 },
                  { reps: '8-12', rpe: 8 },
                  { reps: '8-12', rpe: 8 },
                  { reps: '8-12', rpe: 9 },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: '531-forever',
    name: '5/3/1 Forever',
    shortDescription: 'Jim Wendler\'s proven powerlifting program',
    description:
      'A time-tested strength and powerlifting program built around the four main lifts. Focuses on long-term progression with sustainable load management.',
    level: 'intermediate',
    daysPerWeek: 4,
    duration: 'Ongoing',
    category: 'powerlifting',
    isPremium: true,
    accentColor: '#F59E0B',
    author: 'IronPath',
    tags: ['powerlifting', 'strength', '4-day', 'periodization'],
    equipment: ['barbell'],
    weeks: [
      {
        weekNumber: 1,
        title: 'Week 1 (5s)',
        days: [
          {
            id: '531-w1-squat',
            name: 'Squat Day',
            estimatedMinutes: 60,
            exercises: [
              {
                exerciseId: 'squat',
                sets: [
                  { reps: '5', weightNote: '65% 1RM' },
                  { reps: '5', weightNote: '75% 1RM' },
                  { reps: '5+', weightNote: '85% 1RM', isAmrap: true },
                ],
              },
            ],
          },
          {
            id: '531-w1-bench',
            name: 'Bench Day',
            estimatedMinutes: 55,
            exercises: [
              {
                exerciseId: 'bench-press',
                sets: [
                  { reps: '5', weightNote: '65% 1RM' },
                  { reps: '5', weightNote: '75% 1RM' },
                  { reps: '5+', weightNote: '85% 1RM', isAmrap: true },
                ],
              },
            ],
          },
          {
            id: '531-w1-deadlift',
            name: 'Deadlift Day',
            estimatedMinutes: 55,
            exercises: [
              {
                exerciseId: 'deadlift',
                sets: [
                  { reps: '5', weightNote: '65% 1RM' },
                  { reps: '5', weightNote: '75% 1RM' },
                  { reps: '5+', weightNote: '85% 1RM', isAmrap: true },
                ],
              },
            ],
          },
          {
            id: '531-w1-ohp',
            name: 'Press Day',
            estimatedMinutes: 50,
            exercises: [
              {
                exerciseId: 'overhead-press',
                sets: [
                  { reps: '5', weightNote: '65% 1RM' },
                  { reps: '5', weightNote: '75% 1RM' },
                  { reps: '5+', weightNote: '85% 1RM', isAmrap: true },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'body-recomp',
    name: 'Body Recomposition',
    shortDescription: 'Build muscle & burn fat simultaneously',
    description:
      'A comprehensive program designed to help you lose fat while building muscle through a combination of compound and isolation work with metabolic conditioning.',
    level: 'beginner',
    daysPerWeek: 4,
    duration: '8 weeks',
    category: 'general',
    isPremium: false,
    accentColor: '#22C55E',
    author: 'IronPath',
    tags: ['fat-loss', 'muscle-building', 'recomp', '4-day'],
    equipment: ['barbell', 'dumbbell', 'cable'],
    weeks: [
      {
        weekNumber: 1,
        days: [
          {
            id: 'recomp-w1-d1',
            name: 'Upper A',
            estimatedMinutes: 50,
            exercises: [
              {
                exerciseId: 'bench-press',
                sets: [
                  { reps: '10-12', rpe: 7 },
                  { reps: '10-12', rpe: 7 },
                  { reps: '10-12', rpe: 8 },
                ],
              },
            ],
          },
          {
            id: 'recomp-w1-d2',
            name: 'Lower A',
            estimatedMinutes: 55,
            exercises: [
              {
                exerciseId: 'squat',
                sets: [
                  { reps: '10-12', rpe: 7 },
                  { reps: '10-12', rpe: 7 },
                  { reps: '10-12', rpe: 8 },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

export function getProgramById(id: string): Program | undefined {
  return PROGRAMS.find((p) => p.id === id);
}

export function getFreePrograms(): Program[] {
  return PROGRAMS.filter((p) => !p.isPremium);
}

export function getPremiumPrograms(): Program[] {
  return PROGRAMS.filter((p) => p.isPremium);
}

