import React from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { useWorkoutStore } from '../store/workoutStore';
import { getProgramById } from '../data/programs';
import { Colors, Radius, Spacing, Typography } from '../theme';
import type { RootStackParamList } from '../types';

type ProfileNavProp = StackNavigationProp<RootStackParamList>;

const APP_VERSION = '1.0.0';

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileNavProp>();

  const user = useWorkoutStore((s) => s.user);
  const sessions = useWorkoutStore((s) => s.sessions);
  const prs = useWorkoutStore((s) => s.prs);
  const getStreakDays = useWorkoutStore((s) => s.getStreakDays);
  const getTotalVolume = useWorkoutStore((s) => s.getTotalVolume);
  const updateUser = useWorkoutStore((s) => s.updateUser);

  const currentProgram = user.currentProgramId ? getProgramById(user.currentProgramId) : null;
  const streak = getStreakDays();
  const totalVolume = getTotalVolume();

  const joinedDate = new Date(user.joinedAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  function handleToggleUnit() {
    updateUser({ unitSystem: user.unitSystem === 'imperial' ? 'metric' : 'imperial' });
  }

  function handleResetProgress() {
    Alert.alert(
      'Reset Progress',
      'This will delete all your workout history and PRs. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            // Only clear sessions/prs, keep user profile
            useWorkoutStore.setState({ sessions: [], prs: [], activeSession: null });
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name ? user.name.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{user.name || 'Athlete'}</Text>
              {user.isPremium && (
                <View style={styles.proBadge}>
                  <Ionicons name="star" size={10} color={Colors.premiumGold} />
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              )}
            </View>
            <Text style={styles.joinDate}>Member since {joinedDate}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatCard value={sessions.length.toString()} label="Workouts" />
          <StatCard value={streak.toString()} label="Day Streak" />
          <StatCard value={prs.length.toString()} label="PRs" />
          <StatCard value={formatVolume(totalVolume)} label="Volume (lbs)" />
        </View>

        {/* Premium Upgrade (if not premium) */}
        {!user.isPremium && (
          <Pressable
            style={styles.upgradeCard}
            onPress={() => navigation.navigate('Paywall', {})}
          >
            <LinearGradient
              colors={[Colors.premiumDark, Colors.premium]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.upgradeGradient}
            >
              <View style={styles.upgradeLeft}>
                <Ionicons name="star" size={24} color={Colors.premiumGold} />
                <View>
                  <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
                  <Text style={styles.upgradeDesc}>Unlock all programs & features</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </Pressable>
        )}

        {/* Current Program */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Training</Text>
          <SettingsRow
            icon="barbell"
            label="Current Program"
            value={currentProgram?.name ?? 'None selected'}
            onPress={() => navigation.navigate('Programs')}
          />
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.settingsCard}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Ionicons name="scale-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.toggleLabel}>Use Kilograms</Text>
              </View>
              <Switch
                value={user.unitSystem === 'metric'}
                onValueChange={handleToggleUnit}
                trackColor={{ false: Colors.border, true: Colors.accent }}
                thumbColor={Colors.white}
              />
            </View>
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.settingsCard}>
            <SettingsRowInCard
              icon="refresh"
              label="Restore Purchases"
              onPress={() => Alert.alert('Restore Purchases', 'No active subscription found.')}
            />
            <View style={styles.rowDivider} />
            <SettingsRowInCard
              icon="star-outline"
              label="Rate IronPath"
              onPress={() => {
                // Replace with actual App Store link
                Linking.openURL('https://apps.apple.com');
              }}
            />
            <View style={styles.rowDivider} />
            <SettingsRowInCard
              icon="shield-outline"
              label="Privacy Policy"
              onPress={() => Linking.openURL('https://example.com/privacy')}
            />
            <View style={styles.rowDivider} />
            <SettingsRowInCard
              icon="document-text-outline"
              label="Terms of Service"
              onPress={() => Linking.openURL('https://example.com/terms')}
            />
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <View style={styles.settingsCard}>
            <SettingsRowInCard
              icon="trash-outline"
              label="Reset Progress"
              labelColor={Colors.error}
              onPress={handleResetProgress}
            />
          </View>
        </View>

        <Text style={styles.version}>IronPath v{APP_VERSION}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={statStyles.card}>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.settingsCard} onPress={onPress}>
      <Ionicons name={icon} size={20} color={Colors.textSecondary} />
      <Text style={styles.settingsLabel}>{label}</Text>
      <View style={{ flex: 1 }} />
      {value && <Text style={styles.settingsValue}>{value}</Text>}
      <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
    </Pressable>
  );
}

function SettingsRowInCard({
  icon,
  label,
  labelColor,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  labelColor?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.inCardRow} onPress={onPress}>
      <Ionicons name={icon} size={20} color={labelColor ?? Colors.textSecondary} />
      <Text style={[styles.settingsLabel, labelColor ? { color: labelColor } : {}]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} style={{ marginLeft: 'auto' }} />
    </Pressable>
  );
}

function formatVolume(lbs: number): string {
  if (lbs >= 1_000_000) return `${(lbs / 1_000_000).toFixed(1)}M`;
  if (lbs >= 1_000) return `${(lbs / 1_000).toFixed(0)}k`;
  return lbs.toFixed(0);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 100 },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: Typography['2xl'], fontWeight: Typography.bold, color: Colors.white },
  profileInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  name: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.premiumGold + '22',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  proBadgeText: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.premiumGold },
  joinDate: { fontSize: Typography.sm, color: Colors.textTertiary, marginTop: 4 },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.sm,
  },
  upgradeCard: { marginHorizontal: Spacing.base, marginBottom: Spacing.xl, borderRadius: Radius.lg, overflow: 'hidden' },
  upgradeGradient: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, gap: Spacing.md },
  upgradeLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  upgradeTitle: { fontSize: Typography.md, fontWeight: Typography.bold, color: Colors.white },
  upgradeDesc: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  section: { paddingHorizontal: Spacing.base, marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textTertiary, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  settingsCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  settingsLabel: { fontSize: Typography.base, color: Colors.textPrimary },
  settingsValue: { fontSize: Typography.sm, color: Colors.textSecondary },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  toggleLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  toggleLabel: { fontSize: Typography.base, color: Colors.textPrimary },
  inCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  rowDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
  version: { textAlign: 'center', fontSize: Typography.sm, color: Colors.textTertiary, paddingBottom: Spacing.xl },
});

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  value: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  label: { fontSize: Typography.xs, color: Colors.textTertiary, textAlign: 'center' },
});
