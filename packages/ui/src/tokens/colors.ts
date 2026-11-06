/**
 * Worlo brand palette (design_handoff_worlo_app/README.md → Design tokens).
 * Screens and components use `colors` (semantic) — `palette` is the raw source.
 */
export const palette = {
  carvao: '#131311',
  coral: '#E45B33',
  coral300: '#F0A38A',
  coral100: '#FAD9CE',
  coral700: '#A83A19',
  areia: '#EEEAE7',
  branco: '#FFFDFC',
  linha: '#CFC9C4',
  skeleton: '#E2DDD8',
  cinza600: '#67615A',
  cinza800: '#3A3733',
  sucesso: '#167A4A',
  erro: '#B3261E',
  info: '#2563A8',
  globoOceano: '#211F1C',
  /** Light map (Mapa tab): a soft, warm-grey sea under white land. */
  globoOceanoClaro: '#DCD8D3',
} as const;

/** Translucent layers used on dark (carvão) screens and overlays. */
export const alpha = {
  darkCard: 'rgba(255,253,252,0.06)',
  darkChip: 'rgba(255,253,252,0.08)',
  darkButton: 'rgba(255,253,252,0.10)',
  darkBorder: 'rgba(255,253,252,0.12)',
  darkBorderStrong: 'rgba(255,253,252,0.24)',
  darkSkeleton: 'rgba(255,253,252,0.10)',
  overlay: 'rgba(19,19,17,0.45)',
  mapControl: 'rgba(19,19,17,0.7)',
  hairline: 'rgba(19,19,17,0.06)',
  coralHalo: 'rgba(228,91,51,0.3)',
  coralGlow: 'rgba(228,91,51,0.22)',
} as const;

export const colors = {
  // Backgrounds
  background: palette.areia,
  backgroundDark: palette.carvao,
  surface: palette.branco,
  accentSoft: palette.coral100,
  // Text
  text: palette.carvao,
  textSupport: palette.cinza800,
  textMuted: palette.cinza600,
  textInverse: palette.branco,
  textInverseMuted: palette.linha,
  /** Coral as TEXT on light backgrounds — `coral` itself fails AA. */
  link: palette.coral700,
  /** Overlines and highlights on dark backgrounds. */
  accentOnDark: palette.coral300,
  // Actions
  primary: palette.coral,
  primaryPressed: palette.coral300,
  onPrimary: palette.carvao,
  selected: palette.carvao,
  onSelected: palette.branco,
  // Lines
  border: palette.linha,
  hairline: alpha.hairline,
  // Feedback
  success: palette.sucesso,
  error: palette.erro,
  info: palette.info,
  // Map
  mapVisited: palette.coral,
  mapPlanned: palette.linha,
  mapWishlist: palette.cinza600,
  mapNone: palette.cinza800,
  globeOcean: palette.globoOceano,
} as const;

export type ColorToken = keyof typeof colors;

/** Avatar colors cycle per person (01_COMPONENTS.md → Avatares). */
export const avatarColors = [
  { background: palette.coral100, foreground: palette.coral700 },
  { background: palette.carvao, foreground: palette.branco },
  { background: palette.coral300, foreground: palette.coral700 },
  { background: palette.cinza600, foreground: palette.branco },
  { background: palette.linha, foreground: palette.coral700 },
] as const;

export const currentUserAvatarColor = {
  background: palette.coral,
  foreground: palette.carvao,
} as const;
