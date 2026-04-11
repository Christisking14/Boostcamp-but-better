import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  subscribeCommunityFeed,
  toggleLike,
  ensureAnonymousAuth,
  getCurrentUser,
  FIREBASE_CONFIGURED,
} from '../services/firebase';
import { Colors, Radius, Spacing, Typography } from '../theme';
import type { CommunityWorkout, RootStackParamList, TabParamList } from '../types';
import { formatDate } from '../utils/calculations';

type CommunityNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Community'>,
  StackNavigationProp<RootStackParamList>
>;

type SortMode = 'newest' | 'popular';
type FilterCategory = 'all' | 'strength' | 'hypertrophy' | 'cardio' | 'custom';

const CATEGORY_LABELS: Record<FilterCategory, string> = {
  all: 'All',
  strength: 'Strength',
  hypertrophy: 'Hypertrophy',
  cardio: 'Cardio',
  custom: 'Custom',
};

// ── Workout Card ──────────────────────────────────────────────────────────────

function WorkoutCard({
  workout,
  currentUid,
  onLike,
  onStart,
  onPress,
}: {
  workout: CommunityWorkout;
  currentUid: string | null;
  onLike: (workout: CommunityWorkout) => void;
  onStart: (workout: CommunityWorkout) => void;
  onPress: (workout: CommunityWorkout) => void;
}) {
  const isLiked = currentUid ? workout.likedBy.includes(currentUid) : false;

  return (
    <Pressable style={cardStyles.container} onPress={() => onPress(workout)}>
      {/* Top row */}
      <View style={cardStyles.topRow}>
        <View style={cardStyles.authorAvatar}>
          <Text style={cardStyles.avatarText}>
            {workout.authorName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={cardStyles.authorInfo}>
          <Text style={cardStyles.authorName}>{workout.authorName}</Text>
          <Text style={cardStyles.date}>{formatDate(workout.createdAt)}</Text>
        </View>
        <View style={[cardStyles.categoryBadge, { backgroundColor: getCategoryColor(workout.category) + '22' }]}>
          <Text style={[cardStyles.categoryText, { color: getCategoryColor(workout.category) }]}>
            {workout.category}
          </Text>
        </View>
      </View>

      {/* Title & description */}
      <Text style={cardStyles.title}>{workout.title}</Text>
      {workout.description.length > 0 && (
        <Text style={cardStyles.description} numberOfLines={2}>
          {workout.description}
        </Text>
      )}

      {/* Exercise preview */}
      <View style={cardStyles.exercisePreview}>
        {workout.exercises.slice(0, 3).map((ex, i) => (
          <View key={i} style={cardStyles.exerciseChip}>
            <Text style={cardStyles.exerciseChipText} numberOfLines={1}>
              {ex.exerciseName}
            </Text>
          </View>
        ))}
        {workout.exercises.length > 3 && (
          <View style={cardStyles.exerciseChip}>
            <Text style={cardStyles.exerciseChipText}>+{workout.exercises.length - 3} more</Text>
          </View>
        )}
      </View>

      {/* Stats row */}
      <View style={cardStyles.statsRow}>
        <View style={cardStyles.stat}>
          <Ionicons name="barbell-outline" size={13} color={Colors.textTertiary} />
          <Text style={cardStyles.statText}>{workout.exercises.length} exercises</Text>
        </View>
        {workout.estimatedMinutes > 0 && (
          <View style={cardStyles.stat}>
            <Ionicons name="time-outline" size={13} color={Colors.textTertiary} />
            <Text style={cardStyles.statText}>~{workout.estimatedMinutes}m</Text>
          </View>
        )}

        <View style={{ flex: 1 }} />

        {/* Like button */}
        <Pressable
          style={[cardStyles.likeBtn, isLiked && cardStyles.likeBtnActive]}
          onPress={() => onLike(workout)}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={16}
            color={isLiked ? Colors.error : Colors.textSecondary}
          />
          <Text style={[cardStyles.likeCount, isLiked && { color: Colors.error }]}>
            {workout.likes}
          </Text>
        </Pressable>

        {/* Start button */}
        <Pressable style={cardStyles.startBtn} onPress={() => onStart(workout)}>
          <Ionicons name="play" size={13} color={Colors.accent} />
          <Text style={cardStyles.startText}>Start</Text>
        </Pressable>
      </View>

      {/* Tags */}
      {workout.tags.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={cardStyles.tagsRow}>
          {workout.tags.map((tag) => (
            <View key={tag} style={cardStyles.tag}>
              <Text style={cardStyles.tagText}>#{tag}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </Pressable>
  );
}

function getCategoryColor(cat: string): string {
  switch (cat) {
    case 'strength': return Colors.error;
    case 'hypertrophy': return Colors.accent;
    case 'cardio': return Colors.success;
    default: return Colors.info;
  }
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function CommunityScreen() {
  const navigation = useNavigation<CommunityNavProp>();

  const [workouts, setWorkouts] = useState<CommunityWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  const unsubRef = useRef<(() => void) | null>(null);

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    ensureAnonymousAuth().then((user) => {
      if (user) setCurrentUid(user.uid);
    });
  }, []);

  // ── Real-time subscription ────────────────────────────────────────────────

  const subscribe = useCallback(() => {
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = subscribeCommunityFeed((data) => {
      setWorkouts(data);
      setLoading(false);
      setRefreshing(false);
    });
  }, []);

  useEffect(() => {
    subscribe();
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [subscribe]);

  const onRefresh = () => {
    setRefreshing(true);
    subscribe();
  };

  // ── Like ──────────────────────────────────────────────────────────────────

  async function handleLike(workout: CommunityWorkout) {
    if (!FIREBASE_CONFIGURED) {
      // Optimistic toggle for mock data
      setWorkouts((prev) =>
        prev.map((w) => {
          if (w.id !== workout.id) return w;
          const liked = currentUid ? w.likedBy.includes(currentUid) : false;
          return {
            ...w,
            likes: liked ? w.likes - 1 : w.likes + 1,
            likedBy: liked
              ? w.likedBy.filter((uid) => uid !== currentUid)
              : [...w.likedBy, currentUid ?? 'local'],
          };
        }),
      );
      return;
    }

    if (!currentUid) {
      const user = await ensureAnonymousAuth();
      if (user) setCurrentUid(user.uid);
    }

    // Optimistic update
    setWorkouts((prev) =>
      prev.map((w) => {
        if (w.id !== workout.id) return w;
        const liked = currentUid ? w.likedBy.includes(currentUid) : false;
        return {
          ...w,
          likes: liked ? w.likes - 1 : w.likes + 1,
          likedBy: liked
            ? w.likedBy.filter((uid) => uid !== currentUid)
            : [...w.likedBy, currentUid ?? ''],
        };
      }),
    );

    try {
      await toggleLike(workout.id, workout.likedBy);
    } catch {
      // Revert on failure
      subscribe();
    }
  }

  // ── Start workout ─────────────────────────────────────────────────────────

  function handleStart(workout: CommunityWorkout) {
    navigation.navigate('ActiveCommunityWorkout', { workout });
  }

  // ── Filter & sort ─────────────────────────────────────────────────────────

  const visible = workouts
    .filter((w) => {
      const matchSearch =
        search.length === 0 ||
        w.title.toLowerCase().includes(search.toLowerCase()) ||
        w.authorName.toLowerCase().includes(search.toLowerCase()) ||
        w.tags.some((t) => t.includes(search.toLowerCase()));
      const matchCat = categoryFilter === 'all' || w.category === categoryFilter;
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      if (sortMode === 'popular') return b.likes - a.likes;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Community</Text>
          <Text style={styles.subtitle}>
            {FIREBASE_CONFIGURED ? `${workouts.length} workouts shared` : 'Sample workouts (connect Firebase to share)'}
          </Text>
        </View>
        <Pressable
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateWorkout')}
        >
          <Ionicons name="add" size={20} color={Colors.white} />
          <Text style={styles.createBtnText}>Create</Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search workouts or athletes…"
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {/* Sort & Filter row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {/* Sort toggles */}
        <Pressable
          style={[styles.sortChip, sortMode === 'newest' && styles.sortChipActive]}
          onPress={() => setSortMode('newest')}
        >
          <Ionicons name="time-outline" size={13} color={sortMode === 'newest' ? Colors.white : Colors.textSecondary} />
          <Text style={[styles.sortText, sortMode === 'newest' && styles.sortTextActive]}>Newest</Text>
        </Pressable>
        <Pressable
          style={[styles.sortChip, sortMode === 'popular' && styles.sortChipActive]}
          onPress={() => setSortMode('popular')}
        >
          <Ionicons name="flame-outline" size={13} color={sortMode === 'popular' ? Colors.white : Colors.textSecondary} />
          <Text style={[styles.sortText, sortMode === 'popular' && styles.sortTextActive]}>Popular</Text>
        </Pressable>

        <View style={styles.filterDivider} />

        {/* Category filters */}
        {(Object.keys(CATEGORY_LABELS) as FilterCategory[]).map((cat) => (
          <Pressable
            key={cat}
            style={[styles.sortChip, categoryFilter === cat && styles.sortChipActive]}
            onPress={() => setCategoryFilter(cat)}
          >
            <Text style={[styles.sortText, categoryFilter === cat && styles.sortTextActive]}>
              {CATEGORY_LABELS[cat]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Feed */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading community workouts…</Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(w) => w.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
            />
          }
          renderItem={({ item }) => (
            <WorkoutCard
              workout={item}
              currentUid={currentUid}
              onLike={handleLike}
              onStart={handleStart}
              onPress={(w) => navigation.navigate('CommunityWorkoutDetail', { workoutId: w.id })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={56} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No workouts yet</Text>
              <Text style={styles.emptySub}>Be the first to share a workout with the community!</Text>
              <Pressable
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('CreateWorkout')}
              >
                <Text style={styles.emptyBtnText}>Create Workout</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: { fontSize: Typography['2xl'], fontWeight: Typography.bold, color: Colors.textPrimary },
  subtitle: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  createBtnText: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.white },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, height: 42, color: Colors.textPrimary, fontSize: Typography.base },
  filterRow: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
    flexDirection: 'row',
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sortChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  sortText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  sortTextActive: { color: Colors.white },
  filterDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  list: { paddingHorizontal: Spacing.base, paddingBottom: 100, gap: Spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  loadingText: { fontSize: Typography.base, color: Colors.textSecondary },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.md },
  emptyTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.textPrimary },
  emptySub: { fontSize: Typography.base, color: Colors.textTertiary, textAlign: 'center', paddingHorizontal: Spacing.xl },
  emptyBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
  },
  emptyBtnText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.white },
});

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.accent },
  authorInfo: { flex: 1 },
  authorName: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary },
  date: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 1 },
  categoryBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full },
  categoryText: { fontSize: Typography.xs, fontWeight: Typography.semibold, textTransform: 'capitalize' },
  title: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: 4 },
  description: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 18, marginBottom: Spacing.md },
  exercisePreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.md },
  exerciseChip: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: 140,
  },
  exerciseChipText: { fontSize: Typography.xs, color: Colors.textSecondary },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: Typography.xs, color: Colors.textTertiary },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  likeBtnActive: { backgroundColor: Colors.error + '15', borderColor: Colors.error + '55' },
  likeCount: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textSecondary },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent + '22',
    borderWidth: 1,
    borderColor: Colors.accent + '44',
  },
  startText: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.accent },
  tagsRow: { marginTop: 4 },
  tag: { marginRight: 6 },
  tagText: { fontSize: Typography.xs, color: Colors.textTertiary },
});
