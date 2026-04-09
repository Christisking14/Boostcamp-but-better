import React from 'react';
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
import { formatWeight, formatDate } from '../utils/calculations';
import { Colors, Radius, Spacing, Typography } from '../theme';
import type { RootStackParamList, TabParamList, Program } from '../types';

type HomeNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  StackNavigationProp<RootStackParamList>
>;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const isFocused = useIsFocused();

  const user = useWorkoutStore((s) => s.user);
  const getStreakDays = useWorkoutStore((s) => s.getStreakDays);
  const getSessionsThisWeek = useWorkoutStore((s) => s.getSessionsThisWeek);
  const getTotalVolume = useWorkoutStore((s) => s.getTotalVolume);
  const getRecentSessions = useWorkoutStore((s) => s.getRecentSessions);

  const currentProgram = user.currentProgramId ? getProgramById(user.currentProgramId) : null;
  const sessionsThisWeek = getSessionsThisWeek();
  const streak = getStreakDays();
  const totalVolume = getTotalVolume();
  const recentSessions = getRecentSessions(3);
  const featuredPrograms = PROGRAMS.filter((p) => !p.isPremium).slice(0, 3);

  function handleContinueWorkout() {
    if (!currentProgram) return;
    const week = currentProgram.weeks[user.currentWeek - 1] ?? currentProgram.weeks[0];
    const day = week?.days[user.currentDay] ?? week?.days[0];
    if (!day || day.isRestDay) {
      // advance to next non-rest day
      const nextDay = week?.days.find((d) => !d.isRestDay);
      if (!nextDay) return;
      navigation.navigate('ActiveWorkout', {
        programId: currentProgram.id,
        dayId: nextDay.id,
        programName: currentProgram.name,
        dayName: nextDay.name,
      });
    } else {
      navigation.navigate('ActiveWorkout', {
        programId: currentProgram.id,
        dayId: day.id,
        programName: currentProgram.name,
        dayName: day.name,
      });
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.name}>{user.name || 'Athlete'}</Text>
          </View>
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakFlame}>🔥</Text>
              <Text style={styles.streakText}>{streak}</Text>
            </View>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <StatCard
            icon="barbell-outline"
            value={sessionsThisWeek.length.toString()}
            label="This week"
            color={Colors.accent}
          />
          <StatCard
            icon="flame-outline"
            value={streak.toString()}
            label="Day streak"
            color="#F59E0B"
          />
          <StatCard
            icon="trending-up-outline"
            value={formatVolume(totalVolume)}
            label="Total volume"
            color={Colors.info}
          />
        </View>

        {/* Current Program */}
        {currentProgram ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Program</Text>
            <LinearGradient
              colors={[currentProgram.accentColor + 'DD', currentProgram.accentColor + '66']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.currentProgramCard}
            >
              <View>
                <Text style={styles.currentProgramName}>{currentProgram.name}</Text>
                <Text style={styles.currentProgramMeta}>
                  Week {user.currentWeek} · {currentProgram.daysPerWeek}x/week
                </Text>
              </View>
              <Pressable style={styles.continueBtn} onPress={handleContinueWorkout}>
                <Text style={styles.continueBtnText}>Start Workout</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.white} />
              </Pressable>
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.noProgramCard}>
              <Ionicons name="barbell-outline" size={36} color={Colors.textTertiary} />
              <Text style={styles.noProgramTitle}>No program selected</Text>
              <Text style={styles.noProgramSub}>Choose a program to start training</Text>
              <Pressable
                style={styles.chooseProgramBtn}
                onPress={() => navigation.navigate('Programs')}
              >
                <Text style={styles.chooseProgramText}>Browse Programs</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Recent Workouts */}
        {recentSessions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Workouts</Text>
              <Pressable onPress={() => navigation.navigate('History')}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            {recentSessions.map((s) => (
              <View key={s.id} style={styles.sessionCard}>
                <View style={styles.sessionLeft}>
                  <Text style={styles.sessionDay}>{s.dayName}</Text>
                  <Text style={styles.sessionProgram}>{s.programName ?? 'Custom'}</Text>
                </View>
                <View style={styles.sessionRight}>
                  <Text style={styles.sessionDate}>{formatDate(s.startedAt)}</Text>
                  <Text style={styles.sessionSets}>{s.completedSets.length} sets</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Featured Programs */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Programs</Text>
            <Pressable onPress={() => navigation.navigate('Programs')}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredScroll}>
            {featuredPrograms.map((program) => (
              <FeaturedProgramCard
                key={program.id}
                program={program}
                onPress={() => navigation.navigate('ProgramDetail', { programId: program.id })}
              />
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={statStyles.card}>
      <View style={[statStyles.iconWrap, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={statStyles.value}>{value}</Text>
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
  return (
    <Pressable style={featuredStyles.card} onPress={onPress}>
      <LinearGradient
        colors={[program.accentColor + 'EE', program.accentColor + '66']}
        style={featuredStyles.gradient}
      >
        <Text style={featuredStyles.name}>{program.name}</Text>
        <Text style={featuredStyles.meta}>{program.daysPerWeek}x/week · {program.level}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function formatVolume(lbs: number): string {
  if (lbs >= 1_000_000) return `${(lbs / 1_000_000).toFixed(1)}M`;
  if (lbs >= 1_000) return `${(lbs / 1_000).toFixed(0)}k`;
  return lbs.toString();
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  greeting: { fontSize: Typography.base, color: Colors.textSecondary },
  name: { fontSize: Typography['2xl'], fontWeight: Typography.bold, color: Colors.textPrimary, marginTop: 2 },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B22',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    gap: 4,
  },
  streakFlame: { fontSize: 18 },
  streakText: { fontSize: Typography.lg, fontWeight: Typography.bold, color: '#F59E0B' },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  section: { paddingHorizontal: Spacing.base, marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.textPrimary },
  seeAll: { fontSize: Typography.sm, color: Colors.accent, fontWeight: Typography.medium },
  currentProgramCard: {
    borderRadius: Radius.lg,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  currentProgramName: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.white },
  currentProgramMeta: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    gap: 6,
  },
  continueBtnText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.white },
  noProgramCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  noProgramTitle: { fontSize: Typography.md, fontWeight: Typography.semibold, color: Colors.textPrimary, marginTop: 4 },
  noProgramSub: { fontSize: Typography.sm, color: Colors.textSecondary, textAlign: 'center' },
  chooseProgramBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
  },
  chooseProgramText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.white },
  sessionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sessionLeft: { gap: 2 },
  sessionRight: { alignItems: 'flex-end', gap: 2 },
  sessionDay: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textPrimary },
  sessionProgram: { fontSize: Typography.xs, color: Colors.textTertiary },
  sessionDate: { fontSize: Typography.xs, color: Colors.textSecondary },
  sessionSets: { fontSize: Typography.xs, color: Colors.textTertiary },
  featuredScroll: { marginHorizontal: -Spacing.base, paddingHorizontal: Spacing.base },
});

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconWrap: { padding: 8, borderRadius: Radius.sm, marginBottom: 2 },
  value: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  label: { fontSize: Typography.xs, color: Colors.textTertiary, textAlign: 'center' },
});

const featuredStyles = StyleSheet.create({
  card: {
    width: 180,
    height: 100,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginRight: Spacing.md,
  },
  gradient: { flex: 1, padding: Spacing.md, justifyContent: 'flex-end' },
  name: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.white },
  meta: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
});
