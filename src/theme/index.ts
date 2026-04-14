// ─────────────────────────────────────────────────────────────────────────────
// IronPath Premium Theme — MacroFactor-inspired
// Deep near-black, warm indigo accent, gold premium tier
// ─────────────────────────────────────────────────────────────────────────────

export const Colors = {
  // ── Base backgrounds ───────────────────────────────────────────────────────
  background:    '#0E0E11',   // near-black with subtle warmth
  surface:       '#13131A',   // slightly elevated
  card:          '#1C1C24',   // card base
  cardElevated:  '#242430',   // elevated card / modals
  cardSubtle:    '#17171F',   // very subtle differentiation
  border:        '#2E2E3C',   // soft border
  borderLight:   '#3A3A4E',   // slightly more visible
  separator:     '#252530',   // section dividers

  // ── Text ──────────────────────────────────────────────────────────────────
  textPrimary:   '#F2F2F7',   // near-white (iOS system label)
  textSecondary: '#8E8EA3',   // muted purple-gray
  textTertiary:  '#5C5C70',   // very muted
  textDisabled:  '#3A3A4A',   // disabled states

  // ── Accent — Premium Indigo ───────────────────────────────────────────────
  accent:        '#7C6FFF',   // vibrant indigo
  accentDark:    '#5A50CC',   // pressed state
  accentLight:   '#9C91FF',   // hover/light variant
  accentMuted:   '#7C6FFF22', // transparent tint for backgrounds

  // ── Premium / Gold tier ───────────────────────────────────────────────────
  premium:       '#C9975A',   // warm gold
  premiumDark:   '#A07030',   // darker gold
  premiumLight:  '#E3B87C',   // lighter gold
  premiumGold:   '#FFB830',   // bright gold for badges
  premiumGlow:   '#C9975A33', // gold glow bg

  // ── Semantic colors ───────────────────────────────────────────────────────
  success:       '#30D158',   // iOS green
  successMuted:  '#30D15820',
  warning:       '#FF9F0A',   // iOS amber
  warningMuted:  '#FF9F0A20',
  error:         '#FF453A',   // iOS red
  errorMuted:    '#FF453A20',
  info:          '#0A84FF',   // iOS blue
  infoMuted:     '#0A84FF20',

  // ── PR / record color ─────────────────────────────────────────────────────
  pr:            '#FFB830',   // same as premiumGold
  prMuted:       '#FFB83020',

  // ── Misc ──────────────────────────────────────────────────────────────────
  white:         '#FFFFFF',
  black:         '#000000',
  overlay:       'rgba(0,0,0,0.72)',
  overlayLight:  'rgba(0,0,0,0.36)',
  scrim:         'rgba(14,14,17,0.95)', // bottom sheet scrim
};

export const Typography = {
  // ── Size scale ─────────────────────────────────────────────────────────────
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  '2xl': 28,
  '3xl': 34,
  '4xl': 40,
  '5xl': 48,

  // ── Weights ────────────────────────────────────────────────────────────────
  regular:   '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
  heavy:     '800' as const,
  black:     '900' as const,

  // ── Letter spacing ─────────────────────────────────────────────────────────
  tightTracking:  -0.5,
  normalTracking:  0,
  wideTracking:    0.5,
  capsTracking:    1.0,
};

export const Spacing = {
  '2xs': 2,
  xs:    4,
  sm:    8,
  md:    12,
  base:  16,
  lg:    20,
  xl:    24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
};

export const Radius = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  accent: {
    shadowColor: '#7C6FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  gold: {
    shadowColor: '#C9975A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};

// Gradient presets
export const Gradients = {
  accent:      ['#7C6FFF', '#5A50CC'] as const,
  accentFade:  ['#7C6FFF', '#7C6FFF00'] as const,
  gold:        ['#E3B87C', '#C9975A'] as const,
  dark:        ['#1C1C24', '#13131A'] as const,
  card:        ['#242430', '#1C1C24'] as const,
  success:     ['#30D158', '#20A040'] as const,
  error:       ['#FF453A', '#CC2A20'] as const,
  hero:        ['#1C1C24', '#0E0E11'] as const,
};
