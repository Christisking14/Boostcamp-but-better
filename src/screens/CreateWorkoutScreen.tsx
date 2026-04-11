import React, { useState, useCallback } from 'react';
import {
  Alert,
  FlatList,
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
import type { StackNavigationProp } from '@react-navigation/stack';

import EXERCISES, { getExerciseName } from '../data/exercises';
import { useWorkoutStore } from '../store/workoutStore';
import { uploadWorkout, ensureAnonymousAuth, FIREBASE_CONFIGURED } from '../services/firebase';
import { Colors, Radius, Spacing, Typography } from '../theme';
import type { CommunityExercise, RootStackParamList } from '../types';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'CreateWorkout'>;
};

const CATEGORIES = ['strength', 'hypertrophy', 'cardio', 'custom'] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_ICONS: Record<Category, keyof typeof Ionicons.glyphMap> = {
  strength: 'barbell',
  hypertrophy: 'body',
  cardio: 'pulse',
  custom: 'construct',
};

// ── Exercise Picker Modal ────────────────────────────────────────────────────

function ExercisePicker({
  visible,
  onSelect,
  onClose,
  alreadyAdded,
}: {
  visible: boolean;
  onSelect: (id: string, name: string) => void;
  onClose: () => void;
  alreadyAdded: string[];
}) {
  const [search, setSearch] = useState('');
  const filtered = EXERCISES.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) &&
      !alreadyAdded.includes(e.id),
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={pickerStyles.container} edges={['top', 'bottom']}>
        <View style={pickerStyles.header}>
          <Text style={pickerStyles.title}>Add Exercise</Text>
          <Pressable onPress={onClose} style={pickerStyles.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </Pressable>
        </View>

        <View style={pickerStyles.searchRow}>
          <Ionicons name="search" size={16} color={Colors.textTertiary} />
          <TextInput
            style={pickerStyles.searchInput}
            placeholder="Search exercises…"
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <Pressable
              style={pickerStyles.exerciseRow}
              onPress={() => {
                onSelect(item.id, item.name);
                onClose();
                setSearch('');
              }}
            >
              <View style={pickerStyles.exerciseLeft}>
                <Text style={pickerStyles.exerciseName}>{item.name}</Text>
                <Text style={pickerStyles.exerciseMeta}>
                  {item.primaryMuscles.join(', ')} · {item.equipment[0]}
                </Text>
              </View>
              <Ionicons name="add-circle" size={24} color={Colors.accent} />
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={pickerStyles.empty}>
              <Text style={pickerStyles.emptyText}>No exercises found</Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function CreateWorkoutScreen({ navigation }: Props) {
  const userName = useWorkoutStore((s) => s.user.name);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('custom');
  const [tags, setTags] = useState('');
  const [exercises, setExercises] = useState<CommunityExercise[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ── Exercise management ─────────────────────────────────────────────────

  const addExercise = useCallback((id: string, name: string) => {
    setExercises((prev) => [
      ...prev,
      { exerciseId: id, exerciseName: name, sets: 3, reps: '8-12' },
    ]);
  }, []);

  const updateExercise = (
    index: number,
    field: keyof CommunityExercise,
    value: string | number,
  ) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex)),
    );
  };

  const removeExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setExercises((prev) => {
      const arr = [...prev];
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      return arr;
    });
  };

  const moveDown = (index: number) => {
    if (index >= exercises.length - 1) return;
    setExercises((prev) => {
      const arr = [...prev];
      [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
      return arr;
    });
  };

  const estimatedMinutes = exercises.reduce(
    (acc, ex) => acc + ex.sets * 3, // ~3 min per set including rest
    0,
  );

  // ── Validation & submission ─────────────────────────────────────────────

  function validate(): string | null {
    if (!title.trim()) return 'Please enter a workout title.';
    if (exercises.length === 0) return 'Add at least one exercise.';
    for (const ex of exercises) {
      if (!ex.reps.trim()) return `Enter reps for ${ex.exerciseName}.`;
      if (ex.sets < 1 || ex.sets > 20) return `${ex.exerciseName}: sets must be 1-20.`;
    }
    return null;
  }

  async function handleShare() {
    const err = validate();
    if (err) return Alert.alert('Missing info', err);

    if (!FIREBASE_CONFIGURED) {
      Alert.alert(
        'Firebase not configured',
        'Add your Firebase credentials to src/services/firebase.ts to enable community sharing. Your workout has been saved locally.',
        [{ text: 'Got it' }],
      );
      navigation.goBack();
      return;
    }

    setUploading(true);
    try {
      await ensureAnonymousAuth();
      const tagList = tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      await uploadWorkout({
        title: title.trim(),
        description: description.trim(),
        authorName: userName || 'Anonymous',
        authorId: '', // filled by uploadWorkout
        exercises,
        estimatedMinutes,
        tags: tagList,
        category,
      });

      Alert.alert('Workout shared!', 'Your workout is now visible in the Community tab.', [
        { text: 'Great!', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Create Workout</Text>
          <Pressable
            style={[styles.shareBtn, uploading && { opacity: 0.5 }]}
            onPress={handleShare}
            disabled={uploading}
          >
            <Ionicons name="cloud-upload-outline" size={16} color={Colors.white} />
            <Text style={styles.shareBtnText}>{uploading ? 'Sharing…' : 'Share'}</Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>Workout Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Monday Push Day"
              placeholderTextColor={Colors.textTertiary}
              value={title}
              onChangeText={setTitle}
              maxLength={60}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Describe the goal of this workout…"
              placeholderTextColor={Colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={300}
            />
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Ionicons
                    name={CATEGORY_ICONS[cat]}
                    size={14}
                    color={category === cat ? Colors.white : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.categoryLabel,
                      category === cat && styles.categoryLabelActive,
                    ]}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Tags */}
          <View style={styles.field}>
            <Text style={styles.label}>Tags (comma-separated)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. chest, push, upper body"
              placeholderTextColor={Colors.textTertiary}
              value={tags}
              onChangeText={setTags}
              maxLength={80}
            />
          </View>

          {/* Exercises Section */}
          <View style={styles.exercisesHeader}>
            <Text style={styles.sectionTitle}>
              Exercises{exercises.length > 0 ? ` (${exercises.length})` : ''}
            </Text>
            <View style={styles.timeBadge}>
              <Ionicons name="time-outline" size={13} color={Colors.textTertiary} />
              <Text style={styles.timeText}>~{estimatedMinutes}m</Text>
            </View>
          </View>

          {exercises.map((ex, index) => (
            <View key={ex.exerciseId + index} style={styles.exerciseCard}>
              {/* Exercise header */}
              <View style={styles.exHeader}>
                <Text style={styles.exName} numberOfLines={1}>{ex.exerciseName}</Text>
                <View style={styles.exHeaderActions}>
                  <Pressable onPress={() => moveUp(index)} disabled={index === 0}>
                    <Ionicons
                      name="chevron-up"
                      size={18}
                      color={index === 0 ? Colors.textTertiary : Colors.textSecondary}
                    />
                  </Pressable>
                  <Pressable onPress={() => moveDown(index)} disabled={index === exercises.length - 1}>
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={index === exercises.length - 1 ? Colors.textTertiary : Colors.textSecondary}
                    />
                  </Pressable>
                  <Pressable onPress={() => removeExercise(index)}>
                    <Ionicons name="trash-outline" size={18} color={Colors.error} />
                  </Pressable>
                </View>
              </View>

              {/* Sets & Reps row */}
              <View style={styles.exInputRow}>
                <View style={styles.exInputGroup}>
                  <Text style={styles.exInputLabel}>Sets</Text>
                  <TextInput
                    style={styles.exInput}
                    value={String(ex.sets)}
                    onChangeText={(v) => {
                      const n = parseInt(v, 10);
                      if (!isNaN(n)) updateExercise(index, 'sets', Math.max(1, Math.min(20, n)));
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View style={styles.exInputSeparator}>
                  <Text style={styles.exSeparatorText}>×</Text>
                </View>
                <View style={[styles.exInputGroup, { flex: 2 }]}>
                  <Text style={styles.exInputLabel}>Reps / Scheme</Text>
                  <TextInput
                    style={styles.exInput}
                    value={ex.reps}
                    onChangeText={(v) => updateExercise(index, 'reps', v)}
                    placeholder="e.g. 8-12 or AMRAP"
                    placeholderTextColor={Colors.textTertiary}
                    maxLength={20}
                  />
                </View>
              </View>

              {/* Notes */}
              <TextInput
                style={styles.exNotes}
                value={ex.notes ?? ''}
                onChangeText={(v) => updateExercise(index, 'notes', v)}
                placeholder="Notes (optional)"
                placeholderTextColor={Colors.textTertiary}
                maxLength={80}
              />
            </View>
          ))}

          {/* Add Exercise Button */}
          <Pressable style={styles.addExBtn} onPress={() => setPickerVisible(true)}>
            <Ionicons name="add-circle-outline" size={20} color={Colors.accent} />
            <Text style={styles.addExText}>Add Exercise</Text>
          </Pressable>

          {/* Share info banner */}
          {!FIREBASE_CONFIGURED && (
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle-outline" size={18} color={Colors.info} />
              <Text style={styles.infoText}>
                Connect Firebase to share workouts with the community. Until then, workouts are visible only on this device.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ExercisePicker
        visible={pickerVisible}
        onSelect={addExercise}
        onClose={() => setPickerVisible(false)}
        alreadyAdded={exercises.map((e) => e.exerciseId)}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4, marginRight: Spacing.sm },
  headerTitle: { flex: 1, fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.textPrimary },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  shareBtnText: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.white },
  scroll: { padding: Spacing.base, paddingBottom: 60 },
  field: { marginBottom: Spacing.lg },
  label: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Typography.base,
  },
  textarea: { height: 80, textAlignVertical: 'top' },
  categoryScroll: { flexDirection: 'row' },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  categoryChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  categoryLabel: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  categoryLabelActive: { color: Colors.white },
  exercisesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  sectionTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.textPrimary },
  timeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: Typography.sm, color: Colors.textTertiary },
  exerciseCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  exHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  exName: { flex: 1, fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  exHeaderActions: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  exInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, marginBottom: Spacing.sm },
  exInputGroup: { flex: 1 },
  exInputLabel: { fontSize: Typography.xs, color: Colors.textTertiary, marginBottom: 4 },
  exInput: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    color: Colors.textPrimary,
    fontSize: Typography.base,
    textAlign: 'center',
  },
  exInputSeparator: { paddingBottom: 10, paddingHorizontal: 2 },
  exSeparatorText: { fontSize: Typography.lg, color: Colors.textTertiary },
  exNotes: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    color: Colors.textSecondary,
    fontSize: Typography.sm,
  },
  addExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.accent + '66',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.xl,
  },
  addExText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.accent },
  infoBanner: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.info + '11',
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.info + '33',
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 18 },
});

const pickerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    margin: Spacing.base,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, height: 42, color: Colors.textPrimary, fontSize: Typography.base },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  exerciseLeft: { flex: 1 },
  exerciseName: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textPrimary },
  exerciseMeta: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 2, textTransform: 'capitalize' },
  empty: { padding: Spacing.xl, alignItems: 'center' },
  emptyText: { color: Colors.textTertiary, fontSize: Typography.base },
});
