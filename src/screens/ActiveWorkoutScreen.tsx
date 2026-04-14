import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';

import { Colors, Radius, Spacing, Typography } from '../theme';
import { useWorkoutStore } from '../store/workoutStore';
import { getProgramById } from '../data/programs';
import { getExercise } from '../data/exercises';
import type { RootStackParamList } from '../types';

// ─── Navigation Types ─────────────────────────────────────────────────────────

type ActiveWorkoutNavProp = StackNavigationProp<RootStackParamList, 'ActiveWorkout'>;
type ActiveWorkoutRouteProp = RouteProp<RootStackParamList, 'ActiveWorkout'>;

interface Props {
  navigation: ActiveWorkoutNavProp;
  route: ActiveWorkoutRouteProp;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoggedSet {
  reps: string;
  weight: string;
}

interface ExerciseState {
  exerciseId: string;
  exerciseName: string;
  targetSets: number;
  targetReps: string;
  loggedSets: LoggedSet[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function formatRestTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Default rest durations ───────────────────────────────────────────────────

const REST_OPTIONS = [30, 60, 90, 120, 180];
const DEFAULT_REST = 90;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActiveWorkoutScreen({ navigation, route }: Props) {
  const { programId, dayId, programName, dayName } = route.params;

  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const addSet = useWorkoutStore((s) => s.addSet);
  const removeLastSet = useWorkoutStore((s) => s.removeLastSet);
  const finishWorkout = useWorkoutStore((s) => s.finishWorkout);
  const getPRForExercise = useWorkoutStore((s) => s.getPRForExercise);

  // ── Elapsed timer ──────────────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);

  useEffect(() => {
    startWorkout(programId, dayId, programName, dayName);
    const interval = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Build exercise list from program data (or fallback stubs) ─────────────
  const [exercises, setExercises] = useState<ExerciseState[]>(() => {
    const program = getProgramById(programId);
    if (program) {
      for (const week of program.weeks) {
        const day = week.days.find((d) => d.id === dayId);
        if (day) {
          return day.exercises.map((pe) => {
            const ex = getExercise(pe.exerciseId);
            return {
              exerciseId: pe.exerciseId,
              exerciseName: ex?.name ?? pe.exerciseId,
              targetSets: pe.sets.length,
              targetReps: pe.sets[0]?.reps ?? '—',
              loggedSets: [],
            };
          });
        }
      }
    }
    // Fallback: single placeholder exercise
    return [
      {
        exerciseId: 'placeholder',
        exerciseName: dayName,
        targetSets: 3,
        targetReps: '8-12',
        loggedSets: [],
      },
    ];
  });

  // ── Rest timer modal ──────────────────────────────────────────────────────
  const [restVisible, setRestVisible] = useState(false);
  const [restRemaining, setRestRemaining] = useState(DEFAULT_REST);
  const [selectedRest, setSelectedRest] = useState(DEFAULT_REST);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRestTimer = useCallback((duration: number) => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    setRestRemaining(duration);
    setRestVisible(true);
    restIntervalRef.current = setInterval(() => {
      setRestRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(restIntervalRef.current!);
          setRestVisible(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const dismissRestTimer = useCallback(() => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    setRestVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    };
  }, []);

  // ── Set management ────────────────────────────────────────────────────────

  const updateSet = useCallback(
    (exIdx: number, setIdx: number, field: 'reps' | 'weight', value: string) => {
      setExercises((prev) => {
        const copy = prev.map((e) => ({ ...e, loggedSets: [...e.loggedSets] }));
        copy[exIdx].loggedSets[setIdx] = {
          ...copy[exIdx].loggedSets[setIdx],
          [field]: value,
        };
        return copy;
      });
    },
    [],
  );

  const handleAddSet = useCallback(
    (exIdx: number) => {
      setExercises((prev) => {
        const copy = prev.map((e) => ({ ...e, loggedSets: [...e.loggedSets] }));
        copy[exIdx].loggedSets.push({ reps: '', weight: '' });
        return copy;
      });

      // Log to store if the previous last set was complete
      const ex = exercises[exIdx];
      const last = ex.loggedSets[ex.loggedSets.length - 1];
      if (last && last.reps && last.weight) {
        const reps = parseInt(last.reps, 10);
        const weight = parseFloat(last.weight);
        if (!isNaN(reps) && !isNaN(weight)) {
          addSet({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            setIndex: ex.loggedSets.length - 1,
            setType: 'working',
            reps,
            weight,
          });
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          startRestTimer(selectedRest);
        }
      }
    },
    [exercises, addSet, startRestTimer, selectedRest],
  );

  const handleLogSet = useCallback(
    (exIdx: number, setIdx: number) => {
      const ex = exercises[exIdx];
      const loggedSet = ex.loggedSets[setIdx];
      if (!loggedSet) return;
      const reps = parseInt(loggedSet.reps, 10);
      const weight = parseFloat(loggedSet.weight);
      if (isNaN(reps) || isNaN(weight) || reps <= 0) return;

      addSet({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        setIndex: setIdx,
        setType: 'working',
        reps,
        weight,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      startRestTimer(selectedRest);
    },
    [exercises, addSet, startRestTimer, selectedRest],
  );

  const handleRemoveLastSet = useCallback(
    (exIdx: number) => {
      const ex = exercises[exIdx];
      if (ex.loggedSets.length === 0) return;
      setExercises((prev) => {
        const copy = prev.map((e) => ({ ...e, loggedSets: [...e.loggedSets] }));
        copy[exIdx].loggedSets.pop();
        return copy;
      });
      removeLastSet(ex.exerciseId);
    },
    [exercises, removeLastSet],
  );

  // ── Finish workout ────────────────────────────────────────────────────────

  const totalLogged = exercises.reduce((sum, e) => sum + e.loggedSets.length, 0);
  const totalTarget = exercises.reduce((sum, e) => sum + e.targetSets, 0);

  const handleFinish = useCallback(() => {
    const allDone = totalLogged >= totalTarget;
    const confirm = () => {
      const session = finishWorkout();
      if (session) {
        navigation.replace('WorkoutComplete', { sessionId: session.id });
      }
    };

    if (!allDone) {
      Alert.alert(
        'Finish Early?',
        `You've logged ${totalLogged} of ${totalTarget} sets. Finish anyway?`,
        [
          { text: 'Keep Going', style: 'cancel' },
          { text: 'Finish', style: 'destructive', onPress: confirm },
        ],
      );
    } else {
      confirm();
    }
  }, [finishWorkout, navigation, totalLogged, totalTarget]);

  // ── Close / back confirmation ─────────────────────────────────────────────

  const handleClose = useCallback(() => {
    Alert.alert(
      'Abandon Workout?',
      'Your progress will be lost.',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Abandon',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ],
    );
  }, [navigation]);

  // ── PR detection ──────────────────────────────────────────────────────────

  const isPR = useCallback(
    (exerciseId: string, weight: string): boolean => {
      const w = parseFloat(weight);
      if (isNaN(w) || w <= 0) return false;
      const pr = getPRForExercise(exerciseId);
      return !pr || w > pr.weight;
    },
    [getPRForExercise],
  );

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.headerBtn} hitSlop={8}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {dayName}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {programName}
          </Text>
        </View>
        <View style={styles.timerPill}>
          <Ionicons name="time-outline" size={13} color={Colors.accent} />
          <Text style={styles.timerText}>{formatElapsed(elapsed)}</Text>
        </View>
      </View>

      {/* Exercise list */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {exercises.map((ex, exIdx) => {
            const pr = getPRForExercise(ex.exerciseId);
            return (
              <View key={ex.exerciseId} style={styles.exerciseCard}>
                {/* Exercise header */}
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
                  <Text style={styles.exerciseTarget}>
                    {ex.targetSets} × {ex.targetReps}
                  </Text>
                </View>

                {pr && (
                  <Text style={styles.prHint}>
                    Current PR: {pr.weight} × {pr.reps}
                  </Text>
                )}

                {/* Sets table header */}
                {ex.loggedSets.length > 0 && (
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, styles.cellSet]}>SET</Text>
                    <Text style={[styles.tableHeaderCell, styles.cellReps]}>REPS</Text>
                    <Text style={[styles.tableHeaderCell, styles.cellWeight]}>WEIGHT</Text>
                    <Text style={[styles.tableHeaderCell, styles.cellAction]} />
                  </View>
                )}

                {/* Set rows */}
                {ex.loggedSets.map((loggedSet, setIdx) => {
                  const showPR = isPR(ex.exerciseId, loggedSet.weight);
                  return (
                    <View key={setIdx} style={styles.setRow}>
                      <Text style={[styles.cellSet, styles.setNumber]}>
                        {setIdx + 1}
                      </Text>
                      <TextInput
                        style={[styles.cellReps, styles.input]}
                        value={loggedSet.reps}
                        onChangeText={(v) => updateSet(exIdx, setIdx, 'reps', v)}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={Colors.textTertiary}
                        returnKeyType="next"
                        maxLength={4}
                      />
                      <View style={[styles.cellWeight, styles.weightCell]}>
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          value={loggedSet.weight}
                          onChangeText={(v) => updateSet(exIdx, setIdx, 'weight', v)}
                          keyboardType="decimal-pad"
                          placeholder="0"
                          placeholderTextColor={Colors.textTertiary}
                          returnKeyType="done"
                          onSubmitEditing={() => handleLogSet(exIdx, setIdx)}
                          maxLength={7}
                        />
                        {showPR && loggedSet.weight !== '' && (
                          <View style={styles.prBadge}>
                            <Text style={styles.prBadgeText}>PR</Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity
                        style={[styles.cellAction, styles.logBtn]}
                        onPress={() => handleLogSet(exIdx, setIdx)}
                        hitSlop={6}
                      >
                        <Ionicons name="checkmark" size={18} color={Colors.success} />
                      </TouchableOpacity>
                    </View>
                  );
                })}

                {/* Add / Remove buttons */}
                <View style={styles.setActions}>
                  <TouchableOpacity
                    style={styles.addSetBtn}
                    onPress={() => handleAddSet(exIdx)}
                  >
                    <Ionicons name="add" size={16} color={Colors.accent} />
                    <Text style={styles.addSetText}>Add Set</Text>
                  </TouchableOpacity>
                  {ex.loggedSets.length > 0 && (
                    <TouchableOpacity
                      style={styles.removeSetBtn}
                      onPress={() => handleRemoveLastSet(exIdx)}
                    >
                      <Ionicons name="remove" size={16} color={Colors.textTertiary} />
                      <Text style={styles.removeSetText}>Remove Last</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}

          <View style={{ height: Spacing['3xl'] }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Finish button */}
      <View style={styles.footer}>
        <Text style={styles.setsProgress}>
          {totalLogged} / {totalTarget} sets logged
        </Text>
        <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
          <Text style={styles.finishBtnText}>Finish Workout</Text>
        </TouchableOpacity>
      </View>

      {/* Rest Timer Modal */}
      <Modal
        visible={restVisible}
        transparent
        animationType="slide"
        onRequestClose={dismissRestTimer}
      >
        <Pressable style={styles.restOverlay} onPress={Keyboard.dismiss}>
          <View style={styles.restCard}>
            <Text style={styles.restTitle}>Rest Timer</Text>
            <Text style={styles.restTime}>{formatRestTimer(restRemaining)}</Text>

            {/* Rest duration selector */}
            <View style={styles.restOptions}>
              {REST_OPTIONS.map((sec) => (
                <TouchableOpacity
                  key={sec}
                  style={[
                    styles.restOption,
                    selectedRest === sec && styles.restOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedRest(sec);
                    startRestTimer(sec);
                  }}
                >
                  <Text
                    style={[
                      styles.restOptionText,
                      selectedRest === sec && styles.restOptionTextActive,
                    ]}
                  >
                    {sec}s
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.restSkipBtn} onPress={dismissRestTimer}>
              <Text style={styles.restSkipText}>Skip Rest</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timerText: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.accent,
    fontVariant: ['tabular-nums'],
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
  },

  // Exercise card
  exerciseCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  exerciseName: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    flex: 1,
    textTransform: 'capitalize',
  },
  exerciseTarget: {
    fontSize: Typography.sm,
    color: Colors.accent,
    fontWeight: Typography.medium,
    marginLeft: Spacing.sm,
  },
  prHint: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
  },

  // Table
  tableHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
    paddingHorizontal: 2,
  },
  tableHeaderCell: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textTertiary,
    letterSpacing: 0.8,
  },
  cellSet: {
    width: 36,
    textAlign: 'center',
  },
  cellReps: {
    flex: 1,
    textAlign: 'center',
  },
  cellWeight: {
    flex: 1.4,
    textAlign: 'center',
  },
  cellAction: {
    width: 36,
    textAlign: 'center',
  },

  // Set row
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  setNumber: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  input: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.sm,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    paddingHorizontal: Spacing.sm,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  weightCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  prBadge: {
    backgroundColor: Colors.premiumGold,
    borderRadius: Radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  prBadgeText: {
    fontSize: Typography.xs,
    fontWeight: Typography.black,
    color: Colors.black,
  },
  logBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Set actions
  setActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  addSetText: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.accent,
  },
  removeSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  removeSetText: {
    fontSize: Typography.sm,
    color: Colors.textTertiary,
  },

  // Footer
  footer: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  setsProgress: {
    textAlign: 'center',
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  finishBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
  },
  finishBtnText: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.white,
  },

  // Rest timer modal
  restOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  restCard: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.base,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  restTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  restTime: {
    fontSize: Typography['4xl'],
    fontWeight: Typography.black,
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  restOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  restOption: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: Radius.full,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  restOptionActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  restOptionText: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
  },
  restOptionTextActive: {
    color: Colors.white,
  },
  restSkipBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  restSkipText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
});
