import type { CompletedSet, UnitSystem } from '../types';

// ─── Standard plate denominations (lbs, heaviest first) ──────────────────────
const STANDARD_PLATES: number[] = [45, 35, 25, 10, 5, 2.5];

// ─── 1-Rep Max ───────────────────────────────────────────────────────────────

/**
 * Estimate 1-rep max using the Brzycki formula:
 *   1RM = weight × 36 / (37 − reps)
 *
 * Returns `weight` unchanged when reps === 1, and clamps reps to a maximum
 * of 36 (the formula breaks down at 37+).
 */
export function calculate1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  const clampedReps = Math.min(reps, 36);
  const oneRM = weight * (36 / (37 - clampedReps));
  return Math.round(oneRM * 10) / 10;
}

// ─── Plate Calculator ────────────────────────────────────────────────────────

/**
 * Given a target barbell weight and the weight of the bar itself, return an
 * array of plate weights to load on **each side** of the bar.
 *
 * Example: calculatePlates(135, 45) → [45]  (one 45 lb plate per side)
 *
 * Returns an empty array when the target cannot be reached with standard
 * plates or when the remaining weight after subtracting the bar is negative.
 */
export function calculatePlates(targetWeight: number, barWeight: number): number[] {
  const remaining = targetWeight - barWeight;
  if (remaining <= 0) return [];

  const perSide = remaining / 2;
  const plates: number[] = [];
  let left = perSide;

  for (const plate of STANDARD_PLATES) {
    while (left >= plate - 0.001) {
      plates.push(plate);
      left = Math.round((left - plate) * 1000) / 1000;
    }
  }

  return plates;
}

// ─── Unit Conversions ────────────────────────────────────────────────────────

/** Convert kilograms to pounds, rounded to one decimal place. */
export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

/** Convert pounds to kilograms, rounded to one decimal place. */
export function lbsToKg(lbs: number): number {
  return Math.round((lbs / 2.20462) * 10) / 10;
}

// ─── Formatting ──────────────────────────────────────────────────────────────

/**
 * Format a weight value with its unit label.
 * Uses up to one decimal place and strips trailing ".0".
 *
 * Examples: formatWeight(135, 'imperial') → "135 lbs"
 *           formatWeight(61.2, 'metric')  → "61.2 kg"
 */
export function formatWeight(weight: number, unit: UnitSystem): string {
  const rounded = Math.round(weight * 10) / 10;
  const display = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
  return unit === 'imperial' ? `${display} lbs` : `${display} kg`;
}

/**
 * Format a duration in seconds into a human-readable string.
 *
 * Examples: formatDuration(4980) → "1h 23m"
 *           formatDuration(2700) → "45m"
 *           formatDuration(30)   → "0m"
 */
export function formatDuration(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format an ISO date string into a short, human-friendly label.
 *
 * - "Today" if the date is today
 * - "Yesterday" if the date was yesterday
 * - "Apr 7" otherwise
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();

  const toMidnight = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const daysDiff =
    (toMidnight(now).getTime() - toMidnight(date).getTime()) /
    (1000 * 60 * 60 * 24);

  if (daysDiff === 0) return 'Today';
  if (daysDiff === 1) return 'Yesterday';

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

// ─── Volume ──────────────────────────────────────────────────────────────────

/**
 * Sum weight × reps across all provided sets.
 */
export function calculateTotalVolume(sets: CompletedSet[]): number {
  return sets.reduce((total, set) => total + set.weight * set.reps, 0);
}

// ─── Week Number ─────────────────────────────────────────────────────────────

/**
 * Return the ISO 8601 week number (1–53) for the given date.
 * Week 1 is the week containing the first Thursday of the year
 * (equivalently, the week containing 4 January).
 */
export function getWeekNumber(date: Date): number {
  const target = new Date(date);
  // Set to nearest Thursday: current date + 4 - current day number (Sun=0)
  const dayNr = (date.getDay() + 6) % 7; // Mon=0 … Sun=6
  target.setDate(date.getDate() - dayNr + 3);

  const firstThursday = new Date(target.getFullYear(), 0, 1);
  const firstThursdayDay = (firstThursday.getDay() + 6) % 7;
  if (firstThursdayDay !== 3) {
    firstThursday.setDate(1 + ((3 - firstThursdayDay + 7) % 7));
  }

  const weekNumber =
    1 +
    Math.round(
      (target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );

  return weekNumber;
}
