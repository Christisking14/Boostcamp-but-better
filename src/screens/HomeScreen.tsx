import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';

import { useWorkoutStore } from '../store/workoutStore';
import { PROGRAMS, getProgramById } from '../data/programs';
import { formatDate } from '../utils/calculations';
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../theme';
import type { RootStackParamList, TabParamList, Program } from '../types';

// ─── Navigation type ──────────────────────────────────────────────────────────

type HomeNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  StackNavigationProp<RootStackParamList>
>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatVolume(lbs: number): string {
  if (lbs >= 1_000_000) return `${(lbs / 1_000_000).toFixed(1)}M`;
  if (lbs >= 1_000) return `${(lbs / 1_000).toFixed(1)}k`;
  return `${lbs}`;
}

function formatDateSubtitle(): string {
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  useIsFocused(); // re-render when screen is focused

  const user                = useWorkoutStore((s) => s.user);
  const prs                 = useWorkoutStore((s) => s.prs);
  const getStreakDays       = useWorkoutStore((s) => s.getStreakDays);
  const getSessionsThisWeek = useWorkoutStore((s) => s.getSessionsThisWeek);

  const currentProgram   = user.currentProgramId ? getProgramById(user.currentProgramId) : null;
  const sessionsThisWeek = getSessionsThisWeek();
  const streak           = getStreakDays();
  const featuredPrograms = PROGRAMS.slice(0, 6);

  // Weekly volume (this week's sessions)
  const weeklyVolume = useMemo(
    () => sessionsThisWeek.reduce((sum, s) => sum + s.totalVolume, 0),
    [sessionsThisWeek],
  );

  // Recent PRs — last 14 days
  const recentPRs = useMemo(() => {
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    return prs.filter((pr) => new Date(pr.achievedAt).getTime() >= cutoff);
  }, [prs]);

  // Today's workout day
  const todayDay = useMemo(() => {
    if (!currentProgram) return null;
    const week = currentProgram.weeks[user.currentWeek - 1] ?? currentProgram.weeks[0];
    if (!week) return null;
    return week.days[user.currentDay] ?? week.days[0] ?? null;
  }, [currentProgram, user.currentWeek, user.currentDay]);

  // Next non-rest workout day (for "Up Next" section)
  const nextWorkoutDay = useMemo(() => {
    if (!currentProgram) return null;
    const week = currentProgram.weeks[user.currentWeek - 1] ?? currentProgram.weeks[0];
    if (!week) return null;
    for (let i = user.currentDay + 1; i < week.days.length; i++) {
      if (!week.days[i].isRestDay) return week.days[i];
    }
    return week.days.find((d) => !d.isRestDay) ?? null;
  }, [currentProgram, user.currentWeek, user.currentDay]);

  // The day to show on the hero card: today (if not rest) else next non-rest
  const activeDayForStart = (!todayDay || todayDay.isRestDay) ? nextWorkoutDay : todayDay;

  const weeklyGoal = currentProgram?.daysPerWeek ?? 3;

  function handleStartWorkout(dayId?: string) {
    if (!currentProgram) return;
    const week = currentProgram.weeks[user.currentWeek - 1] ?? currentProgram.weeks[0];
    const targetDayId = dayId ?? activeDayForStart?.id ?? week?.days.find((d) => !d.isRestDay)?.id;
    const targetDay   = week?.days.find((d) => d.id === targetDayId);
    if (!targetDay || targetDay.isRestDay) return;
    navigation.navigate('ActiveWorkout', {
      programId:   currentProgram.id,
      dayId:       targetDay.id,
      programName: currentProgram.name,
      dayName:     targetDay.name,
    });
  }

  // Weekly progress: sessions / goal (capped at 1)
  const weekProgress = Math.min(sessionsThisWeek.length / Math.max(weeklyGoal, 1), 1);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >

        {/* ── Hero Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{user.name || 'Athlete'}</Text>
            <Text style={styles.dateSub}>{formatDateSubtitle()}</Text>
          </View>
          <View style={styles.headerRight}>
            {/* Streak badge */}
            <View style={styles.streakBadge}>
              <Text style={styles.streakFlame}>🔥</Text>
              <Text style={styles.streakNumber}>{streak}</Text>
            </View>
            {/* Settings */}
            <Pressable
              style={styles.settingsBtn}
              onPress={() => navigation.navigate('Programs')}
              hitSlop={8}
            >
              <Ionicons name="settings-outline" size={21} color={Colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* ── Today's Workout Card ── */}
        {currentProgram && activeDayForStart ? (
          <View style={styles.section}>
            <LinearGradient
              colors={
                currentProgram.gradientColors ??
                ([currentProgram.accentColor + 'EE', currentProgram.accentColor + '55'] as [string, string])
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              {/* Top metadata row */}
              <View style={styles.heroTopRow}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>TODAY</Text>
                </View>
                <Text style={styles.heroWeekDay}>
                  Week {user.currentWeek} · Day {user.currentDay + 1}
                </Text>
              </View>

              {/* Program & day name */}
              <Text style={styles.heroProgram}>{currentProgram.name}</Text>
              <Text style={styles.heroDay}>{activeDayForStart.name}</Text>

              {/* Stats row */}
              <View style={styles.heroMeta}>
                <View style={styles.heroMetaItem}>
                  <Ionicons name="barbell-outline" size={14} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.heroMetaText}>
                    {activeDayForStart.exercises.length} exercise{activeDayForStart.exercises.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                {activeDayForStart.estimatedMinutes != null && (
                  <View style={styles.heroMetaItem}>
                    <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.heroMetaText}>
                      ~{activeDayForStart.estimatedMinutes} min
                    </Text>
                  </View>
                )}
                <View style={styles.heroMetaItem}>
                  <Ionicons name="trophy-outline" size={14} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.heroMetaText}>
                    {sessionsThisWeek.length}/{weeklyGoal} this week
                  </Text>
                </View>
              </View>

              {/* Weekly progress bar */}
              <View style={styles.heroProgressWrap}>
                <View style={styles.heroProgressBg}>
                  <View
                    style={[
                      styles.heroProgressFill,
                      { width: `${weekProgress * 100}%` as any },
                    ]}
                  />
                </View>
              </View>

              {/* CTA button */}
              <Pressable
                style={({ pressed }) => [styles.heroBtn, pressed && { opacity: 0.85 }]}
                onPress={() => handleStartWorkout(activeDayForStart.id)}
              >
                <Text style={styles.heroBtnText}>Start Workout</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.white} />
              </Pressable>
            </LinearGradient>
          </View>
        ) : (
          /* ── No program empty state ── */
          <View style={styles.section}>
            <View style={styles.noProgramCard}>
              <LinearGradient
                colors={['#7C6FFF22', '#7C6FFF08']}
                style={styles.noProgramIconWrap}
              >
                <Ionicons name="barbell-outline" size={36} color={Colors.accent} />
              </LinearGradient>
              <Text style={styles.noProgramTitle}>Choose Your Program</Text>
              <Text style={styles.noProgramSub}>
                Unlock structured training, progressive overload, and automatic progression tracking with a curated program.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.chooseProgramBtn, pressed && { opacity: 0.88 }]}
                onPress={() => navigation.navigate('Programs')}
              >
                <Text style={styles.chooseProgramText}>Browse Programs</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.white} />
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Weekly Summary Row ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.statsRow}>
            <WeeklyStatCard
              label="Sessions"
              value={`${sessionsThisWeek.length}`}
              sub={`/ ${weeklyGoal}`}
              accent={Colors.accent}
              icon="fitness-outline"
            />
            <WeeklyStatCard
              label="Volume"
              value={formatVolume(weeklyVolume)}
              sub={weeklyVolume >= 1000 ? 'lbs' : 'lbs'}
              accent={Colors.accentLight}
              icon="barbell-outline"
            />
            <WeeklyStatCard
              label="Streak"
              value={`${streak}`}
              sub="days"
              accent={Colors.premiumGold}
              icon="flame-outline"
              flame
            />
          </View>
        </View>

        {/* ── Recent PRs ── */}
        {recentPRs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent PRs 🏆</Text>
              <View style={styles.prCountBadge}>
                <Text style={styles.prCountText}>{recentPRs.length} new</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScroll}
            >
              {recentPRs.map((pr) => (
                <Pressable
                  key={pr.exerciseId}
                  style={({ pressed }) => [styles.prCard, pressed && { opacity: 0.85 }]}
                  onPress={() =>
                    navigation.navigate('ExerciseProgress', {
                      exerciseId:   pr.exerciseId,
                      exerciseName: pr.exerciseName,
                    })
                  }
                >
                  <LinearGradient
                    colors={['#FFB83022', '#C9975A14']}
                    style={styles.prGradient}
                  >
                    <View style={styles.prTopRow}>
                      <View style={styles.prBadge}>
                        <Text style={styles.prBadgeText}>NEW PR</Text>
                      </View>
                      <Ionicons name="trophy" size={14} color={Colors.premiumGold} />
                    </View>
                    <Text style={styles.prExercise} numberOfLines={2}>
                      {pr.exerciseName}
                    </Text>
                    <Text style={styles.prWeight}>
                      {pr.weight}
                      <Text style={styles.prUnit}> lbs</Text>
                    </Text>
                    <Text style={styles.prReps}>
                      × {pr.reps} {pr.reps === 1 ? 'rep' : 'reps'}
                    </Text>
                    <Text style={styles.prDate}>{formatDate(pr.achievedAt)}</Text>
                  </LinearGradient>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Up Next ── */}
        {currentProgram && nextWorkoutDay && nextWorkoutDay.id !== activeDayForStart?.id && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Up Next</Text>
            </View>
            <View style={styles.nextCard}>
              {/* Left accent bar */}
              <View style={[styles.nextAccentBar, { backgroundColor: currentProgram.accentColor }]} />
              <View style={styles.nextContent}>
                <View style={styles.nextLeft}>
                  <Text style={styles.nextDayName}>{nextWorkoutDay.name}</Text>
                  <Text style={styles.nextProgram}>{currentProgram.name}</Text>
                  <View style={styles.nextExercises}>
                    {nextWorkoutDay.exercises.slice(0, 3).map((pe) => (
                      <Text key={pe.exerciseId} style={styles.nextExercise} numberOfLines={1}>
                        · {pe.exerciseId.replace(/-/g, ' ')}
                      </Text>
                    ))}
                    {nextWorkoutDay.exercises.length > 3 && (
                      <Text style={styles.nextMore}>
                        +{nextWorkoutDay.exercises.length - 3} more
                      </Text>
                    )}
                  </View>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.nextStartBtn, pressed && { opacity: 0.8 }]}
                  onPress={() => handleStartWorkout(nextWorkoutDay.id)}
                >
                  <Text style={styles.nextStartText}>Start</Text>
                  <Ionicons name="arrow-forward" size={14} color={Colors.accent} />
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* ── Explore Programs ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Explore Programs</Text>
            <Pressable onPress={() => navigation.navigate('Programs')} hitSlop={8}>
              <Text style={styles.seeAll}>See all →</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScroll}
          >
            {featuredPrograms.map((program) => (
              <FeaturedProgramCard
                key={program.id}
                program={program}
                onPress={() => navigation.navigate('ProgramDetail', { programId: program.id })}
              />
            ))}
          </ScrollView>
        </View>

        {/* Bottom padding for tab bar */}
        <View style={{ height: Spacing['4xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface WeeklyStatCardProps {
  label: string;
  value: string;
  sub: string;
  accent: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  flame?: boolean;
}

function WeeklyStatCard({ label, value, sub, accent, icon, flame }: WeeklyStatCardProps) {
  return (
    <View style={[statStyles.card, Shadow.sm]}>
      <View style={[statStyles.iconWrap, { backgroundColor: accent + '18' }]}>
        {flame ? (
          <Text style={{ fontSize: 13 }}>🔥</Text>
        ) : (
          <Ionicons name={icon} size={13} color={accent} />
        )}
      </View>
      <View style={statStyles.valueRow}>
        <Text style={[statStyles.value, { color: accent }]}>{value}</Text>
        <Text style={statStyles.sub}>{sub}</Text>
      </View>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function FeaturedProgramCard({
  program,
  onPress,
}: {
  program: Program;
  onPress: () => void;
}) {
  const levelColors: Record<string, string> = {
    beginner:     Colors.success,
    intermediate: Colors.warning,
    advanced:     Colors.error,
  };
  return (
    <Pressable
      style={({ pressed }) => [featStyles.card, pressed && { opacity: 0.88 }]}
      onPress={onPress}
    >
      <LinearGradient
        colors={
          program.gradientColors ??
          ([program.accentColor + 'EE', program.accentColor + '44'] as [string, string])
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={featStyles.gradient}
      >
        {/* Level badge */}
        <View
          style={[
            featStyles.levelBadge,
            { backgroundColor: (levelColors[program.level] ?? Colors.accent) + '33' },
          ]}
        >
          <Text
            style={[
              featStyles.levelText,
              { color: levelColors[program.level] ?? Colors.accent },
            ]}
          >
            {program.level}
          </Text>
        </View>
        {/* Content pinned to bottom */}
        <View style={featStyles.bottom}>
          <Text style={featStyles.name} numberOfLines={2}>
            {program.name}
          </Text>
          <Text style={featStyles.meta}>
            {program.daysPerWeek}×/wk · {program.duration}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll:    { paddingBottom: 16 },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'flex-start',
    paddingHorizontal: Spacing.base,
    paddingTop:        Spacing.md,
    paddingBottom:     Spacing.lg,
  },
  headerLeft:  { flex: 1 },
  headerRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
    marginTop:     4,
  },
  greeting: {
    fontSize:   Typography.base,
    color:      Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  name: {
    fontSize:      Typography['2xl'],
    fontWeight:    Typography.heavy,
    color:         Colors.textPrimary,
    letterSpacing: Typography.tightTracking,
    marginTop:     2,
  },
  dateSub: {
    fontSize:   Typography.xs,
    color:      Colors.textTertiary,
    marginTop:  4,
    fontWeight: Typography.medium,
    letterSpacing: 0.2,
  },

  // Streak badge
  streakBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   Colors.premiumGold + '1A',
    borderWidth:       1,
    borderColor:       Colors.premiumGold + '40',
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.xs,
    borderRadius:      Radius.full,
    gap:               4,
  },
  streakFlame:  { fontSize: 15 },
  streakNumber: {
    fontSize:   Typography.md,
    fontWeight: Typography.bold,
    color:      Colors.premiumGold,
  },

  // Settings button
  settingsBtn: {
    width:           36,
    height:          36,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: Colors.card,
    borderRadius:    Radius.full,
    borderWidth:     1,
    borderColor:     Colors.border,
  },

  // ── Section layout ────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: Spacing.base,
    marginBottom:      Spacing.xl,
  },
  sectionHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   Spacing.md,
  },
  sectionTitle: {
    fontSize:     Typography.lg,
    fontWeight:   Typography.semibold,
    color:        Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  seeAll: {
    fontSize:     Typography.sm,
    color:        Colors.accent,
    fontWeight:   Typography.medium,
    marginBottom: Spacing.md,
  },

  // ── Hero card ─────────────────────────────────────────────────────────────
  heroCard: {
    borderRadius: Radius.xl,
    padding:      Spacing.xl,
    ...Shadow.accent,
  },
  heroTopRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   Spacing.sm,
  },
  heroBadge: {
    backgroundColor:   'rgba(255,255,255,0.20)',
    paddingHorizontal: Spacing.md,
    paddingVertical:   3,
    borderRadius:      Radius.full,
  },
  heroBadgeText: {
    fontSize:      Typography.xs,
    fontWeight:    Typography.bold,
    color:         Colors.white,
    letterSpacing: Typography.capsTracking,
  },
  heroWeekDay: {
    fontSize:   Typography.sm,
    color:      'rgba(255,255,255,0.72)',
    fontWeight: Typography.medium,
  },
  heroProgram: {
    fontSize:      Typography.sm,
    fontWeight:    Typography.medium,
    color:         'rgba(255,255,255,0.80)',
    letterSpacing: Typography.wideTracking,
    textTransform: 'uppercase',
    marginBottom:  4,
  },
  heroDay: {
    fontSize:      Typography['3xl'],
    fontWeight:    Typography.heavy,
    color:         Colors.white,
    letterSpacing: Typography.tightTracking,
    lineHeight:    38,
    marginBottom:  Spacing.sm,
  },
  heroMeta: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    gap:            Spacing.md,
    marginBottom:   Spacing.md,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           5,
  },
  heroMetaText: {
    fontSize:   Typography.sm,
    color:      'rgba(255,255,255,0.85)',
    fontWeight: Typography.medium,
  },

  // Progress bar inside hero card
  heroProgressWrap: {
    marginBottom: Spacing.md,
  },
  heroProgressBg: {
    height:          4,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius:    Radius.full,
    overflow:        'hidden',
  },
  heroProgressFill: {
    height:          4,
    backgroundColor: Colors.white,
    borderRadius:    Radius.full,
    minWidth:        4,
  },

  // CTA button
  heroBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               8,
    backgroundColor:   'rgba(255,255,255,0.18)',
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.30)',
    borderRadius:      Radius.lg,
    paddingVertical:   Spacing.md,
    marginTop:         Spacing.xs,
  },
  heroBtnText: {
    fontSize:   Typography.md,
    fontWeight: Typography.bold,
    color:      Colors.white,
  },

  // ── No program empty state ────────────────────────────────────────────────
  noProgramCard: {
    backgroundColor: Colors.card,
    borderRadius:    Radius.xl,
    borderWidth:     1,
    borderColor:     Colors.border,
    padding:         Spacing.xl,
    alignItems:      'center',
  },
  noProgramIconWrap: {
    width:           72,
    height:          72,
    alignItems:      'center',
    justifyContent:  'center',
    borderRadius:    Radius.full,
    marginBottom:    Spacing.base,
  },
  noProgramTitle: {
    fontSize:     Typography.xl,
    fontWeight:   Typography.bold,
    color:        Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign:    'center',
  },
  noProgramSub: {
    fontSize:          Typography.sm,
    color:             Colors.textSecondary,
    textAlign:         'center',
    lineHeight:        21,
    paddingHorizontal: Spacing.md,
    marginBottom:      Spacing.lg,
  },
  chooseProgramBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    backgroundColor:   Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical:   Spacing.md,
    borderRadius:      Radius.full,
    ...Shadow.accent,
  },
  chooseProgramText: {
    fontSize:   Typography.base,
    fontWeight: Typography.semibold,
    color:      Colors.white,
  },

  // ── Weekly stats row ──────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap:           Spacing.sm,
  },

  // ── PR section ────────────────────────────────────────────────────────────
  prCountBadge: {
    backgroundColor:   Colors.premiumGold + '22',
    borderWidth:       1,
    borderColor:       Colors.premiumGold + '44',
    paddingHorizontal: Spacing.sm,
    paddingVertical:   3,
    borderRadius:      Radius.full,
    marginBottom:      Spacing.md,
  },
  prCountText: {
    fontSize:   Typography.xs,
    fontWeight: Typography.bold,
    color:      Colors.premiumGold,
  },
  hScroll: { paddingRight: Spacing.base },
  prCard: {
    width:        156,
    borderRadius: Radius.lg,
    overflow:     'hidden',
    marginRight:  Spacing.sm,
    borderWidth:  1,
    borderColor:  Colors.premiumGold + '30',
    ...Shadow.gold,
  },
  prGradient: {
    padding: Spacing.md,
    gap:     Spacing.xs,
  },
  prTopRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   Spacing.xs,
  },
  prBadge: {
    backgroundColor: Colors.premiumGold,
    paddingHorizontal: 7,
    paddingVertical:   2,
    borderRadius:    Radius.xs,
  },
  prBadgeText: {
    fontSize:      Typography.xs,
    fontWeight:    Typography.black,
    color:         Colors.black,
    letterSpacing: Typography.capsTracking,
  },
  prExercise: {
    fontSize:      Typography.base,
    fontWeight:    Typography.bold,
    color:         Colors.textPrimary,
    textTransform: 'capitalize',
  },
  prWeight: {
    fontSize:      Typography.xl,
    fontWeight:    Typography.heavy,
    color:         Colors.premiumGold,
    letterSpacing: Typography.tightTracking,
  },
  prUnit: {
    fontSize:   Typography.sm,
    fontWeight: Typography.regular,
    color:      Colors.textSecondary,
  },
  prReps: {
    fontSize:   Typography.sm,
    color:      Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  prDate: {
    fontSize:  Typography.xs,
    color:     Colors.textTertiary,
    marginTop: 2,
  },

  // ── Up Next card ──────────────────────────────────────────────────────────
  nextCard: {
    backgroundColor: Colors.card,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    borderColor:     Colors.border,
    flexDirection:   'row',
    overflow:        'hidden',
    ...Shadow.sm,
  },
  nextAccentBar: {
    width: 4,
  },
  nextContent: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    padding:       Spacing.base,
    gap:           Spacing.md,
  },
  nextLeft:    { flex: 1 },
  nextDayName: {
    fontSize:   Typography.md,
    fontWeight: Typography.bold,
    color:      Colors.textPrimary,
  },
  nextProgram: {
    fontSize:     Typography.xs,
    color:        Colors.textTertiary,
    marginTop:    2,
    marginBottom: Spacing.sm,
    fontWeight:   Typography.medium,
  },
  nextExercises: { gap: 3 },
  nextExercise: {
    fontSize:      Typography.sm,
    color:         Colors.textSecondary,
    textTransform: 'capitalize',
  },
  nextMore: {
    fontSize:   Typography.xs,
    color:      Colors.accent,
    fontWeight: Typography.medium,
    marginTop:  2,
  },
  nextStartBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    backgroundColor:   Colors.accentMuted,
    borderWidth:       1,
    borderColor:       Colors.accent + '55',
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.sm,
    borderRadius:      Radius.lg,
  },
  nextStartText: {
    fontSize:   Typography.sm,
    fontWeight: Typography.bold,
    color:      Colors.accent,
  },
});

// ── Weekly stat card styles ───────────────────────────────────────────────────

const statStyles = StyleSheet.create({
  card: {
    flex:            1,
    backgroundColor: Colors.card,
    borderRadius:    Radius.lg,
    padding:         Spacing.md,
    borderWidth:     1,
    borderColor:     Colors.border,
    gap:             Spacing['2xs'],
  },
  iconWrap: {
    width:           26,
    height:          26,
    alignItems:      'center',
    justifyContent:  'center',
    borderRadius:    Radius.sm,
    marginBottom:    Spacing['2xs'],
  },
  valueRow: {
    flexDirection: 'row',
    alignItems:    'baseline',
    gap:           3,
  },
  value: {
    fontSize:      Typography['2xl'],
    fontWeight:    Typography.heavy,
    letterSpacing: Typography.tightTracking,
  },
  sub: {
    fontSize:   Typography.sm,
    fontWeight: Typography.medium,
    color:      Colors.textSecondary,
  },
  label: {
    fontSize:   Typography.xs,
    color:      Colors.textTertiary,
    fontWeight: Typography.medium,
    marginTop:  2,
    letterSpacing: 0.3,
  },
});

// ── Featured program card styles ──────────────────────────────────────────────

const featStyles = StyleSheet.create({
  card: {
    width:        180,
    height:       110,
    borderRadius: Radius.lg,
    overflow:     'hidden',
    marginRight:  Spacing.sm,
    ...Shadow.md,
  },
  gradient: {
    flex:    1,
    padding: Spacing.md,
  },
  levelBadge: {
    alignSelf:         'flex-start',
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      Radius.full,
  },
  levelText: {
    fontSize:      Typography.xs,
    fontWeight:    Typography.bold,
    textTransform: 'capitalize',
  },
  bottom: {
    position: 'absolute',
    left:     Spacing.md,
    right:    Spacing.md,
    bottom:   Spacing.md,
  },
  name: {
    fontSize:   Typography.base,
    fontWeight: Typography.bold,
    color:      Colors.white,
    lineHeight: 20,
  },
  meta: {
    fontSize:  Typography.xs,
    color:     'rgba(255,255,255,0.78)',
    marginTop: 2,
  },
});
