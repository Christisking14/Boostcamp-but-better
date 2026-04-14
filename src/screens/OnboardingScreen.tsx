import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWorkoutStore } from '../store/workoutStore';
import { Colors, Radius, Shadow, Spacing, Typography } from '../theme';
import type { RootStackParamList } from '../types';

import type { StackNavigationProp } from '@react-navigation/stack';

// ─── Types ────────────────────────────────────────────────────────────────────

type OnboardingNavigationProp = StackNavigationProp<RootStackParamList, 'Onboarding'>;

interface Props {
  navigation: OnboardingNavigationProp;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_STEPS = 4;

const GOAL_OPTIONS = [
  { id: 'build-muscle', label: 'Build Muscle', icon: 'body' as const },
  { id: 'get-stronger', label: 'Get Stronger', icon: 'barbell' as const },
  { id: 'lose-weight', label: 'Lose Weight', icon: 'flame' as const },
  { id: 'improve-fitness', label: 'Improve Fitness', icon: 'pulse' as const },
  { id: 'train-for-sport', label: 'Train for Sport', icon: 'trophy' as const },
];

const EXPERIENCE_OPTIONS = [
  { id: 'beginner', label: 'Beginner', sublabel: '< 1 year' },
  { id: 'intermediate', label: 'Intermediate', sublabel: '1–3 years' },
  { id: 'advanced', label: 'Advanced', sublabel: '3+ years' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const completeOnboarding = useWorkoutStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<string | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // ── Navigation helpers ──────────────────────────────────────────────────────

  function animateTransition(nextStep: number) {
    const direction = nextStep > step ? 1 : -1;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -direction * 30,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(direction * 30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }

  function handleNext() {
    if (step < TOTAL_STEPS - 1) {
      animateTransition(step + 1);
    } else {
      handleFinish();
    }
  }

  function handleBack() {
    if (step > 0) {
      animateTransition(step - 1);
    }
  }

  function handleFinish() {
    const trimmedName = name.trim() || 'Athlete';
    const goals = selectedGoals.length > 0 ? selectedGoals : ['improve-fitness'];
    completeOnboarding(trimmedName, goals, 'imperial');
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  }

  // ── Goal toggle ─────────────────────────────────────────────────────────────

  function toggleGoal(goalId: string) {
    setSelectedGoals((prev) =>
      prev.includes(goalId) ? prev.filter((g) => g !== goalId) : [...prev, goalId],
    );
  }

  // ── CTA validity ────────────────────────────────────────────────────────────

  function isNextEnabled(): boolean {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return selectedGoals.length > 0;
    if (step === 3) return selectedExperience !== null;
    return true;
  }

  // ── Render steps ────────────────────────────────────────────────────────────

  function renderStep() {
    switch (step) {
      case 0:
        return <StepWelcome />;
      case 1:
        return (
          <StepName
            name={name}
            onChangeName={setName}
          />
        );
      case 2:
        return (
          <StepGoals
            selectedGoals={selectedGoals}
            onToggleGoal={toggleGoal}
          />
        );
      case 3:
        return (
          <StepExperience
            selected={selectedExperience}
            onSelect={setSelectedExperience}
          />
        );
      default:
        return null;
    }
  }

  const isLastStep = step === TOTAL_STEPS - 1;
  const ctaLabel = step === 0 ? 'Get Started' : isLastStep ? "Let's Go" : 'Continue';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#1A0800', Colors.background]}
        locations={[0, 0.45]}
        style={StyleSheet.absoluteFill}
      />

      {/* Step dots */}
      {step > 0 && (
        <View style={styles.dotsRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === step && styles.dotActive,
                i < step && styles.dotPast,
              ]}
            />
          ))}
        </View>
      )}

      {/* Back button */}
      {step > 0 && (
        <Pressable
          onPress={handleBack}
          style={[styles.backButton, { top: insets.top + 12 }]}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={26} color={Colors.textSecondary} />
        </Pressable>
      )}

      {/* Animated content */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.stepContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {renderStep()}
          </Animated.View>
        </ScrollView>

        {/* CTA button */}
        <View style={[styles.ctaContainer, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable
            onPress={handleNext}
            disabled={!isNextEnabled()}
            style={({ pressed }) => [
              styles.ctaButton,
              !isNextEnabled() && styles.ctaButtonDisabled,
              pressed && styles.ctaButtonPressed,
            ]}
          >
            <LinearGradient
              colors={
                isNextEnabled()
                  ? [Colors.accentLight, Colors.accent, Colors.accentDark]
                  : [Colors.cardElevated, Colors.card]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text
                style={[
                  styles.ctaText,
                  !isNextEnabled() && styles.ctaTextDisabled,
                ]}
              >
                {ctaLabel}
              </Text>
              {step > 0 && isNextEnabled() && (
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color={Colors.white}
                  style={styles.ctaIcon}
                />
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Step 0: Welcome ──────────────────────────────────────────────────────────

function StepWelcome() {
  return (
    <View style={stepStyles.welcome}>
      <View style={stepStyles.iconWrapper}>
        <LinearGradient
          colors={[Colors.accentLight, Colors.accent, Colors.accentDark]}
          style={stepStyles.iconGradient}
        >
          <Ionicons name="barbell" size={72} color={Colors.white} />
        </LinearGradient>
        {/* Glow ring */}
        <View style={stepStyles.iconGlow} />
      </View>

      <Text style={stepStyles.appName}>IronPath</Text>
      <Text style={stepStyles.tagline}>
        Build strength.{'\n'}Track progress.{'\n'}Get results.
      </Text>
      <Text style={stepStyles.subtitle}>
        Your complete strength training companion.{'\n'}
        Let's set up your profile in just a minute.
      </Text>
    </View>
  );
}

// ─── Step 1: Name ─────────────────────────────────────────────────────────────

interface StepNameProps {
  name: string;
  onChangeName: (v: string) => void;
}

function StepName({ name, onChangeName }: StepNameProps) {
  return (
    <View style={stepStyles.generic}>
      <View style={stepStyles.stepIconSmall}>
        <Ionicons name="person" size={28} color={Colors.accent} />
      </View>
      <Text style={stepStyles.stepTitle}>What should we call you?</Text>
      <Text style={stepStyles.stepSubtitle}>
        We'll personalize your experience.
      </Text>
      <TextInput
        style={stepStyles.textInput}
        placeholder="Your name"
        placeholderTextColor={Colors.textTertiary}
        value={name}
        onChangeText={onChangeName}
        autoFocus
        autoCorrect={false}
        returnKeyType="done"
        maxLength={40}
        selectionColor={Colors.accent}
      />
    </View>
  );
}

// ─── Step 2: Goals ────────────────────────────────────────────────────────────

interface StepGoalsProps {
  selectedGoals: string[];
  onToggleGoal: (id: string) => void;
}

function StepGoals({ selectedGoals, onToggleGoal }: StepGoalsProps) {
  return (
    <View style={stepStyles.generic}>
      <View style={stepStyles.stepIconSmall}>
        <Ionicons name="flag" size={28} color={Colors.accent} />
      </View>
      <Text style={stepStyles.stepTitle}>What's your goal?</Text>
      <Text style={stepStyles.stepSubtitle}>Choose all that apply.</Text>

      <View style={stepStyles.goalGrid}>
        {GOAL_OPTIONS.map((goal) => {
          const isSelected = selectedGoals.includes(goal.id);
          return (
            <Pressable
              key={goal.id}
              onPress={() => onToggleGoal(goal.id)}
              style={({ pressed }) => [
                stepStyles.goalCard,
                isSelected && stepStyles.goalCardSelected,
                pressed && stepStyles.goalCardPressed,
              ]}
            >
              {isSelected && (
                <LinearGradient
                  colors={['rgba(255,107,53,0.18)', 'rgba(255,107,53,0.06)']}
                  style={[StyleSheet.absoluteFill, { borderRadius: Radius.lg }]}
                />
              )}
              <View
                style={[
                  stepStyles.goalIcon,
                  isSelected && stepStyles.goalIconSelected,
                ]}
              >
                <Ionicons
                  name={goal.icon}
                  size={22}
                  color={isSelected ? Colors.white : Colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  stepStyles.goalLabel,
                  isSelected && stepStyles.goalLabelSelected,
                ]}
              >
                {goal.label}
              </Text>
              {isSelected && (
                <View style={stepStyles.checkmark}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.accent} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Step 3: Experience ───────────────────────────────────────────────────────

interface StepExperienceProps {
  selected: string | null;
  onSelect: (id: string) => void;
}

function StepExperience({ selected, onSelect }: StepExperienceProps) {
  return (
    <View style={stepStyles.generic}>
      <View style={stepStyles.stepIconSmall}>
        <Ionicons name="ribbon" size={28} color={Colors.accent} />
      </View>
      <Text style={stepStyles.stepTitle}>How experienced are you?</Text>
      <Text style={stepStyles.stepSubtitle}>
        We'll recommend programs that fit your level.
      </Text>

      <View style={stepStyles.experienceList}>
        {EXPERIENCE_OPTIONS.map((opt, index) => {
          const isSelected = selected === opt.id;
          const levelIcon =
            index === 0 ? 'leaf' : index === 1 ? 'flash' : ('rocket' as const);
          return (
            <Pressable
              key={opt.id}
              onPress={() => onSelect(opt.id)}
              style={({ pressed }) => [
                stepStyles.experienceCard,
                isSelected && stepStyles.experienceCardSelected,
                pressed && stepStyles.experienceCardPressed,
              ]}
            >
              {isSelected && (
                <LinearGradient
                  colors={['rgba(255,107,53,0.15)', 'rgba(255,107,53,0.04)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: Radius.lg }]}
                />
              )}
              <View
                style={[
                  stepStyles.expIconBox,
                  isSelected && stepStyles.expIconBoxSelected,
                ]}
              >
                <Ionicons
                  name={levelIcon}
                  size={24}
                  color={isSelected ? Colors.white : Colors.textSecondary}
                />
              </View>
              <View style={stepStyles.expTextGroup}>
                <Text
                  style={[
                    stepStyles.expLabel,
                    isSelected && stepStyles.expLabelSelected,
                  ]}
                >
                  {opt.label}
                </Text>
                <Text style={stepStyles.expSublabel}>{opt.sublabel}</Text>
              </View>
              <View
                style={[
                  stepStyles.radioOuter,
                  isSelected && stepStyles.radioOuterSelected,
                ]}
              >
                {isSelected && <View style={stepStyles.radioInner} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Root Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.accent,
  },
  dotPast: {
    backgroundColor: Colors.accentDark,
    opacity: 0.5,
  },
  backButton: {
    position: 'absolute',
    left: Spacing.base,
    zIndex: 10,
    padding: Spacing.xs,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.xl,
  },
  stepContainer: {
    flex: 1,
  },
  ctaContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.base,
  },
  ctaButton: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  ctaButtonDisabled: {
    opacity: 0.55,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing['2xl'],
    borderRadius: Radius.xl,
  },
  ctaText: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  ctaTextDisabled: {
    color: Colors.textTertiary,
  },
  ctaIcon: {
    marginLeft: Spacing.sm,
  },
});

// ─── Step Styles ──────────────────────────────────────────────────────────────

const stepStyles = StyleSheet.create({
  // Welcome
  welcome: {
    alignItems: 'center',
    paddingTop: Spacing['2xl'],
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: Spacing['2xl'],
  },
  iconGradient: {
    width: 140,
    height: 140,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    position: 'absolute',
    inset: -12,
    borderRadius: 52,
    backgroundColor: 'rgba(255,107,53,0.18)',
    zIndex: -1,
  },
  appName: {
    fontSize: Typography['4xl'],
    fontWeight: Typography.black,
    color: Colors.textPrimary,
    letterSpacing: -1.5,
    marginBottom: Spacing.base,
  },
  tagline: {
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
    color: Colors.accent,
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: Spacing.xl,
  },
  subtitle: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Generic step wrapper
  generic: {
    paddingTop: Spacing.xl,
  },
  stepIconSmall: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,107,53,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.2)',
  },
  stepTitle: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    lineHeight: 34,
  },
  stepSubtitle: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    marginBottom: Spacing['2xl'],
    lineHeight: 22,
  },

  // Name input
  textInput: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Typography.md,
    color: Colors.textPrimary,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },

  // Goals
  goalGrid: {
    gap: Spacing.md,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  goalCardSelected: {
    borderColor: Colors.accent,
  },
  goalCardPressed: {
    opacity: 0.8,
  },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  goalIconSelected: {
    backgroundColor: Colors.accent,
  },
  goalLabel: {
    flex: 1,
    fontSize: Typography.md,
    fontWeight: Typography.medium,
    color: Colors.textSecondary,
  },
  goalLabelSelected: {
    color: Colors.textPrimary,
    fontWeight: Typography.semibold,
  },
  checkmark: {
    marginLeft: Spacing.sm,
  },

  // Experience
  experienceList: {
    gap: Spacing.md,
  },
  experienceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  experienceCardSelected: {
    borderColor: Colors.accent,
  },
  experienceCardPressed: {
    opacity: 0.8,
  },
  expIconBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  expIconBoxSelected: {
    backgroundColor: Colors.accent,
  },
  expTextGroup: {
    flex: 1,
  },
  expLabel: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  expLabelSelected: {
    color: Colors.textPrimary,
  },
  expSublabel: {
    fontSize: Typography.sm,
    color: Colors.textTertiary,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.accent,
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
  },
});
