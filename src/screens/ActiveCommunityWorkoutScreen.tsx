/**
 * ActiveCommunityWorkoutScreen
 *
 * Runs a community-shared workout using the same logging mechanics as
 * ActiveWorkoutScreen but driven by a CommunityWorkout object instead
 * of a program/day reference.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';

import { useWorkoutStore } from '../store/workoutStore';
import { Colors, Radius, Spacing, Typography } from '../theme';
import type { RootStackParamList } from '../types';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'ActiveCommunityWorkout'>;
  route: RouteProp<RootStackParamList, 'ActiveCommunityWorkout'>;
};

interface LoggedSet {
  reps: string;
  weight: string;
}

interface ExerciseState {
  exerciseId: string;
  exerciseName: string;
  targetSets: number;
  targetReps: string;
  notes: string;
  loggedSets: LoggedSet[];
}

const DEFAULT_REST = 90;

function formatElapsed(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':');
}

function formatRest(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function ActiveCommunityWorkoutScreen({ navigation, route }: Props) {
  const { workout } = route.params;

  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const addSet = useWorkoutStore((s) => s.addSet);
  const finishWorkout = useWorkoutStore((s) => s.finishWorkout);
  const getPRForExercise = useWorkoutStore((s) => s.getPRForExercise);

  // Elapsed timer
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);

  // Rest timer
  const [restVisible, setRestVisible] = useState(false);
  const [restRemaining, setRestRemaining] = useState(DEFAULT_REST);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Exercise state
  const [exercises, setExercises] = useState<ExerciseState[]>(
    workout.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      targetSets: ex.sets,
      targetReps: ex.reps,
      notes: ex.notes ?? '',
      loggedSets: [],
    })),
  );

  useEffect(() => {
    startWorkout('community', workout.id, 'Community', workout.title);
    const timer = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Rest timer ────────────────────────────────────────────────────────────

  function startRest(duration = DEFAULT_REST) {
    setRestRemaining(duration);
    setRestVisible(true);
    if (restRef.current) clearInterval(restRef.current);
    restRef.current = setInterval(() => {
      setRestRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(restRef.current!);
          setRestVisible(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function skipRest() {
    if (restRef.current) clearInterval(restRef.current);
    setRestVisible(false);
  }

  // ── Set management ────────────────────────────────────────────────────────

  function addLoggedSet(exIndex: number) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIndex
          ? { ...ex, loggedSets: [...ex.loggedSets, { reps: ex.targetReps.split('-')[0] ?? '8', weight: '0' }] }
          : ex,
      ),
    );
  }

  function updateSet(exIndex: number, setIndex: number, field: 'reps' | 'weight', value: string) {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIndex) return ex;
        const sets = ex.loggedSets.map((s, si) => (si === setIndex ? { ...s, [field]: value } : s));
        return { ...ex, loggedSets: sets };
      }),
    );
  }

  function removeLastSet(exIndex: number) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIndex ? { ...ex, loggedSets: ex.loggedSets.slice(0, -1) } : ex,
      ),
    );
  }

  function confirmAddSet(exIndex: number) {
    const ex = exercises[exIndex];
    const lastSet = ex.loggedSets[ex.loggedSets.length - 1];
    if (!lastSet) { addLoggedSet(exIndex); return; }

    // Commit the last set to the store
    const reps = parseInt(lastSet.reps, 10);
    const weight = parseFloat(lastSet.weight);
    if (isNaN(reps) || isNaN(weight)) { addLoggedSet(exIndex); return; }

    addSet({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      setIndex: ex.loggedSets.length - 1,
      reps,
      weight,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startRest();
    addLoggedSet(exIndex);
  }

  // ── Finish workout ────────────────────────────────────────────────────────

  function handleFinish() {
    const totalLogged = exercises.reduce((acc, ex) => acc + ex.loggedSets.length, 0);
    if (totalLogged === 0) {
      Alert.alert('No sets logged', 'Log at least one set before finishing.');
      return;
    }

    Alert.alert('Finish Workout?', `You've logged ${totalLogged} sets.`, [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'Finish',
        onPress: () => {
          const session = finishWorkout();
          if (session) {
            navigation.replace('WorkoutComplete', { sessionId: session.id });
          } else {
            navigation.navigate('Main');
          }
        },
      },
    ]);
  }

  function handleClose() {
    Alert.alert('Exit Workout?', 'Your progress will be lost.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Exit', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  }

  const totalLogged = exercises.reduce((acc, ex) => acc + ex.loggedSets.length, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={handleClose}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.workoutTitle} numberOfLines={1}>{workout.title}</Text>
            <Text style={styles.elapsed}>{formatElapsed(elapsed)}</Text>
          </View>
          <Pressable style={styles.finishBtn} onPress={handleFinish}>
            <Text style={styles.finishBtnText}>Finish</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {exercises.map((ex, exIdx) => {
            const pr = getPRForExercise(ex.exerciseId);
            return (
              <View key={ex.exerciseId + exIdx} style={styles.exerciseBlock}>
                {/* Exercise header */}
                <View style={styles.exHeader}>
                  <View>
                    <Text style={styles.exName}>{ex.exerciseName}</Text>
                    <Text style={styles.exTarget}>
                      Target: {ex.targetSets} × {ex.targetReps}
                      {pr ? ` · PR: ${pr.weight} lbs × ${pr.reps}` : ''}
                    </Text>
                  </View>
                  {pr && (
                    <View style={styles.prBadge}>
                      <Ionicons name="star" size={10} color={Colors.premiumGold} />
                      <Text style={styles.prText}>PR</Text>
                    </View>
                  )}
                </View>

                {/* Column headers */}
                <View style={styles.setHeaderRow}>
                  <Text style={[styles.setCol, styles.setColHeader]}>SET</Text>
                  <Text style={[styles.setCol, styles.setColHeader, { flex: 2 }]}>WEIGHT (lbs)</Text>
                  <Text style={[styles.setCol, styles.setColHeader, { flex: 2 }]}>REPS</Text>
                  <View style={{ width: 32 }} />
                </View>

                {/* Logged sets */}
                {ex.loggedSets.map((set, setIdx) => (
                  <View key={setIdx} style={styles.setRow}>
                    <Text style={[styles.setCol, styles.setNum]}>{setIdx + 1}</Text>
                    <TextInput
                      style={[styles.setCol, styles.setInput, { flex: 2 }]}
                      value={set.weight}
                      onChangeText={(v) => updateSet(exIdx, setIdx, 'weight', v)}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                      placeholder="0"
                      placeholderTextColor={Colors.textTertiary}
                    />
                    <TextInput
                      style={[styles.setCol, styles.setInput, { flex: 2 }]}
                      value={set.reps}
                      onChangeText={(v) => updateSet(exIdx, setIdx, 'reps', v)}
                      keyboardType="number-pad"
                      selectTextOnFocus
                      placeholder="0"
                      placeholderTextColor={Colors.textTertiary}
                    />
                    {setIdx === ex.loggedSets.length - 1 ? (
                      <Pressable onPress={() => removeLastSet(exIdx)}>
                        <Ionicons name="close-circle" size={22} color={Colors.textTertiary} />
                      </Pressable>
                    ) : (
                      <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                    )}
                  </View>
                ))}

                {/* Add set */}
                <Pressable
                  style={styles.addSetBtn}
                  onPress={() => confirmAddSet(exIdx)}
                >
                  <Ionicons name="add" size={16} color={Colors.accent} />
                  <Text style={styles.addSetText}>
                    {ex.loggedSets.length === 0 ? 'Add First Set' : 'Log & Add Set'}
                  </Text>
                </Pressable>
              </View>
            );
          })}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Rest Timer Modal */}
      <Modal visible={restVisible} transparent animationType="fade">
        <View style={styles.restOverlay}>
          <View style={styles.restCard}>
            <Text style={styles.restTitle}>Rest</Text>
            <Text style={styles.restTimer}>{formatRest(restRemaining)}</Text>
            <View style={styles.restActions}>
              {[30, 60, 90, 120].map((sec) => (
                <Pressable key={sec} style={styles.restAdjust} onPress={() => startRest(sec)}>
                  <Text style={styles.restAdjustText}>{sec}s</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.skipBtn} onPress={skipRest}>
              <Text style={styles.skipText}>Skip Rest</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  workoutTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  elapsed: { fontSize: Typography.sm, color: Colors.accent, fontWeight: Typography.medium, marginTop: 2 },
  finishBtn: { backgroundColor: Colors.accent, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full },
  finishBtnText: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.white },
  scroll: { padding: Spacing.base },
  exerciseBlock: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  exHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  exName: { fontSize: Typography.md, fontWeight: Typography.semibold, color: Colors.textPrimary },
  exTarget: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 2 },
  prBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.premiumGold + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  prText: { fontSize: Typography.xs, color: Colors.premiumGold, fontWeight: Typography.bold },
  setHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: Spacing.sm },
  setCol: { flex: 1, textAlign: 'center' },
  setColHeader: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textTertiary },
  setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  setNum: { fontSize: Typography.base, color: Colors.textTertiary, fontWeight: Typography.medium },
  setInput: { backgroundColor: Colors.cardElevated, borderRadius: Radius.sm, paddingVertical: 8, color: Colors.textPrimary, fontSize: Typography.base, textAlign: 'center', borderWidth: 1, borderColor: Colors.border, marginHorizontal: 4 },
  addSetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, marginTop: Spacing.sm },
  addSetText: { fontSize: Typography.sm, color: Colors.accent, fontWeight: Typography.semibold },
  bottomSpacer: { height: 80 },
  restOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  restCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing['2xl'], alignItems: 'center', width: '80%' },
  restTitle: { fontSize: Typography.base, color: Colors.textSecondary, marginBottom: Spacing.sm },
  restTimer: { fontSize: 72, fontWeight: Typography.black, color: Colors.accent, fontVariant: ['tabular-nums'] },
  restActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl },
  restAdjust: { paddingHorizontal: Spacing.md, paddingVertical: 8, backgroundColor: Colors.card, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  restAdjustText: { fontSize: Typography.sm, color: Colors.textSecondary },
  skipBtn: { marginTop: Spacing.lg },
  skipText: { fontSize: Typography.base, color: Colors.textTertiary },
});
