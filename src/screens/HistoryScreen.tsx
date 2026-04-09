import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useWorkoutStore } from '../store/workoutStore';
import { formatDate, formatDuration, formatWeight } from '../utils/calculations';
import { Colors, Radius, Spacing, Typography } from '../theme';
import type { WorkoutSession, CompletedSet } from '../types';

export default function HistoryScreen() {
  const sessions = useWorkoutStore((s) => s.sessions);
  const getSessionsThisWeek = useWorkoutStore((s) => s.getSessionsThisWeek);
  const getTotalVolume = useWorkoutStore((s) => s.getTotalVolume);
  const getStreakDays = useWorkoutStore((s) => s.getStreakDays);
  const unitSystem = useWorkoutStore((s) => s.user.unitSystem);

  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);

  const sessionsThisWeek = getSessionsThisWeek().length;
  const totalVolume = getTotalVolume();
  const streak = getStreakDays();

  // Sort newest first
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>{sessions.length} workouts logged</Text>
      </View>

      {/* Stats Banner */}
      <View style={styles.statsRow}>
        <StatBadge label="This week" value={sessionsThisWeek.toString()} icon="calendar" />
        <StatBadge label="Streak" value={`${streak} days`} icon="flame" color="#F59E0B" />
        <StatBadge label="Total volume" value={formatVolume(totalVolume)} icon="trending-up" color={Colors.info} />
      </View>

      {/* Session List */}
      <FlatList
        data={sorted}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        renderItem={({ item: session }) => (
          <Pressable style={styles.sessionCard} onPress={() => setSelectedSession(session)}>
            <View style={styles.sessionLeft}>
              <Text style={styles.sessionDay}>{session.dayName}</Text>
              <Text style={styles.sessionProgram}>{session.programName ?? 'Custom Workout'}</Text>
              <View style={styles.sessionMeta}>
                <View style={styles.sessionMetaItem}>
                  <Ionicons name="time-outline" size={12} color={Colors.textTertiary} />
                  <Text style={styles.sessionMetaText}>{formatDuration(session.durationSeconds)}</Text>
                </View>
                <View style={styles.sessionMetaItem}>
                  <Ionicons name="barbell-outline" size={12} color={Colors.textTertiary} />
                  <Text style={styles.sessionMetaText}>{session.completedSets.length} sets</Text>
                </View>
                <View style={styles.sessionMetaItem}>
                  <Ionicons name="trending-up-outline" size={12} color={Colors.textTertiary} />
                  <Text style={styles.sessionMetaText}>{formatVolume(session.totalVolume)} lbs</Text>
                </View>
              </View>
            </View>
            <View style={styles.sessionRight}>
              <Text style={styles.sessionDate}>{formatDate(session.startedAt)}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={56} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No workouts yet</Text>
            <Text style={styles.emptySub}>Complete your first workout to see it here</Text>
          </View>
        }
      />

      {/* Session Detail Modal */}
      <Modal
        visible={selectedSession !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedSession(null)}
      >
        {selectedSession && (
          <SessionDetailModal
            session={selectedSession}
            unitSystem={unitSystem}
            onClose={() => setSelectedSession(null)}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

function StatBadge({
  label,
  value,
  icon,
  color = Colors.accent,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
}) {
  return (
    <View style={badgeStyles.container}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={badgeStyles.value}>{value}</Text>
      <Text style={badgeStyles.label}>{label}</Text>
    </View>
  );
}

function SessionDetailModal({
  session,
  unitSystem,
  onClose,
}: {
  session: WorkoutSession;
  unitSystem: 'imperial' | 'metric';
  onClose: () => void;
}) {
  // Group sets by exercise
  const byExercise: Record<string, CompletedSet[]> = {};
  for (const set of session.completedSets) {
    if (!byExercise[set.exerciseId]) byExercise[set.exerciseId] = [];
    byExercise[set.exerciseId].push(set);
  }

  return (
    <SafeAreaView style={modalStyles.container} edges={['top', 'bottom']}>
      <View style={modalStyles.header}>
        <View>
          <Text style={modalStyles.dayName}>{session.dayName}</Text>
          <Text style={modalStyles.date}>{formatDate(session.startedAt)}</Text>
        </View>
        <Pressable onPress={onClose} style={modalStyles.closeBtn}>
          <Ionicons name="close" size={22} color={Colors.textPrimary} />
        </Pressable>
      </View>

      {/* Quick stats */}
      <View style={modalStyles.statsRow}>
        <View style={modalStyles.statItem}>
          <Text style={modalStyles.statValue}>{formatDuration(session.durationSeconds)}</Text>
          <Text style={modalStyles.statLabel}>Duration</Text>
        </View>
        <View style={modalStyles.statDivider} />
        <View style={modalStyles.statItem}>
          <Text style={modalStyles.statValue}>{session.completedSets.length}</Text>
          <Text style={modalStyles.statLabel}>Sets</Text>
        </View>
        <View style={modalStyles.statDivider} />
        <View style={modalStyles.statItem}>
          <Text style={modalStyles.statValue}>{formatVolume(session.totalVolume)}</Text>
          <Text style={modalStyles.statLabel}>Volume (lbs)</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={modalStyles.scroll}>
        {Object.entries(byExercise).map(([exerciseId, sets]) => (
          <View key={exerciseId} style={modalStyles.exerciseBlock}>
            <Text style={modalStyles.exerciseName}>{sets[0]?.exerciseName ?? exerciseId}</Text>
            <View style={modalStyles.setHeader}>
              <Text style={modalStyles.setHeaderText}>SET</Text>
              <Text style={modalStyles.setHeaderText}>REPS</Text>
              <Text style={modalStyles.setHeaderText}>WEIGHT</Text>
            </View>
            {sets.map((set, i) => (
              <View key={i} style={modalStyles.setRow}>
                <Text style={modalStyles.setNum}>{i + 1}</Text>
                <Text style={modalStyles.setVal}>{set.reps}</Text>
                <Text style={modalStyles.setVal}>
                  {formatWeight(set.weight, unitSystem)}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatVolume(lbs: number): string {
  if (lbs >= 1_000_000) return `${(lbs / 1_000_000).toFixed(1)}M`;
  if (lbs >= 1_000) return `${(lbs / 1_000).toFixed(0)}k`;
  return lbs.toFixed(0);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.base, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  title: { fontSize: Typography['2xl'], fontWeight: Typography.bold, color: Colors.textPrimary },
  subtitle: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  list: { paddingHorizontal: Spacing.base, paddingBottom: 100, gap: Spacing.sm },
  sessionCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sessionLeft: { flex: 1, gap: 4 },
  sessionRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sessionDay: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  sessionProgram: { fontSize: Typography.xs, color: Colors.textTertiary },
  sessionMeta: { flexDirection: 'row', gap: Spacing.md, marginTop: 2 },
  sessionMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sessionMetaText: { fontSize: Typography.xs, color: Colors.textTertiary },
  sessionDate: { fontSize: Typography.xs, color: Colors.textSecondary },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.textPrimary },
  emptySub: { fontSize: Typography.base, color: Colors.textTertiary, textAlign: 'center', paddingHorizontal: Spacing.xl },
});

const badgeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  value: { fontSize: Typography.md, fontWeight: Typography.bold, color: Colors.textPrimary },
  label: { fontSize: Typography.xs, color: Colors.textTertiary, textAlign: 'center' },
});

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dayName: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  date: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: Colors.border },
  statValue: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  statLabel: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 2 },
  scroll: { padding: Spacing.base, paddingBottom: 60, gap: Spacing.xl },
  exerciseBlock: { gap: Spacing.sm },
  exerciseName: { fontSize: Typography.md, fontWeight: Typography.semibold, color: Colors.textPrimary },
  setHeader: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.sm,
  },
  setHeaderText: { flex: 1, fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textTertiary, textAlign: 'center' },
  setRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  setNum: { flex: 1, textAlign: 'center', color: Colors.textTertiary, fontSize: Typography.sm },
  setVal: { flex: 1, textAlign: 'center', color: Colors.textPrimary, fontSize: Typography.sm, fontWeight: Typography.medium },
});
