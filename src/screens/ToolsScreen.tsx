import React, { useState, useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '../store/workoutStore';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tool = '1rm' | 'plates' | 'converter';

// ─── 1RM Formulas ─────────────────────────────────────────────────────────────

function calc1RM(weight: number, reps: number) {
  if (reps === 1) return { brzycki: weight, epley: weight, lander: weight, lombardi: weight };
  const r = Math.min(reps, 36);
  return {
    brzycki:   weight * 36 / (37 - r),
    epley:     weight * (1 + r / 30),
    lander:    (100 * weight) / (101.3 - 2.67123 * r),
    lombardi:  weight * Math.pow(r, 0.1),
  };
}

const REP_PERCENTAGES: Array<[number, number]> = [
  [1, 100], [2, 97], [3, 94], [4, 91], [5, 87],
  [6, 83], [8, 80], [10, 75], [12, 70], [15, 65],
];

// ─── Plate data ───────────────────────────────────────────────────────────────

const PLATES_LBS = [45, 35, 25, 10, 5, 2.5, 1.25];
const PLATES_KG  = [20, 15, 10, 5, 2.5, 1.25, 0.5];
const PLATE_COLORS: Record<number, string> = {
  45: '#FF453A', 35: '#0A84FF', 25: '#30D158', 10: '#F2F2F7',
  5: '#FF9F0A',  2.5: '#8E8EA3', 1.25: '#C9975A',
  20: '#FF453A', 15: '#0A84FF', 0.5: '#C9975A',
};

function calcPlates(target: number, barWeight: number, useKg: boolean): number[] {
  const available = useKg ? PLATES_KG : PLATES_LBS;
  const perSide = (target - barWeight) / 2;
  if (perSide <= 0) return [];
  let remaining = perSide;
  const result: number[] = [];
  for (const plate of available) {
    while (remaining >= plate - 0.001) {
      result.push(plate);
      remaining -= plate;
      remaining = Math.round(remaining * 1000) / 1000;
    }
  }
  return result;
}

// ─── Segmented control ────────────────────────────────────────────────────────

function SegControl({ options, value, onChange }: {
  options: Array<{ key: Tool; label: string; icon: keyof typeof Ionicons.glyphMap }>;
  value: Tool;
  onChange: (t: Tool) => void;
}) {
  return (
    <View style={seg.row}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            style={[seg.btn, active && seg.btnActive]}
            onPress={() => onChange(opt.key)}
          >
            <Ionicons name={opt.icon} size={16} color={active ? Colors.white : Colors.textSecondary} />
            <Text style={[seg.label, active && seg.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ToolsScreen() {
  const unitSystem = useWorkoutStore((s) => s.user.unitSystem);
  const [activeTool, setActiveTool] = useState<Tool>('1rm');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Tools</Text>
        <Text style={styles.subtitle}>Calculators & converters</Text>
      </View>

      <SegControl
        value={activeTool}
        onChange={setActiveTool}
        options={[
          { key: '1rm',       label: '1RM Calc',   icon: 'trophy-outline' },
          { key: 'plates',    label: 'Plates',      icon: 'barbell-outline' },
          { key: 'converter', label: 'Convert',     icon: 'swap-horizontal-outline' },
        ]}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {activeTool === '1rm'       && <OneRMTool unitSystem={unitSystem} />}
        {activeTool === 'plates'    && <PlatesTool unitSystem={unitSystem} />}
        {activeTool === 'converter' && <ConverterTool />}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 1RM Calculator ───────────────────────────────────────────────────────────

function OneRMTool({ unitSystem }: { unitSystem: 'imperial' | 'metric' }) {
  const unit = unitSystem === 'metric' ? 'kg' : 'lbs';
  const [weightStr, setWeightStr] = useState('');
  const [repsStr,   setRepsStr]   = useState('');

  const weight = parseFloat(weightStr);
  const reps   = parseInt(repsStr, 10);
  const valid  = !isNaN(weight) && weight > 0 && !isNaN(reps) && reps >= 1 && reps <= 36;

  const results = valid ? calc1RM(weight, reps) : null;
  const primary = results?.brzycki ?? 0;

  return (
    <View style={styles.toolCard}>
      <View style={styles.toolTitleRow}>
        <Ionicons name="trophy" size={20} color={Colors.premiumGold} />
        <Text style={styles.toolTitle}>1RM Calculator</Text>
      </View>
      <Text style={styles.toolDesc}>
        Enter the weight you lifted and the number of reps to estimate your one-rep max.
      </Text>

      {/* Inputs */}
      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Weight ({unit})</Text>
          <TextInput
            style={styles.input}
            value={weightStr}
            onChangeText={setWeightStr}
            keyboardType="decimal-pad"
            placeholder="e.g. 225"
            placeholderTextColor={Colors.textTertiary}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Reps (1–36)</Text>
          <TextInput
            style={styles.input}
            value={repsStr}
            onChangeText={setRepsStr}
            keyboardType="number-pad"
            placeholder="e.g. 5"
            placeholderTextColor={Colors.textTertiary}
          />
        </View>
      </View>

      {/* Results — formula comparison */}
      {results && (
        <>
          <View style={styles.primaryResult}>
            <Text style={styles.primaryLabel}>Estimated 1RM</Text>
            <Text style={styles.primaryValue}>{Math.round(primary)} {unit}</Text>
          </View>

          <Text style={styles.subLabel}>Formula comparison</Text>
          <View style={styles.formulaTable}>
            {[
              ['Brzycki',   results.brzycki],
              ['Epley',     results.epley],
              ['Lander',    results.lander],
              ['Lombardi',  results.lombardi],
            ].map(([name, val]) => {
              const v = val as number;
              const diff = ((v - primary) / primary * 100).toFixed(1);
              return (
                <View key={name as string} style={styles.formulaRow}>
                  <Text style={styles.formulaName}>{name as string}</Text>
                  <Text style={styles.formulaVal}>{Math.round(v)} {unit}</Text>
                  <Text style={[styles.formulaDiff, { color: v >= primary ? Colors.success : Colors.error }]}>
                    {v >= primary ? '+' : ''}{diff}%
                  </Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.subLabel}>Rep max table</Text>
          <View style={styles.repTable}>
            {REP_PERCENTAGES.map(([rep, pct]) => (
              <View key={rep} style={styles.repRow}>
                <View style={styles.repBadge}>
                  <Text style={styles.repBadgeText}>{rep}RM</Text>
                </View>
                <View style={styles.repBar}>
                  <View style={[styles.repBarFill, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.repVal}>{Math.round(primary * pct / 100)} {unit}</Text>
                <Text style={styles.repPct}>{pct}%</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {!valid && (weightStr.length > 0 || repsStr.length > 0) && (
        <View style={styles.errorBanner}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.warning} />
          <Text style={styles.errorText}>Enter a weight and 1–36 reps to calculate.</Text>
        </View>
      )}
    </View>
  );
}

// ─── Plate Calculator ─────────────────────────────────────────────────────────

const BAR_OPTIONS_LBS = [{ label: '45 lbs (Standard)', value: 45 }, { label: '35 lbs (Women\'s)', value: 35 }, { label: '25 lbs (Short)', value: 25 }];
const BAR_OPTIONS_KG  = [{ label: '20 kg (Standard)', value: 20 }, { label: '15 kg (Women\'s)', value: 15 }, { label: '10 kg (Short)', value: 10 }];

function PlatesTool({ unitSystem }: { unitSystem: 'imperial' | 'metric' }) {
  const [useKg, setUseKg] = useState(unitSystem === 'metric');
  const [targetStr, setTargetStr] = useState('');
  const [barIdx, setBarIdx] = useState(0);
  const unit = useKg ? 'kg' : 'lbs';
  const barOptions = useKg ? BAR_OPTIONS_KG : BAR_OPTIONS_LBS;
  const barWeight = barOptions[barIdx].value;

  const target = parseFloat(targetStr);
  const valid  = !isNaN(target) && target > 0;
  const plates = valid ? calcPlates(target, barWeight, useKg) : [];
  const achievable = valid ? (target >= barWeight) : false;

  // Group plates for display
  const grouped: Record<number, number> = {};
  for (const p of plates) grouped[p] = (grouped[p] ?? 0) + 1;

  return (
    <View style={styles.toolCard}>
      <View style={styles.toolTitleRow}>
        <Ionicons name="barbell" size={20} color={Colors.accent} />
        <Text style={styles.toolTitle}>Plate Calculator</Text>
      </View>
      <Text style={styles.toolDesc}>
        Find exactly which plates to load on each side of the bar.
      </Text>

      {/* Unit toggle */}
      <View style={styles.toggleRow}>
        <Text style={styles.inputLabel}>Unit</Text>
        <Pressable style={styles.unitToggle} onPress={() => { setUseKg(!useKg); setTargetStr(''); setBarIdx(0); }}>
          <View style={[styles.unitOption, !useKg && styles.unitOptionActive]}>
            <Text style={[styles.unitOptionText, !useKg && styles.unitOptionTextActive]}>lbs</Text>
          </View>
          <View style={[styles.unitOption, useKg && styles.unitOptionActive]}>
            <Text style={[styles.unitOptionText, useKg && styles.unitOptionTextActive]}>kg</Text>
          </View>
        </Pressable>
      </View>

      {/* Bar selector */}
      <Text style={styles.inputLabel}>Bar weight</Text>
      <View style={styles.barSelector}>
        {barOptions.map((opt, i) => (
          <Pressable
            key={opt.value}
            style={[styles.barOption, barIdx === i && styles.barOptionActive]}
            onPress={() => setBarIdx(i)}
          >
            <Text style={[styles.barOptionText, barIdx === i && styles.barOptionTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Target input */}
      <Text style={styles.inputLabel}>Target weight ({unit})</Text>
      <TextInput
        style={styles.inputFull}
        value={targetStr}
        onChangeText={setTargetStr}
        keyboardType="decimal-pad"
        placeholder={`e.g. ${useKg ? '100' : '225'}`}
        placeholderTextColor={Colors.textTertiary}
      />

      {valid && !achievable && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={16} color={Colors.error} />
          <Text style={styles.errorText}>Target must be greater than bar weight ({barWeight} {unit}).</Text>
        </View>
      )}

      {valid && achievable && (
        <>
          {/* Visual barbell */}
          <View style={styles.barbellViz}>
            {/* Left plates */}
            <View style={styles.barbellPlatesLeft}>
              {plates.slice().reverse().map((p, i) => (
                <View
                  key={i}
                  style={[
                    styles.plate,
                    {
                      backgroundColor: PLATE_COLORS[p] ?? Colors.textTertiary,
                      height: Math.max(28, Math.min(72, p * 1.4 + 20)),
                      width: 16 + Math.floor(i * 0.5),
                    },
                  ]}
                />
              ))}
            </View>
            {/* Bar */}
            <View style={styles.barbellBar} />
            {/* Right plates */}
            <View style={styles.barbellPlatesRight}>
              {plates.map((p, i) => (
                <View
                  key={i}
                  style={[
                    styles.plate,
                    {
                      backgroundColor: PLATE_COLORS[p] ?? Colors.textTertiary,
                      height: Math.max(28, Math.min(72, p * 1.4 + 20)),
                      width: 16 + Math.floor((plates.length - 1 - i) * 0.5),
                    },
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Plate list */}
          <Text style={styles.subLabel}>Per side</Text>
          {Object.entries(grouped)
            .sort(([a], [b]) => parseFloat(b) - parseFloat(a))
            .map(([plate, count]) => (
              <View key={plate} style={styles.plateRow}>
                <View style={[styles.plateDot, { backgroundColor: PLATE_COLORS[parseFloat(plate)] ?? Colors.textTertiary }]} />
                <Text style={styles.plateLabel}>{plate} {unit} plate</Text>
                <Text style={styles.plateCount}>× {count}</Text>
              </View>
            ))}

          {plates.length === 0 && (
            <View style={styles.plateRow}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.textTertiary} />
              <Text style={[styles.plateLabel, { color: Colors.textTertiary }]}>Bar only — no plates needed</Text>
            </View>
          )}

          <View style={styles.plateTotal}>
            <Text style={styles.plateTotalLabel}>Total weight</Text>
            <Text style={styles.plateTotalValue}>{target} {unit}</Text>
          </View>
        </>
      )}
    </View>
  );
}

// ─── Unit Converter ───────────────────────────────────────────────────────────

function ConverterTool() {
  const [lbsStr, setLbsStr] = useState('');
  const [kgStr,  setKgStr]  = useState('');

  function onLbsChange(v: string) {
    setLbsStr(v);
    const n = parseFloat(v);
    setKgStr(!isNaN(n) ? (n * 0.453592).toFixed(2) : '');
  }

  function onKgChange(v: string) {
    setKgStr(v);
    const n = parseFloat(v);
    setLbsStr(!isNaN(n) ? (n / 0.453592).toFixed(2) : '');
  }

  function swap() {
    const tmp = lbsStr;
    onLbsChange(kgStr);
    // After swap, kgStr gets what was lbs
    setKgStr(tmp);
  }

  return (
    <View style={styles.toolCard}>
      <View style={styles.toolTitleRow}>
        <Ionicons name="swap-horizontal" size={20} color={Colors.info} />
        <Text style={styles.toolTitle}>Unit Converter</Text>
      </View>
      <Text style={styles.toolDesc}>Convert between pounds and kilograms.</Text>

      <View style={styles.converterRow}>
        <View style={styles.converterSide}>
          <Text style={styles.converterUnit}>lbs</Text>
          <TextInput
            style={styles.converterInput}
            value={lbsStr}
            onChangeText={onLbsChange}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={Colors.textTertiary}
          />
        </View>

        <Pressable style={styles.swapBtn} onPress={swap}>
          <Ionicons name="swap-horizontal" size={22} color={Colors.accent} />
        </Pressable>

        <View style={styles.converterSide}>
          <Text style={styles.converterUnit}>kg</Text>
          <TextInput
            style={styles.converterInput}
            value={kgStr}
            onChangeText={onKgChange}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={Colors.textTertiary}
          />
        </View>
      </View>

      {/* Quick reference */}
      <Text style={styles.subLabel}>Quick reference</Text>
      {[
        [45, 20.4], [135, 61.2], [185, 83.9], [225, 102.1],
        [275, 124.7], [315, 142.9], [365, 165.6], [405, 183.7],
      ].map(([lbs, kg]) => (
        <Pressable
          key={lbs}
          style={styles.refRow}
          onPress={() => onLbsChange(String(lbs))}
        >
          <Text style={styles.refLbs}>{lbs} lbs</Text>
          <View style={styles.refDivider} />
          <Text style={styles.refKg}>{kg} kg</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.base, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  title: { fontSize: Typography['2xl'], fontWeight: Typography.bold, color: Colors.textPrimary, letterSpacing: Typography.tightTracking },
  subtitle: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  scroll: { paddingHorizontal: Spacing.base, paddingBottom: 120 },

  toolCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  toolTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  toolTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  toolDesc: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.lg },

  inputRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: Typography.capsTracking, marginBottom: Spacing.sm },
  input: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    textAlign: 'center',
  },
  inputFull: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    marginBottom: Spacing.md,
  },

  primaryResult: {
    backgroundColor: Colors.accentMuted,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
  },
  primaryLabel: { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: 4 },
  primaryValue: { fontSize: Typography['4xl'], fontWeight: Typography.black, color: Colors.accent, letterSpacing: Typography.tightTracking },

  subLabel: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: Typography.capsTracking, marginBottom: Spacing.md, marginTop: Spacing.sm },

  formulaTable: { gap: Spacing.sm, marginBottom: Spacing.lg },
  formulaRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardElevated, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  formulaName: { flex: 1, fontSize: Typography.base, color: Colors.textSecondary },
  formulaVal: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary, marginRight: Spacing.md },
  formulaDiff: { fontSize: Typography.sm, fontWeight: Typography.medium, width: 50, textAlign: 'right' },

  repTable: { gap: Spacing.sm },
  repRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  repBadge: { width: 36, backgroundColor: Colors.border, borderRadius: Radius.sm, paddingVertical: 4, alignItems: 'center' },
  repBadgeText: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textSecondary },
  repBar: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  repBarFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 3 },
  repVal: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary, width: 70, textAlign: 'right' },
  repPct: { fontSize: Typography.xs, color: Colors.textTertiary, width: 36, textAlign: 'right' },

  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.warningMuted, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.warning + '44', marginTop: Spacing.md },
  errorText: { flex: 1, fontSize: Typography.sm, color: Colors.warning },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  unitToggle: { flexDirection: 'row', backgroundColor: Colors.cardElevated, borderRadius: Radius.md, padding: 3, borderWidth: 1, borderColor: Colors.border },
  unitOption: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.sm },
  unitOptionActive: { backgroundColor: Colors.accent },
  unitOptionText: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textSecondary },
  unitOptionTextActive: { color: Colors.white },

  barSelector: { flexDirection: 'column', gap: Spacing.sm, marginBottom: Spacing.md },
  barOption: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.cardElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  barOptionActive: { borderColor: Colors.accent, backgroundColor: Colors.accentMuted },
  barOptionText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  barOptionTextActive: { color: Colors.accent },

  barbellViz: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: Spacing.xl, minHeight: 80 },
  barbellPlatesLeft: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  barbellPlatesRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  barbellBar: { height: 12, width: 80, backgroundColor: Colors.textTertiary, borderRadius: 4 },
  plate: { borderRadius: 3 },

  plateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.separator },
  plateDot: { width: 12, height: 12, borderRadius: 6 },
  plateLabel: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary },
  plateCount: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.accent },
  plateTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.md, marginTop: Spacing.sm },
  plateTotalLabel: { fontSize: Typography.sm, color: Colors.textSecondary },
  plateTotalValue: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },

  converterRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xl },
  converterSide: { flex: 1, alignItems: 'center' },
  converterUnit: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textSecondary, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: Typography.capsTracking },
  converterInput: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Typography['3xl'],
    fontWeight: Typography.black,
    textAlign: 'center',
    width: '100%',
  },
  swapBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accentMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.accent + '44' },

  refRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.separator },
  refLbs: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary, fontWeight: Typography.medium },
  refDivider: { width: 1, height: 16, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
  refKg: { flex: 1, fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'right' },
});

const seg = StyleSheet.create({
  row: { flexDirection: 'row', marginHorizontal: Spacing.base, marginBottom: Spacing.md, backgroundColor: Colors.card, borderRadius: Radius.lg, padding: 4, borderWidth: 1, borderColor: Colors.border },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.sm, borderRadius: Radius.md },
  btnActive: { backgroundColor: Colors.accent },
  label: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textSecondary },
  labelActive: { color: Colors.white },
});
