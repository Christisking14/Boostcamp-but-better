import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';

import { PROGRAMS } from '../data/programs';
import { useWorkoutStore } from '../store/workoutStore';
import { Colors, Radius, Spacing, Typography } from '../theme';
import type { RootStackParamList, TabParamList, Program } from '../types';

type ProgramsNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Programs'>,
  StackNavigationProp<RootStackParamList>
>;

type FilterLevel = 'All' | 'beginner' | 'intermediate' | 'advanced';
type FilterCategory = 'All' | 'strength' | 'hypertrophy' | 'powerlifting' | 'general';

const LEVEL_COLORS: Record<string, string> = {
  beginner: Colors.success,
  intermediate: Colors.warning,
  advanced: Colors.error,
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export default function ProgramsScreen() {
  const navigation = useNavigation<ProgramsNavProp>();
  const currentProgramId = useWorkoutStore((s) => s.user.currentProgramId);
  const isPremium = useWorkoutStore((s) => s.user.isPremium);

  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<FilterLevel>('All');
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('All');

  const filtered = PROGRAMS.filter((p) => {
    const matchSearch =
      search.length === 0 ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.author.toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === 'All' || p.level === levelFilter;
    const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
    return matchSearch && matchLevel && matchCat;
  });

  function handleProgramPress(program: Program) {
    if (program.isPremium && !isPremium) {
      navigation.navigate('Paywall', { feature: program.name });
    } else {
      navigation.navigate('ProgramDetail', { programId: program.id });
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Programs</Text>
        <Text style={styles.subtitle}>{PROGRAMS.length} training programs</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={Colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search programs..."
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {/* Level Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {(['All', 'beginner', 'intermediate', 'advanced'] as FilterLevel[]).map((f) => (
          <Pressable
            key={f}
            style={[styles.filterChip, levelFilter === f && styles.filterChipActive]}
            onPress={() => setLevelFilter(f)}
          >
            <Text style={[styles.filterLabel, levelFilter === f && styles.filterLabelActive]}>
              {f === 'All' ? 'All Levels' : LEVEL_LABELS[f]}
            </Text>
          </Pressable>
        ))}
        <View style={styles.filterDivider} />
        {(['strength', 'hypertrophy', 'powerlifting'] as FilterCategory[]).map((f) => (
          <Pressable
            key={f}
            style={[styles.filterChip, categoryFilter === f && styles.filterChipActive]}
            onPress={() => setCategoryFilter(categoryFilter === f ? 'All' : f)}
          >
            <Text style={[styles.filterLabel, categoryFilter === f && styles.filterLabelActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Program List */}
      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        renderItem={({ item: program }) => {
          const isEnrolled = currentProgramId === program.id;
          const isLocked = program.isPremium && !isPremium;
          return (
            <Pressable
              style={[styles.card, isEnrolled && styles.cardEnrolled]}
              onPress={() => handleProgramPress(program)}
            >
              {/* Accent stripe */}
              <View style={[styles.accentStripe, { backgroundColor: program.accentColor }]} />

              <View style={styles.cardBody}>
                {/* Top row */}
                <View style={styles.cardTopRow}>
                  <View style={styles.cardTitleGroup}>
                    <Text style={styles.cardName}>{program.name}</Text>
                    <Text style={styles.cardAuthor}>by {program.author}</Text>
                  </View>
                  <View style={styles.cardBadges}>
                    {isEnrolled && (
                      <View style={styles.enrolledBadge}>
                        <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                        <Text style={styles.enrolledText}>Active</Text>
                      </View>
                    )}
                    {isLocked && (
                      <View style={styles.premiumBadge}>
                        <Ionicons name="lock-closed" size={12} color={Colors.premiumGold} />
                        <Text style={styles.premiumText}>PRO</Text>
                      </View>
                    )}
                  </View>
                </View>

                <Text style={styles.cardDesc} numberOfLines={2}>
                  {program.shortDescription}
                </Text>

                {/* Stats row */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Ionicons name="calendar-outline" size={13} color={Colors.textTertiary} />
                    <Text style={styles.statText}>{program.daysPerWeek}x/week</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="time-outline" size={13} color={Colors.textTertiary} />
                    <Text style={styles.statText}>{program.duration}</Text>
                  </View>
                  <View style={[styles.levelBadge, { backgroundColor: LEVEL_COLORS[program.level] + '22' }]}>
                    <Text style={[styles.levelText, { color: LEVEL_COLORS[program.level] }]}>
                      {LEVEL_LABELS[program.level]}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="barbell-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No programs found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.base, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  title: { fontSize: Typography['2xl'], fontWeight: Typography.bold, color: Colors.textPrimary },
  subtitle: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.base,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: { marginRight: Spacing.sm },
  searchInput: {
    flex: 1,
    height: 42,
    color: Colors.textPrimary,
    fontSize: Typography.base,
  },
  filterRow: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.md, gap: Spacing.sm, flexDirection: 'row' },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterLabel: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  filterLabelActive: { color: Colors.white },
  filterDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  list: { paddingHorizontal: Spacing.base, paddingBottom: 100, gap: Spacing.md },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardEnrolled: { borderColor: Colors.accent + '55' },
  accentStripe: { width: 4 },
  cardBody: { flex: 1, padding: Spacing.md },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardTitleGroup: { flex: 1 },
  cardName: { fontSize: Typography.md, fontWeight: Typography.semibold, color: Colors.textPrimary },
  cardAuthor: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 2 },
  cardBadges: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  enrolledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.success + '22',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  enrolledText: { fontSize: Typography.xs, color: Colors.success, fontWeight: Typography.semibold },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.premiumGold + '22',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  premiumText: { fontSize: Typography.xs, color: Colors.premiumGold, fontWeight: Typography.bold },
  cardDesc: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 18, marginBottom: 10 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: Typography.xs, color: Colors.textTertiary },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  levelText: { fontSize: Typography.xs, fontWeight: Typography.semibold },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: Typography.base, color: Colors.textTertiary },
});
