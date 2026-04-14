import React, { useState, useMemo, useCallback } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { useWorkoutStore } from '../store/workoutStore';
import { Colors, Gradients, Typography, Spacing, Radius, Shadow } from '../theme';
import type { TabParamList } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProgressNavProp = BottomTabNavigationProp<TabParamList, 'Progress'>;

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = Spacing.base;
const CARD_WIDTH = SCREEN_WIDTH - Spacing.base * 2;
const CHART_HEIGHT = 148;
const Y_AXIS_WIDTH = 44;
const BARS_AREA_WIDTH = CARD_WIDTH - CARD_PADDING * 2 - Y_AXIS_WIDTH - Spacing.xs;
const BW_CHART_WIDTH = CARD_WIDTH - CARD_PADDING * 2 - Spacing.base * 2;

// ─── Utility Helpers ─────────────────────────────────────────────────────────

function formatVolumeAxis(v: number): string {
  if (v === 0) return '0';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return `${Math.round(v)}`;
}

function formatVolumeSubtitle(v: number, unit: string): string {
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k ${unit}`;
  return `${Math.round(v)} ${unit}`;
}

function getWeekShortLabel(dateStr: string, index: number): string {
  try {
    const d = new Date(dateStr);
    const month = d.toLocaleString('en-US', { month: 'short' });
    const day = d.getDate();
    return `${month.slice(0, 1)}${day}`;
  } catch {
    return `W${index + 1}`;
  }
}

function brzycki1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  const r = Math.min(reps, 36);
  return Math.round((weight * 36) / (37 - r));
}

function niceAxisMax(maxVal: number): number {
  if (maxVal <= 0) return 25_000;
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
  const normalized = maxVal / magnitude;
  let nice: number;
  if (normalized <= 1) nice = 1;
  else if (normalized <= 2) nice = 2;
  else if (normalized <= 2.5) nice = 2.5;
  else if (normalized <= 5) nice = 5;
  else nice = 10;
  return nice * magnitude;
}

// ─── SectionCard ─────────────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.sectionCard}>{children}</View>;
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon as any} size={36} color={Colors.textTertiary} />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

// ─── 1. Weekly Volume Bar Chart ───────────────────────────────────────────────

function WeeklyVolumeChart() {
  const volumeByWeek = useWorkoutStore((s) => s.getVolumeByWeek(8));
  const sessions = useWorkoutStore((s) => s.sessions);
  const user = useWorkoutStore((s) => s.user);
  const unitLabel = user.unitSystem === 'imperial' ? 'lbs' : 'kg';

  const thisWeekVolume = useMemo(() => {
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);
    monday.setHours(0, 0, 0, 0);
    return sessions
      .filter((s) => new Date(s.startedAt) >= monday && s.isComplete)
      .reduce((sum, s) => sum + s.totalVolume, 0);
  }, [sessions]);

  const hasData = volumeByWeek.some((p) => p.volume > 0);

  const maxVolume = useMemo(
    () => Math.max(...volumeByWeek.map((p) => p.volume), 1),
    [volumeByWeek],
  );

  const axisMax = useMemo(() => niceAxisMax(maxVolume), [maxVolume]);
  const yLabels = useMemo(() => [axisMax, axisMax / 2, 0], [axisMax]);

  const barCount = volumeByWeek.length;
  const gapTotal = Spacing['2xs'] * (barCount - 1);
  const barWidth = Math.floor((BARS_AREA_WIDTH - gapTotal) / barCount);

  return (
    <SectionCard>
      <SectionHeader
        title="Weekly Volume"
        subtitle={
          hasData
            ? `This week · ${formatVolumeSubtitle(thisWeekVolume, unitLabel)}`
            : 'No data yet'
        }
      />

      {!hasData ? (
        <EmptyState
          icon="bar-chart-outline"
          message="Complete workouts to see your progress"
        />
      ) : (
        <View style={styles.chartOuter}>
          {/* Y-axis */}
          <View style={[styles.yAxis, { height: CHART_HEIGHT + 22 }]}>
            {yLabels.map((label, i) => {
              const bottomOffset =
                i === 2 ? 22 : i === 1 ? CHART_HEIGHT / 2 + 22 - 7 : CHART_HEIGHT + 22 - 14;
              return (
                <Text
                  key={i}
                  style={[styles.yAxisLabel, { position: 'absolute', bottom: bottomOffset }]}
                >
                  {formatVolumeAxis(label)}
                </Text>
              );
            })}
          </View>

          {/* Chart area */}
          <View style={{ flex: 1, height: CHART_HEIGHT + 22 }}>
            {/* Grid lines behind bars */}
            <View style={[styles.gridLine, { bottom: CHART_HEIGHT + 22 - 1 }]} />
            <View style={[styles.gridLine, { bottom: CHART_HEIGHT / 2 + 22 - 1 }]} />
            <View style={[styles.gridLine, { bottom: 21 }]} />

            {/* Bars row */}
            <View style={styles.barsRow}>
              {volumeByWeek.map((point, i) => {
                const ratio = axisMax > 0 ? point.volume / axisMax : 0;
                const barHeight = Math.max(ratio * CHART_HEIGHT, point.volume > 0 ? 4 : 0);
                const isCurrentWeek = i === volumeByWeek.length - 1;
                return (
                  <View key={i} style={[styles.barWrapper, { width: barWidth }]}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: barHeight,
                            width: barWidth - 2,
                            backgroundColor: isCurrentWeek
                              ? Colors.accent
                              : `${Colors.accent}55`,
                            borderTopLeftRadius: Radius.xs,
                            borderTopRightRadius: Radius.xs,
                          },
                          isCurrentWeek && styles.barCurrentWeek,
                        ]}
                      />
                    </View>
                    <Text style={styles.barXLabel} numberOfLines={1}>
                      {getWeekShortLabel(point.date, i)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}
    </SectionCard>
  );
}

// ─── 2. Strength Progress (PR Rows) ──────────────────────────────────────────

function StrengthProgress() {
  const prs = useWorkoutStore((s) => s.prs);
  const user = useWorkoutStore((s) => s.user);
  const unitLabel = user.unitSystem === 'imperial' ? 'lbs' : 'kg';

  const topPRs = useMemo(() => prs.slice(0, 5), [prs]);
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1_000;
  const now = Date.now();

  return (
    <SectionCard>
      <SectionHeader
        title="Your Lifts"
        action={
          <Pressable hitSlop={8}>
            <Text style={styles.viewAllLink}>View all</Text>
          </Pressable>
        }
      />

      {topPRs.length === 0 ? (
        <EmptyState icon="trophy-outline" message="Complete workouts to track your PRs" />
      ) : (
        <View>
          {topPRs.map((pr, i) => {
            const e1rm = brzycki1RM(pr.weight, pr.reps);
            const isRecent = now - new Date(pr.achievedAt).getTime() < THIRTY_DAYS_MS;
            const isLast = i === topPRs.length - 1;

            return (
              <View
                key={pr.exerciseId}
                style={[styles.prRow, !isLast && styles.prRowDivider]}
              >
                {/* Left: name + detail */}
                <View style={styles.prLeft}>
                  <View style={styles.prNameRow}>
                    <Text style={styles.prExerciseName} numberOfLines={1}>
                      {pr.exerciseName}
                    </Text>
                    {isRecent && (
                      <View style={styles.prBadge}>
                        <Text style={styles.prBadgeText}>PR</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.prDetail}>
                    {pr.weight} {unitLabel} × {pr.reps} rep{pr.reps !== 1 ? 's' : ''}
                  </Text>
                </View>

                {/* Center: sparkline (7 dots, increasing size & opacity) */}
                <View style={styles.sparkline}>
                  {([3, 3.5, 4, 4.5, 5.5, 6, 7] as number[]).map((size, di) => (
                    <View
                      key={di}
                      style={{
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: Colors.accentLight,
                        opacity: 0.3 + di * 0.1,
                        marginHorizontal: 1.5,
                      }}
                    />
                  ))}
                </View>

                {/* Right: e1RM */}
                <View style={styles.prRight}>
                  <Text style={styles.e1rmValue}>{e1rm}</Text>
                  <Text style={styles.e1rmUnit}>e1RM {unitLabel}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </SectionCard>
  );
}

// ─── 3. Bodyweight Chart ──────────────────────────────────────────────────────

function BodyweightChart() {
  const history = useWorkoutStore((s) => s.getBodyweightHistory(30));
  const logBodyweight = useWorkoutStore((s) => s.logBodyweight);
  const user = useWorkoutStore((s) => s.user);
  const unitLabel = user.unitSystem === 'imperial' ? 'lbs' : 'kg';

  const [modalVisible, setModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const hasData = history.length >= 2;
  const current = history.length > 0 ? history[history.length - 1].weight : null;

  const chartData = useMemo(() => {
    if (!hasData) return null;
    const weights = history.map((e) => e.weight);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const range = maxW - minW || 1;
    const paddingV = 12;
    const usableH = CHART_HEIGHT - paddingV * 2;

    const points = history.map((entry, i) => ({
      x: (i / (history.length - 1)) * BW_CHART_WIDTH,
      y: paddingV + usableH - ((entry.weight - minW) / range) * usableH,
      weight: entry.weight,
    }));
    return { points, minW, maxW };
  }, [history, hasData]);

  const handleLogWeight = useCallback(() => {
    const val = parseFloat(inputValue.replace(',', '.'));
    if (!isNaN(val) && val > 0 && val < 1000) {
      logBodyweight(val);
      setInputValue('');
      setModalVisible(false);
    }
  }, [inputValue, logBodyweight]);

  const changeLabel = useMemo(() => {
    if (history.length < 2) return null;
    const diff = history[history.length - 1].weight - history[0].weight;
    const sign = diff > 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)} ${unitLabel} in 30d`;
  }, [history, unitLabel]);

  return (
    <SectionCard>
      <SectionHeader
        title="Bodyweight"
        subtitle={
          current != null
            ? `${current} ${unitLabel}${changeLabel ? '  ·  ' + changeLabel : ''}`
            : 'No entries yet'
        }
      />

      {!hasData ? (
        <EmptyState icon="scale-outline" message="Log your bodyweight to track changes" />
      ) : (
        chartData && (
          <View
            style={[
              styles.lineChartContainer,
              { height: CHART_HEIGHT, width: BW_CHART_WIDTH + Spacing.base },
            ]}
          >
            {/* Connecting line segments */}
            {chartData.points.slice(0, -1).map((pt, i) => {
              const next = chartData.points[i + 1];
              const dx = next.x - pt.x;
              const dy = next.y - pt.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
              return (
                <View
                  key={`seg-${i}`}
                  style={{
                    position: 'absolute',
                    left: pt.x,
                    top: pt.y,
                    width: length,
                    height: 2,
                    backgroundColor: `${Colors.accent}90`,
                    transform: [{ rotate: `${angleDeg}deg` }],
                    // @ts-ignore — RN web supports transformOrigin
                    transformOrigin: '0 1px',
                  }}
                />
              );
            })}

            {/* Data-point dots */}
            {chartData.points.map((pt, i) => {
              const isLast = i === chartData.points.length - 1;
              return (
                <View
                  key={`dot-${i}`}
                  style={[
                    styles.bwDot,
                    {
                      left: pt.x - 4,
                      top: pt.y - 4,
                      backgroundColor: isLast ? Colors.accent : `${Colors.accent}80`,
                      borderColor: isLast ? Colors.accentLight : Colors.card,
                      width: isLast ? 10 : 7,
                      height: isLast ? 10 : 7,
                      borderRadius: isLast ? 5 : 3.5,
                    },
                  ]}
                />
              );
            })}

            {/* Min / Max labels */}
            <Text style={[styles.bwAxisLabel, { bottom: 0, left: 0 }]}>
              {chartData.minW} {unitLabel}
            </Text>
            <Text style={[styles.bwAxisLabel, { top: 0, left: 0 }]}>
              {chartData.maxW} {unitLabel}
            </Text>
          </View>
        )
      )}

      <Pressable
        style={styles.logWeightBtn}
        onPress={() => setModalVisible(true)}
        android_ripple={{ color: `${Colors.accent}30` }}
      >
        <Ionicons name="add-circle-outline" size={16} color={Colors.accent} />
        <Text style={styles.logWeightBtnText}>Log Weight</Text>
      </Pressable>

      {/* Log Weight Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalIconRow}>
              <View style={styles.modalIconBg}>
                <Ionicons name="scale-outline" size={22} color={Colors.accent} />
              </View>
            </View>
            <Text style={styles.modalTitle}>Log Bodyweight</Text>
            <Text style={styles.modalSubtitle}>Enter your weight in {unitLabel}</Text>
            <TextInput
              style={styles.modalInput}
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="decimal-pad"
              placeholder={user.unitSystem === 'imperial' ? '185.0' : '84.0'}
              placeholderTextColor={Colors.textTertiary}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleLogWeight}
            />
            <View style={styles.modalBtns}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => {
                  setInputValue('');
                  setModalVisible(false);
                }}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={handleLogWeight}
              >
                <Text style={styles.modalBtnConfirmText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SectionCard>
  );
}

// ─── 4. Training Frequency Heatmap ───────────────────────────────────────────

const HEATMAP_COLS = 12;
const HEATMAP_ROWS = 7;
const DAY_LABEL_WIDTH = 18;
const HEATMAP_TOTAL_WIDTH = CARD_WIDTH - CARD_PADDING * 2 - DAY_LABEL_WIDTH - Spacing.xs;
const HEATMAP_GAP = 3;
const CELL_SIZE = Math.floor(
  (HEATMAP_TOTAL_WIDTH - HEATMAP_GAP * (HEATMAP_COLS - 1)) / HEATMAP_COLS,
);

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function TrainingHeatmap() {
  const sessions = useWorkoutStore((s) => s.sessions);

  const { grid, monthLabels } = useMemo(() => {
    const activeDays = new Set<string>();
    sessions.forEach((s) => {
      if (s.isComplete) {
        const d = new Date(s.startedAt);
        const key = [
          d.getFullYear(),
          String(d.getMonth() + 1).padStart(2, '0'),
          String(d.getDate()).padStart(2, '0'),
        ].join('-');
        activeDays.add(key);
      }
    });

    // Start 12 weeks back on the most-recent Monday
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = (today.getDay() + 6) % 7; // Mon=0
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - dayOfWeek - (HEATMAP_COLS - 1) * 7);

    const weeks: { dateKey: string; isActive: boolean; isFuture: boolean }[][] = [];
    const monthLbls: { col: number; label: string }[] = [];
    let lastMonth = -1;

    for (let w = 0; w < HEATMAP_COLS; w++) {
      const week: { dateKey: string; isActive: boolean; isFuture: boolean }[] = [];
      for (let d = 0; d < HEATMAP_ROWS; d++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + w * 7 + d);
        const key = [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, '0'),
          String(date.getDate()).padStart(2, '0'),
        ].join('-');
        if (d === 0 && date.getMonth() !== lastMonth) {
          lastMonth = date.getMonth();
          monthLbls.push({
            col: w,
            label: date.toLocaleString('en-US', { month: 'short' }),
          });
        }
        week.push({
          dateKey: key,
          isActive: activeDays.has(key),
          isFuture: date > today,
        });
      }
      weeks.push(week);
    }
    return { grid: weeks, monthLabels: monthLbls };
  }, [sessions]);

  return (
    <SectionCard>
      <SectionHeader title="Training Frequency" subtitle="Last 12 weeks" />

      {/* Month labels row */}
      <View style={styles.heatmapMonthRow}>
        <View style={{ width: DAY_LABEL_WIDTH + Spacing.xs }} />
        {monthLabels.map((ml, i) => (
          <Text
            key={i}
            style={[
              styles.heatmapMonthLabel,
              {
                position: 'absolute',
                left:
                  DAY_LABEL_WIDTH +
                  Spacing.xs +
                  ml.col * (CELL_SIZE + HEATMAP_GAP),
              },
            ]}
          >
            {ml.label}
          </Text>
        ))}
      </View>

      <View style={styles.heatmapBody}>
        {/* Day-of-week labels */}
        <View style={[styles.heatmapDayCol, { width: DAY_LABEL_WIDTH }]}>
          {DAY_LABELS.map((lbl, i) => (
            <View
              key={i}
              style={[styles.heatmapDayLabelWrapper, { height: CELL_SIZE }]}
            >
              {(i % 2 === 0) && (
                <Text style={styles.heatmapDayLabel}>{lbl}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Grid */}
        <View style={{ marginLeft: Spacing.xs, flexDirection: 'row', gap: HEATMAP_GAP }}>
          {grid.map((week, wIdx) => (
            <View key={wIdx} style={{ flexDirection: 'column', gap: HEATMAP_GAP }}>
              {week.map((day, dIdx) => (
                <View
                  key={dIdx}
                  style={[
                    {
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      borderRadius: Radius.xs,
                    },
                    day.isFuture
                      ? styles.cellFuture
                      : day.isActive
                      ? styles.cellActive
                      : styles.cellRest,
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.heatmapLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.cellRest]} />
          <Text style={styles.legendLabel}>Rest</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.cellActive]} />
          <Text style={styles.legendLabel}>Active</Text>
        </View>
      </View>
    </SectionCard>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const sessions = useWorkoutStore((s) => s.sessions);
  const totalWorkouts = useMemo(
    () => sessions.filter((s) => s.isComplete).length,
    [sessions],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Progress</Text>
            <Text style={styles.headerSubtitle}>
              {totalWorkouts === 0
                ? 'Start training to see analytics'
                : `${totalWorkouts} workout${totalWorkouts !== 1 ? 's' : ''} completed`}
            </Text>
          </View>
          <View style={styles.headerBadge}>
            <Ionicons name="trending-up" size={16} color={Colors.accent} />
          </View>
        </View>

        <WeeklyVolumeChart />
        <StrengthProgress />
        <BodyweightChart />
        <TrainingHeatmap />

        <View style={{ height: Spacing['3xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  headerTitle: {
    fontSize: Typography['3xl'],
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    letterSpacing: Typography.tightTracking,
  },
  headerSubtitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  headerBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${Colors.accent}40`,
    marginTop: 4,
  },

  // ── Section cards ────────────────────────────────────────────────────────────
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: CARD_PADDING,
    marginBottom: Spacing.base,
    ...Shadow.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    letterSpacing: Typography.tightTracking,
  },
  sectionSubtitle: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  viewAllLink: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    color: Colors.accent,
    paddingLeft: Spacing.sm,
  },

  // ── Empty states ─────────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Bar chart ────────────────────────────────────────────────────────────────
  chartOuter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  yAxis: {
    width: Y_AXIS_WIDTH,
    position: 'relative',
  },
  yAxisLabel: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    textAlign: 'right',
    right: 6,
    lineHeight: 14,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.separator,
  },
  barsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 22,
    height: CHART_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing['2xs'],
  },
  barWrapper: {
    alignItems: 'center',
  },
  barTrack: {
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
  },
  bar: {
    minHeight: 0,
  },
  barCurrentWeek: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  barXLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 12,
  },

  // ── PR rows ──────────────────────────────────────────────────────────────────
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  prRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  prLeft: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  prNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  prExerciseName: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  prBadge: {
    backgroundColor: Colors.premiumGlow,
    borderWidth: 1,
    borderColor: Colors.premiumGold,
    borderRadius: Radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  prBadgeText: {
    fontSize: 9,
    fontWeight: Typography.black,
    color: Colors.premiumGold,
    letterSpacing: Typography.capsTracking,
  },
  prDetail: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  prRight: {
    alignItems: 'flex-end',
    minWidth: 62,
  },
  e1rmValue: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.accent,
    letterSpacing: Typography.tightTracking,
  },
  e1rmUnit: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 1,
  },

  // ── Bodyweight chart ─────────────────────────────────────────────────────────
  lineChartContainer: {
    position: 'relative',
    marginVertical: Spacing.sm,
    marginLeft: Spacing.sm,
    overflow: 'visible',
  },
  bwDot: {
    position: 'absolute',
    borderWidth: 2,
  },
  bwAxisLabel: {
    position: 'absolute',
    fontSize: 9,
    color: Colors.textTertiary,
  },
  logWeightBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.accentMuted,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: `${Colors.accent}40`,
  },
  logWeightBtnText: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.accent,
  },

  // ── Modal ─────────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.xl,
    width: '100%',
    ...Shadow.lg,
  },
  modalIconRow: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accentMuted,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${Colors.accent}40`,
  },
  modalTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  modalInput: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Typography.xl,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalBtnCancelText: {
    fontSize: Typography.base,
    fontWeight: Typography.medium,
    color: Colors.textSecondary,
  },
  modalBtnConfirm: {
    backgroundColor: Colors.accent,
  },
  modalBtnConfirmText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.white,
  },

  // ── Heatmap ───────────────────────────────────────────────────────────────────
  heatmapMonthRow: {
    flexDirection: 'row',
    height: 16,
    marginBottom: Spacing.xs,
    position: 'relative',
  },
  heatmapMonthLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
  },
  heatmapBody: {
    flexDirection: 'row',
  },
  heatmapDayCol: {
    flexDirection: 'column',
    gap: HEATMAP_GAP,
  },
  heatmapDayLabelWrapper: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  heatmapDayLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
    lineHeight: 10,
  },
  cellActive: {
    backgroundColor: Colors.accent,
  },
  cellRest: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cellFuture: {
    backgroundColor: 'transparent',
  },
  heatmapLegend: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.base,
    marginTop: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: Radius.xs,
  },
  legendLabel: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
  },
});
