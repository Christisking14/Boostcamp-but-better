import React, { useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';

import { useWorkoutStore } from '../store/workoutStore';
import { Colors, Radius, Spacing, Typography } from '../theme';
import type { RootStackParamList } from '../types';

// TODO: Replace stub with RevenueCat react-native-purchases SDK for production
// import Purchases from 'react-native-purchases';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Paywall'>;
  route: RouteProp<RootStackParamList, 'Paywall'>;
};

const BENEFITS = [
  { icon: 'barbell', text: 'Access all 10+ programs' },
  { icon: 'calendar', text: 'Unlimited workout history' },
  { icon: 'trending-up', text: 'Progress graphs & analytics' },
  { icon: 'construct', text: 'Custom workout builder' },
  { icon: 'calculator', text: 'Plate calculator & 1RM tools' },
  { icon: 'chatbubble', text: 'Priority support' },
] as const;

type Plan = 'monthly' | 'annual';

export default function PaywallScreen({ navigation, route }: Props) {
  const setPremium = useWorkoutStore((s) => s.setPremium);
  const [selectedPlan, setSelectedPlan] = useState<Plan>('annual');
  const [loading, setLoading] = useState(false);

  const featureName = route.params?.feature;

  async function handlePurchase() {
    setLoading(true);
    try {
      // TODO: Integrate RevenueCat
      // const offerings = await Purchases.getOfferings();
      // const pkg = selectedPlan === 'annual'
      //   ? offerings.current?.annual
      //   : offerings.current?.monthly;
      // if (pkg) await Purchases.purchasePackage(pkg);

      // Stub: grant premium directly for now
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + (selectedPlan === 'annual' ? 1 : 0));
      expiresAt.setMonth(expiresAt.getMonth() + (selectedPlan === 'monthly' ? 1 : 0));
      setPremium(true, expiresAt.toISOString());
      navigation.goBack();
    } catch (e) {
      Alert.alert('Purchase Failed', 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleRestore() {
    Alert.alert('Restore Purchases', 'No active subscription found.');
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Close Button */}
        <SafeAreaView edges={['top']}>
          <Pressable style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>
        </SafeAreaView>

        {/* Hero */}
        <LinearGradient
          colors={[Colors.premiumDark + 'CC', Colors.premium + '44', 'transparent']}
          style={styles.hero}
        >
          <View style={styles.heroIcon}>
            <Ionicons name="star" size={48} color={Colors.premiumGold} />
          </View>
          <Text style={styles.heroTitle}>IronPath Pro</Text>
          {featureName ? (
            <Text style={styles.heroSubtitle}>
              Unlock <Text style={{ color: Colors.premiumGold }}>{featureName}</Text> and every premium feature
            </Text>
          ) : (
            <Text style={styles.heroSubtitle}>
              Unlock the full IronPath experience
            </Text>
          )}
        </LinearGradient>

        {/* Benefits */}
        <View style={styles.benefitsSection}>
          {BENEFITS.map((b) => (
            <View key={b.text} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Ionicons name={b.icon} size={18} color={Colors.premiumGold} />
              </View>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        <View style={styles.plansSection}>
          <Pressable
            style={[styles.planCard, selectedPlan === 'annual' && styles.planCardSelected]}
            onPress={() => setSelectedPlan('annual')}
          >
            <View style={styles.planLeft}>
              <View style={[styles.planRadio, selectedPlan === 'annual' && styles.planRadioSelected]}>
                {selectedPlan === 'annual' && <View style={styles.planRadioDot} />}
              </View>
              <View>
                <Text style={styles.planName}>Annual</Text>
                <Text style={styles.planPrice}>$49.99 / year</Text>
              </View>
            </View>
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>Save 48%</Text>
            </View>
          </Pressable>

          <Pressable
            style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <View style={styles.planLeft}>
              <View style={[styles.planRadio, selectedPlan === 'monthly' && styles.planRadioSelected]}>
                {selectedPlan === 'monthly' && <View style={styles.planRadioDot} />}
              </View>
              <View>
                <Text style={styles.planName}>Monthly</Text>
                <Text style={styles.planPrice}>$7.99 / month</Text>
              </View>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      {/* CTA */}
      <SafeAreaView edges={['bottom']} style={styles.ctaContainer}>
        <Pressable
          style={[styles.ctaBtn, loading && styles.ctaBtnLoading]}
          onPress={handlePurchase}
          disabled={loading}
        >
          <LinearGradient
            colors={[Colors.premiumDark, Colors.premium]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Ionicons name="star" size={18} color={Colors.premiumGold} />
            <Text style={styles.ctaText}>
              {loading ? 'Processing…' : 'Start 7-Day Free Trial'}
            </Text>
          </LinearGradient>
        </Pressable>

        <Pressable onPress={handleRestore} style={styles.restoreBtn}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </Pressable>

        <Text style={styles.legal}>
          Cancel anytime. Billed{' '}
          {selectedPlan === 'annual' ? 'annually at $49.99' : 'monthly at $7.99'}.{' '}
          Subscription auto-renews unless cancelled 24h before renewal date.
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 20 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    margin: Spacing.base,
    alignSelf: 'flex-end',
  },
  hero: { alignItems: 'center', paddingVertical: Spacing['2xl'], paddingHorizontal: Spacing.xl },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.premiumDark + '44',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.premiumGold + '44',
  },
  heroTitle: { fontSize: Typography['3xl'], fontWeight: Typography.black, color: Colors.white, marginBottom: Spacing.sm },
  heroSubtitle: { fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  benefitsSection: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.xl, gap: Spacing.md },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.premiumDark + '44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: { fontSize: Typography.base, color: Colors.textPrimary },
  plansSection: { paddingHorizontal: Spacing.base, gap: Spacing.md, paddingBottom: Spacing.xl },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  planCardSelected: { borderColor: Colors.premium },
  planLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRadioSelected: { borderColor: Colors.premium },
  planRadioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.premium },
  planName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  planPrice: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  savingsBadge: {
    backgroundColor: Colors.success + '22',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  savingsText: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.success },
  ctaContainer: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  ctaBtn: { borderRadius: Radius.full, overflow: 'hidden', marginBottom: Spacing.md },
  ctaBtnLoading: { opacity: 0.7 },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 2,
  },
  ctaText: { fontSize: Typography.md, fontWeight: Typography.bold, color: Colors.white },
  restoreBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  restoreText: { fontSize: Typography.sm, color: Colors.textSecondary },
  legal: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
    paddingBottom: Spacing.sm,
  },
});
