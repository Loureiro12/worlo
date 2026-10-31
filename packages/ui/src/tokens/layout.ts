/** Spacing scale (README → Espaçamento). Only these values are allowed. */
export const spaceScale = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 40, 48] as const;
export type Space = (typeof spaceScale)[number];

export const layout = {
  /** Side margin of every screen. */
  gutter: 20,
  /** Distance from the top safe area to the first header row. */
  headerGap: 8,
  sectionGap: 24,
  cardGap: 12,
  listGap: 8,
  /** Tab bar content height, without the home-indicator inset. */
  tabBarHeight: 50,
  /**
   * Scroll padding below content on tab screens. The prototype overlays an 84pt
   * bar (hence its 108); expo-router lays the bar out below the content, so
   * only the breathing room plus space for the floating live pill is needed.
   */
  tabBarScrollPadding: 72,
  offlineBannerHeight: 36,
} as const;

export const radius = {
  r8: 8,
  r10: 10,
  r12: 12,
  r16: 16,
  r18: 18,
  r20: 20,
  r24: 24,
  full: 999,
} as const;

export const size = {
  control: 52,
  controlSheet: 48,
  controlS: 44,
  chip: 36,
  iconButton: 40,
  iconButtonBar: 44,
  fab: 52,
  avatar: 44,
  touchMin: 44,
} as const;

export const iconSize = {
  inline: 16,
  row: 20,
  action: 24,
  empty: 34,
} as const;

/** Box shadows (RN supports the CSS `boxShadow` string on the New Architecture). */
export const shadow = {
  hover: '0px 6px 20px rgba(19,19,17,0.08)',
  float: '0px 8px 24px rgba(19,19,17,0.08)',
  buttonFloat: '0px 4px 12px rgba(19,19,17,0.12)',
  toast: '0px 8px 24px rgba(19,19,17,0.18)',
  sheetMap: '0px -10px 40px rgba(19,19,17,0.4)',
  pillLive: '0px 8px 20px rgba(19,19,17,0.3)',
  sharePreview: '0px 20px 50px rgba(0,0,0,0.5)',
  search: '0px 6px 20px rgba(19,19,17,0.06)',
} as const;

export const motion = {
  toastMs: 200,
  toastVisibleMs: 2400,
  sheetMs: 280,
  pushMs: 300,
} as const;

export const opacity = {
  disabled: 0.4,
  locked: 0.55,
  soldOut: 0.45,
  done: 0.7,
} as const;
