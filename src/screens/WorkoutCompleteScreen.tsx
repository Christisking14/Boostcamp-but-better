import React, { useEffect, useRef } from 'react';
import {
  Animated,
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

import { useWorkoutStore } from '../store/workoutStore';
import { formatDuration, formatWeight } from '../utils/calculations';
import { Colors, Radius, Spacing, Typography } from '../theme';
import type { RootStackParamList, CompletedSet } from '../types';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'WorkoutComplete'>;
  route: RouteProp<RootStackParamList, 'WorkoutComplete'>;
};

const MOTIVATIONAL_QUOTES = [
  'Every rep counts. Every session matters.',
  "You didn't come this far to only come this far.",
  'Consistency beats perfection every time.',
  "The only bad workout is the one that didn't happen.",
  'Strength is built one session at a time.',
  'Progress is progress, no matter how small.',
  'Champions are made in the moments when they want to quit.',
  'Hard work always beats talent when talent refuses to work hard.',
  'The pain you feel today is the strength you feel tomorrow.',
  'Results happen over time, not overnight.',
];

export default function WorkoutCompleteScreen({ navigation, route }: Props) {
  const { sessionId } = route.params;
  const sessions = useWorkoutStore((s) => s.sessions);
  const prs = useWorkoutStore((s) => s.prs);
  const unitSystem = useWorkoutStore((s) => s.user.unitSystem);

  const session = sessions.find((s) => s.id === sessionId);

  // Animation
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];

  if (!session) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Text style={styles.error}>Session not found</Text>
        <Pressable style={styles.doneBtn} onPress={() => navigation.navigate('Main')}>
          <Text style={styles.doneBtnText}>Back to Home</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // Group sets by exercise
  const byExercise: Record<string, CompletedSet[]> = {};
  for (const set of session.completedSets) {
    if (!byExercise[set.exerciseId]) byExercise[set.exerciseId] = [];
    byExercise[set.exerciseId].push(set);
  }

  // Find new PRs from this session (within the last 10 seconds of it completing)
  const sessionNewPRs = prs.filter((pr) => {
    if (!session.completedAt) return false;
    const prTime = new Date(pr.achievedAt).getTime();
    const sessionEnd = new Date(session.completedAt).getTime();
    return Math.abs(prTime - sessionEnd) < 30_000;
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.accent + '22', Colors.background]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <SafeAreaView edges={['top']}>
          <View style={styles.celebration}>
            <Animated.View style={[styles.trophyWrap, { transform: [{ scale: scaleAnim }] }]}>
              <Ionicons name="trophy" size={64} color={Colors.premiumGold} />
            </Animated.View>
            <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
              <Text style={styles.completeTitle}>Workout Complete!</Text>
              <Text style={styles.sessionName}>{session.dayName}</Text>
            </Animated.View>
          </View>
        </SafeAreaView>

        {/* Session Stats */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="time"
            label="Duration"
            value={formatDuration(session.durationSeconds)}
            color={Colors.accent}
          />
          <StatCard
            icon="barbell"
            label="Sets Done"
            value={session.completedSets.length.toString()}
            color={Colors.info}
          />
          <StatCard
            icon="trending-up"
            label="Volume"
            value={formatVolume(session.totalVolume)}
            color={Colors.success}
          />
          {sessionNewPRs.length > 0 && (
            <StatCard
              icon="star"
              label="New PRs"
              value={sessionNewPRs.length.toString()}
              color={Colors.premiumGold}
            />
          )}
        </View>

        {/* New PRs */}
        {sessionNewPRs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>New Personal Records</Text>
            {sessionNewPRs.map((pr) => (
              <View key={pr.exerciseId} style={styles.prCard}>
                <Ionicons name="star" size={16} color={Colors.premiumGold} />
                <View style={styles.prInfo}>
                  <Text style={styles.prName}>{pr.exerciseName}</Text>
                  <Text style={styles.prValue}>
                    {formatWeight(pr.weight, unitSystem)} × {pr.reps} reps
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Exercise Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercises Completed</Text>
          {Object.entries(byExercise).map(([exerciseId, sets]) => {
            const maxWeight = Math.max(...sets.map((s) => s.weight));
            return (
              <View key={exerciseId} style={styles.exerciseRow}>
                <View style={styles.exerciseLeft}>
                  <Text style={styles.exerciseName}>{sets[0]?.exerciseName ?? exerciseId}</Text>
                  <Text style={styles.exerciseSets}>{sets.length} sets</Text>
                </View>
                {maxWeight > 0 && (
                  <Text style={styles.exerciseWeight}>{formatWeight(maxWeight, unitSystem)}</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Quote */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>"{quote}"</Text>
        </View>
      </ScrollView>

      {/* Done Button */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <Pressable
          style={styles.doneBtn}
          onPress={() => navigation.navigate('Main')}
        >
          <Text style={styles.doneBtnText}>Back to Home</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={statStyles.card}>
      <View style={[statStyles.iconWrap, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function formatVolume(lbs: number): string {
  if (lbs >= 1_000) return `${(lbs / 1_000).toFixed(1)}k`;
  return lbs.toFixed(0);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 120 },
  celebration: { alignItems: 'center', paddingVertical: Spacing['3xl'] },
  trophyWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.premiumGold + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  completeTitle: { fontSize: Typography['3xl'], fontWeight: Typography.black, color: Colors.textPrimary, marginBottom: 8 },
  sessionName: { fontSize: Typography.lg, color: Colors.textSecondary },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  section: { paddingHorizontal: Spacing.base, marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Typography.md, fontWeight: Typography.semibold, color: Colors.textPrimary, marginBottom: Spacing.md },
  prCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.premiumGold + '11',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.premiumGold + '33',
  },
  prInfo: { flex: 1 },
  prName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  prValue: { fontSize: Typography.sm, color: Colors.premiumGold, marginTop: 2 },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  exerciseLeft: { gap: 2 },
  exerciseName: { fontSize: Typography.base, color: Colors.textPrimary },
  exerciseSets: { fontSize: Typography.xs, color: Colors.textTertiary },
  exerciseWeight: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.accent },
  quoteCard: {
    marginHorizontal: Spacing.base,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quoteText: { fontSize: Typography.base, color: Colors.textSecondary, lineHeight: 22, fontStyle: 'italic', textAlign: 'center' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  doneBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  doneBtnText: { fontSize: Typography.md, fontWeight: Typography.bold, color: Colors.white },
  error: { color: Colors.error, textAlign: 'center', marginTop: 60, fontSize: Typography.base },
});

const statStyles = StyleSheet.create({
  card: {
    width: '47%',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  label: { fontSize: Typography.xs, color: Colors.textTertiary },
});
