import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';

import { getProgramById } from '../data/programs';
import { getExercise } from '../data/exercises';
import { useWorkoutStore } from '../store/workoutStore';
import { Colors, Radius, Spacing, Typography } from '../theme';
import type { RootStackParamList, WorkoutDay } from '../types';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'ProgramDetail'>;
  route: RouteProp<RootStackParamList, 'ProgramDetail'>;
};

const LEVEL_COLORS: Record<string, string> = {
  beginner: Colors.success,
  intermediate: Colors.warning,
  advanced: Colors.error,
};

export default function ProgramDetailScreen({ navigation, route }: Props) {
  const { programId } = route.params;
  const program = getProgramById(programId);

  const user = useWorkoutStore((s) => s.user);
  const setCurrentProgram = useWorkoutStore((s) => s.setCurrentProgram);

  const [selectedWeek, setSelectedWeek] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);

  if (!program) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.error}>Program not found</Text>
      </SafeAreaView>
    );
  }

  const isEnrolled = user.currentProgramId === program.id;
  const isLocked = program.isPremium && !user.isPremium;
  const week = program.weeks[selectedWeek] ?? program.weeks[0];

  function handleStartProgram() {
    if (isLocked) {
      navigation.navigate('Paywall', { feature: program!.name });
      return;
    }
    setCurrentProgram(program!.id);
    const firstDay = week?.days.find((d) => !d.isRestDay);
    if (firstDay) {
      navigation.navigate('ActiveWorkout', {
        programId: program!.id,
        dayId: firstDay.id,
        programName: program!.name,
        dayName: firstDay.name,
      });
    }
  }

  function handleStartDay(day: WorkoutDay) {
    if (isLocked) {
      navigation.navigate('Paywall', { feature: program!.name });
      return;
    }
    if (!isEnrolled) {
      setCurrentProgram(program!.id);
    }
    navigation.navigate('ActiveWorkout', {
      programId: program!.id,
      dayId: day.id,
      programName: program!.name,
      dayName: day.name,
    });
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <LinearGradient
          colors={[program.accentColor, program.accentColor + '44', Colors.background]}
          style={styles.hero}
        >
          <SafeAreaView edges={['top']}>
            <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={24} color={Colors.white} />
            </Pressable>
          </SafeAreaView>
          <View style={styles.heroContent}>
            {isLocked && (
              <View style={styles.premiumBadge}>
                <Ionicons name="lock-closed" size={12} color={Colors.premiumGold} />
                <Text style={styles.premiumBadgeText}>PRO</Text>
              </View>
            )}
            <Text style={styles.programName}>{program.name}</Text>
            <Text style={styles.programAuthor}>by {program.author}</Text>
          </View>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatItem icon="calendar" label="Days/Week" value={`${program.daysPerWeek}x`} />
          <StatItem icon="time" label="Duration" value={program.duration} />
          <StatItem icon="trending-up" label="Level" value={program.level} color={LEVEL_COLORS[program.level]} />
          <StatItem icon="barbell" label="Equipment" value={program.equipment[0] ?? 'Various'} />
        </View>

        {/* Tags */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
          {program.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description} numberOfLines={descExpanded ? undefined : 3}>
            {program.description}
          </Text>
          <Pressable onPress={() => setDescExpanded(!descExpanded)}>
            <Text style={styles.expandBtn}>{descExpanded ? 'Show less' : 'Show more'}</Text>
          </Pressable>
        </View>

        {/* Week Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekScroll}>
            {program.weeks.map((w, i) => (
              <Pressable
                key={i}
                style={[styles.weekTab, selectedWeek === i && styles.weekTabActive]}
                onPress={() => setSelectedWeek(i)}
              >
                <Text style={[styles.weekTabText, selectedWeek === i && styles.weekTabTextActive]}>
                  Week {w.weekNumber}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Days */}
        <View style={[styles.section, styles.daysSection]}>
          {week?.days.map((day, dayIndex) => (
            <View key={day.id} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <View style={styles.dayNumberBadge}>
                  <Text style={styles.dayNumber}>D{dayIndex + 1}</Text>
                </View>
                <Text style={styles.dayName}>{day.name}</Text>
                {!day.isRestDay && day.estimatedMinutes && (
                  <View style={styles.timeBadge}>
                    <Ionicons name="time-outline" size={12} color={Colors.textTertiary} />
                    <Text style={styles.timeText}>{day.estimatedMinutes}m</Text>
                  </View>
                )}
              </View>

              {day.isRestDay ? (
                <View style={styles.restDay}>
                  <Ionicons name="moon-outline" size={20} color={Colors.textTertiary} />
                  <Text style={styles.restText}>Rest & Recovery</Text>
                </View>
              ) : (
                <>
                  {day.exercises.map((pe) => {
                    const ex = getExercise(pe.exerciseId);
                    const setScheme = pe.sets[0];
                    return (
                      <View key={pe.exerciseId} style={styles.exerciseRow}>
                        <View style={styles.exerciseDot} />
                        <View style={styles.exerciseInfo}>
                          <Text style={styles.exerciseName}>
                            {ex?.name ?? pe.exerciseId}
                          </Text>
                          <Text style={styles.exerciseSets}>
                            {pe.sets.length} × {setScheme?.reps}
                            {setScheme?.weightNote ? ` @ ${setScheme.weightNote}` : ''}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                  <Pressable style={styles.startDayBtn} onPress={() => handleStartDay(day)}>
                    <Ionicons name="play" size={14} color={program.accentColor} />
                    <Text style={[styles.startDayText, { color: program.accentColor }]}>
                      Start Workout
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* CTA Button */}
      <View style={styles.ctaContainer}>
        <Pressable
          style={[styles.ctaBtn, { backgroundColor: isLocked ? Colors.premiumGold : program.accentColor }]}
          onPress={handleStartProgram}
        >
          {isLocked && <Ionicons name="lock-open" size={18} color={Colors.white} />}
          <Text style={styles.ctaBtnText}>
            {isLocked ? 'Unlock with Pro' : isEnrolled ? 'Continue Program' : 'Start Program'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function StatItem({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={statStyles.item}>
      <Ionicons name={icon} size={18} color={color ?? Colors.textSecondary} />
      <Text style={[statStyles.value, color ? { color } : {}]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 120 },
  error: { color: Colors.error, textAlign: 'center', marginTop: 40, fontSize: Typography.base },
  hero: { paddingBottom: Spacing.xl, minHeight: 220 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    margin: Spacing.base,
  },
  heroContent: { paddingHorizontal: Spacing.base },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.premiumGold + '33',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
  },
  premiumBadgeText: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.premiumGold },
  programName: { fontSize: Typography['3xl'], fontWeight: Typography.black, color: Colors.white },
  programAuthor: { fontSize: Typography.base, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
  },
  tagsScroll: { paddingLeft: Spacing.base, marginBottom: Spacing.base },
  tag: {
    backgroundColor: Colors.card,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagText: { fontSize: Typography.xs, color: Colors.textSecondary },
  section: { paddingHorizontal: Spacing.base, marginBottom: Spacing.xl },
  daysSection: { gap: Spacing.md },
  sectionTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.textPrimary, marginBottom: Spacing.md },
  description: { fontSize: Typography.base, color: Colors.textSecondary, lineHeight: 22 },
  expandBtn: { fontSize: Typography.sm, color: Colors.accent, marginTop: Spacing.sm, fontWeight: Typography.medium },
  weekScroll: { marginBottom: Spacing.sm },
  weekTab: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  weekTabActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  weekTabText: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textSecondary },
  weekTabTextActive: { color: Colors.white },
  dayCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  dayNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textSecondary },
  dayName: { flex: 1, fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  timeBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeText: { fontSize: Typography.xs, color: Colors.textTertiary },
  restDay: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  restText: { fontSize: Typography.base, color: Colors.textTertiary },
  exerciseRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  exerciseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent, marginTop: 6 },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: Typography.base, color: Colors.textPrimary },
  exerciseSets: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 2 },
  startDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  startDayText: { fontSize: Typography.sm, fontWeight: Typography.semibold },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.base,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  ctaBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 2,
    borderRadius: Radius.full,
  },
  ctaBtnText: { fontSize: Typography.md, fontWeight: Typography.bold, color: Colors.white },
});

const statStyles = StyleSheet.create({
  item: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  value: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary, textTransform: 'capitalize' },
  label: { fontSize: Typography.xs, color: Colors.textTertiary },
});
