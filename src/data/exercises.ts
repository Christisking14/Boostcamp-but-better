import type { Exercise } from '../types';

// ─── Exercise Library ─────────────────────────────────────────────────────────

const EXERCISES: Exercise[] = [
  // ── Barbell compounds ────────────────────────────────────────────────────
  {
    id: 'barbell-squat',
    name: 'Barbell Back Squat',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings', 'core'],
    equipment: ['barbell'],
    category: 'compound',
    instructions: [
      'Set the barbell on the squat rack at chest height.',
      'Step under the bar and position it across your upper traps.',
      'Unrack, step back, feet shoulder-width apart.',
      'Brace your core and descend by pushing your knees out.',
      'Break parallel, then drive back up through your heels.',
    ],
    tips: ['Keep chest tall', 'Drive knees out over toes'],
  },
  {
    id: 'barbell-deadlift',
    name: 'Conventional Deadlift',
    primaryMuscles: ['back', 'hamstrings', 'glutes'],
    secondaryMuscles: ['quads', 'core', 'biceps'],
    equipment: ['barbell'],
    category: 'compound',
    instructions: [
      'Stand with feet hip-width apart, bar over mid-foot.',
      'Hinge at the hips and grip the bar just outside your legs.',
      'Take a big breath, brace your core, and pull the bar into your shins.',
      'Drive your hips forward as the bar passes your knees.',
      'Stand tall, then hinge back down with control.',
    ],
    tips: ['Bar stays close to body', 'Push the floor away, do not just pull'],
  },
  {
    id: 'barbell-bench-press',
    name: 'Barbell Bench Press',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['shoulders', 'triceps'],
    equipment: ['barbell'],
    category: 'compound',
    instructions: [
      'Lie on the bench with eyes under the bar.',
      'Grip the bar slightly wider than shoulder-width.',
      'Unrack and lower the bar to your lower chest.',
      'Press explosively back to lockout.',
    ],
    tips: ['Maintain leg drive', 'Keep shoulder blades retracted'],
  },
  {
    id: 'barbell-ohp',
    name: 'Overhead Press',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['triceps', 'core'],
    equipment: ['barbell'],
    category: 'compound',
    instructions: [
      'Stand with bar in a front rack position at shoulder height.',
      'Brace core and press the bar straight overhead.',
      'At lockout, shrug your traps to lock the bar overhead.',
      'Lower back to the rack position with control.',
    ],
  },
  {
    id: 'barbell-row',
    name: 'Barbell Bent-Over Row',
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'core'],
    equipment: ['barbell'],
    category: 'compound',
    instructions: [
      'Hinge at the hips until torso is ~45 degrees.',
      'Pull the bar to your lower sternum, driving elbows back.',
      'Lower with control.',
    ],
  },
  // ── Accessory / isolation ─────────────────────────────────────────────────
  {
    id: 'dumbbell-curl',
    name: 'Dumbbell Bicep Curl',
    primaryMuscles: ['biceps'],
    secondaryMuscles: [],
    equipment: ['dumbbell'],
    category: 'isolation',
    instructions: [
      'Stand with dumbbells at sides, palms facing forward.',
      'Curl up to shoulder height, squeeze bicep.',
      'Lower slowly.',
    ],
  },
  {
    id: 'tricep-pushdown',
    name: 'Tricep Pushdown',
    primaryMuscles: ['triceps'],
    secondaryMuscles: [],
    equipment: ['cable'],
    category: 'isolation',
    instructions: [
      'Attach a straight or V-bar to a high pulley.',
      'Stand close, elbows tucked at sides.',
      'Push down to full extension, squeeze.',
      'Return slowly to starting position.',
    ],
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps'],
    equipment: ['cable'],
    category: 'compound',
    instructions: [
      'Sit at a lat pulldown machine, thighs secured under pads.',
      'Grip the bar wide, lean back slightly.',
      'Pull the bar to your upper chest, driving elbows down.',
      'Return slowly.',
    ],
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    primaryMuscles: ['quads'],
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: ['machine'],
    category: 'compound',
    instructions: [
      'Sit in the machine with feet shoulder-width on the platform.',
      'Release the safety and lower the platform until knees are ~90 degrees.',
      'Press back to near lockout.',
    ],
  },
  {
    id: 'romanian-deadlift',
    name: 'Romanian Deadlift',
    primaryMuscles: ['hamstrings', 'glutes'],
    secondaryMuscles: ['back', 'core'],
    equipment: ['barbell'],
    category: 'compound',
    instructions: [
      'Hold a barbell at hip level.',
      'Hinge at the hips while keeping a slight knee bend.',
      'Lower until you feel a strong hamstring stretch.',
      'Drive hips forward to return to standing.',
    ],
  },
  {
    id: 'incline-db-press',
    name: 'Incline Dumbbell Press',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['shoulders', 'triceps'],
    equipment: ['dumbbell'],
    category: 'compound',
    instructions: [
      'Set bench to 30-45 degrees.',
      'Press dumbbells from chest level to lockout.',
      'Lower with control.',
    ],
  },
  {
    id: 'pull-up',
    name: 'Pull-Up',
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'core'],
    equipment: ['bodyweight'],
    category: 'bodyweight',
    instructions: [
      'Hang from a bar with an overhand grip slightly wider than shoulders.',
      'Pull your chest to the bar, driving elbows down.',
      'Lower yourself fully.',
    ],
  },
  {
    id: 'dip',
    name: 'Parallel Bar Dip',
    primaryMuscles: ['triceps', 'chest'],
    secondaryMuscles: ['shoulders'],
    equipment: ['bodyweight'],
    category: 'bodyweight',
    instructions: [
      'Support yourself on parallel bars.',
      'Lower until upper arms are parallel to the floor.',
      'Push back to lockout.',
    ],
  },
  {
    id: 'face-pull',
    name: 'Face Pull',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['back'],
    equipment: ['cable'],
    category: 'isolation',
    instructions: [
      'Set cable at head height with a rope attachment.',
      'Pull the rope to your face, flaring elbows out.',
      'Squeeze rear delts at peak contraction.',
    ],
  },
  {
    id: 'ab-wheel',
    name: 'Ab Wheel Rollout',
    primaryMuscles: ['core'],
    secondaryMuscles: ['back', 'shoulders'],
    equipment: ['bodyweight'],
    category: 'bodyweight',
    instructions: [
      'Kneel on the floor holding the ab wheel.',
      'Roll forward until your body is near-parallel to the floor.',
      'Contract your core and pull back.',
    ],
  },
  {
    id: 'dumbbell-row',
    name: 'Single-Arm Dumbbell Row',
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps'],
    equipment: ['dumbbell'],
    category: 'compound',
    instructions: [
      'Place one hand and knee on a bench.',
      'Row the dumbbell to your hip, elbow close to body.',
      'Lower with control.',
    ],
  },
  {
    id: 'lateral-raise',
    name: 'Lateral Raise',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: [],
    equipment: ['dumbbell'],
    category: 'isolation',
    instructions: [
      'Stand with dumbbells at sides.',
      'Raise arms to shoulder height with a slight elbow bend.',
      'Lower slowly.',
    ],
  },
  {
    id: 'leg-curl',
    name: 'Lying Leg Curl',
    primaryMuscles: ['hamstrings'],
    secondaryMuscles: [],
    equipment: ['machine'],
    category: 'isolation',
    instructions: [
      'Lie face-down on the machine.',
      'Curl heels toward glutes.',
      'Lower slowly.',
    ],
  },
  {
    id: 'calf-raise',
    name: 'Standing Calf Raise',
    primaryMuscles: ['calves'],
    secondaryMuscles: [],
    equipment: ['machine'],
    category: 'isolation',
    instructions: [
      'Stand on the edge of a step or machine platform.',
      'Rise onto toes, pause at top.',
      'Lower slowly for a full stretch.',
    ],
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

const EXERCISE_MAP: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e]),
);

// Short-form aliases used by program data files
const ALIASES: Record<string, string> = {
  squat: 'barbell-squat',
  deadlift: 'barbell-deadlift',
  'bench-press': 'barbell-bench-press',
  'overhead-press': 'barbell-ohp',
  ohp: 'barbell-ohp',
  row: 'barbell-row',
  rdl: 'romanian-deadlift',
  pullup: 'pull-up',
  chinup: 'pull-up',
};

export function getExercise(id: string): Exercise | undefined {
  return EXERCISE_MAP[id] ?? EXERCISE_MAP[ALIASES[id] ?? ''];
}

export function getExerciseName(id: string): string {
  return getExercise(id)?.name ?? id;
}

export { EXERCISES };
export default EXERCISES;
