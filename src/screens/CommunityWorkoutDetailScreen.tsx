import React, { useEffect, useState } from 'react';
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
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';

import {
  fetchCommunityWorkouts,
  toggleLike,
  deleteWorkout,
  getCurrentUser,
  ensureAnonymousAuth,
  FIREBASE_CONFIGURED,
} from '../services/firebase';
import { Colors, Radius, Spacing, Typography } from '../theme';
import type { CommunityWorkout, RootStackParamList } from '../types';
import { formatDate } from '../utils/calculations';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'CommunityWorkoutDetail'>;
  route: RouteProp<RootStackParamList, 'CommunityWorkoutDetail'>;
};

export default function CommunityWorkoutDetailScreen({ navigation, route }: Props) {
  const { workoutId } = route.params;
  const [workout, setWorkout] = useState<CommunityWorkout | null>(null);
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureAnonymousAuth().then((user) => {
      if (user) setCurrentUid(user.uid);
    });
    loadWorkout();
  }, []);

  async function loadWorkout() {
    try {
      const all = await fetchCommunityWorkouts(100);
      const found = all.find((w) => w.id === workoutId);
      setWorkout(found ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleLike() {
    if (!workout) return;
    const uid = currentUid ?? (await ensureAnonymousAuth())?.uid ?? null;
    if (uid) setCurrentUid(uid);

    const isLiked = uid ? workout.likedBy.includes(uid) : false;
    setWorkout((w) =>
      w
        ? {
            ...w,
            likes: isLiked ? w.likes - 1 : w.likes + 1,
            likedBy: isLiked
              ? w.likedBy.filter((id) => id !== uid)
              : [...w.likedBy, uid ?? ''],
          }
        : null,
    );

    if (FIREBASE_CONFIGURED) {
      await toggleLike(workout.id, workout.likedBy).catch(() => loadWorkout());
    }
  }

  async function handleDelete() {
    if (!workout) return;
    Alert.alert('Delete Workout', 'Remove this workout from the community? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteWorkout(workout.id).catch(() => {});
          navigation.goBack();
        },
      },
    ]);
  }

  if (loading || !workout) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.center}>
          <Text style={styles.loadingText}>{loading ? 'Loading…' : 'Workout not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isLiked = currentUid ? workout.likedBy.includes(currentUid) : false;
  const isAuthor = currentUid === workout.authorId;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.topBar}>
            <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
            </Pressable>
            {isAuthor && (
              <Pressable onPress={handleDelete}>
                <Ionicons name="trash-outline" size={22} color={Colors.error} />
              </Pressable>
            )}
          </View>
        </SafeAreaView>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.authorRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{workout.authorName.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.authorName}>{workout.authorName}</Text>
              <Text style={styles.date}>{formatDate(workout.createdAt)}</Text>
            </View>
          </View>
          <Text style={styles.title}>{workout.title}</Text>
          {workout.description.length > 0 && (
            <Text style={styles.description}>{workout.description}</Text>
          )}

          {/* Tags */}
          {workout.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {workout.tags.map((t) => (
                <View key={t} style={styles.tag}>
                  <Text style={styles.tagText}>#{t}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatBadge icon="barbell-outline" text={`${workout.exercises.length} exercises`} />
            {workout.estimatedMinutes > 0 && (
              <StatBadge icon="time-outline" text={`~${workout.estimatedMinutes} min`} />
            )}
            <StatBadge icon="grid-outline" text={workout.category} />
          </View>
        </View>

        {/* Exercises */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercises</Text>
          {workout.exercises.map((ex, i) => (
            <View key={i} style={styles.exerciseCard}>
              <View style={styles.exerciseNum}>
                <Text style={styles.exerciseNumText}>{i + 1}</Text>
              </View>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
                <Text style={styles.exerciseSets}>
                  {ex.sets} sets × {ex.reps}
                  {ex.notes ? ` · ${ex.notes}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom actions */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <Pressable
          style={[styles.likeBtn, isLiked && styles.likeBtnActive]}
          onPress={handleLike}
        >
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={20} color={isLiked ? Colors.error : Colors.textSecondary} />
          <Text style={[styles.likeText, isLiked && { color: Colors.error }]}>{workout.likes}</Text>
        </Pressable>

        <Pressable
          style={styles.startBtn}
          onPress={() => navigation.navigate('ActiveCommunityWorkout', { workout })}
        >
          <Ionicons name="play" size={18} color={Colors.white} />
          <Text style={styles.startBtnText}>Start Workout</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function StatBadge({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={statStyles.badge}>
      <Ionicons name={icon} size={13} color={Colors.textTertiary} />
      <Text style={statStyles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 120 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.base },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: Typography.base, color: Colors.textSecondary },
  header: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.xl },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.accent + '33', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.accent },
  authorName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  date: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 2 },
  title: { fontSize: Typography['2xl'], fontWeight: Typography.black, color: Colors.textPrimary, marginBottom: Spacing.sm },
  description: { fontSize: Typography.base, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.md },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.md },
  tag: { backgroundColor: Colors.card, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderWidth: 1, borderColor: Colors.border },
  tagText: { fontSize: Typography.xs, color: Colors.textTertiary },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  section: { paddingHorizontal: Spacing.base, gap: Spacing.sm },
  sectionTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  exerciseCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  exerciseNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  exerciseNumText: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textSecondary },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textPrimary },
  exerciseSets: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 2 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: Spacing.md, padding: Spacing.base, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  likeBtnActive: { borderColor: Colors.error + '55', backgroundColor: Colors.error + '15' },
  likeText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textSecondary },
  startBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.accent, borderRadius: Radius.full, paddingVertical: Spacing.md },
  startBtnText: { fontSize: Typography.md, fontWeight: Typography.bold, color: Colors.white },
});

const statStyles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.card, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 5, borderWidth: 1, borderColor: Colors.border },
  text: { fontSize: Typography.xs, color: Colors.textSecondary, textTransform: 'capitalize' },
});
