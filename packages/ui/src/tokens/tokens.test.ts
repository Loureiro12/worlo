import { colors, palette } from './colors';
import { contrastRatio } from './contrast';

// WCAG AA: 4.5 for text, 3 for large text (≥ 18.66px bold) and UI boundaries.
const AA = 4.5;
const AA_LARGE = 3;

describe('brand contrast (WCAG AA)', () => {
  it.each([
    ['text on areia', colors.text, colors.background, AA],
    ['text on branco', colors.text, colors.surface, AA],
    ['muted text on areia', colors.textMuted, colors.background, AA],
    ['muted text on branco', colors.textMuted, colors.surface, AA],
    ['link (coral-700) on areia', colors.link, colors.background, AA],
    ['link (coral-700) on branco', colors.link, colors.surface, AA],
    ['link (coral-700) on coral-100', colors.link, colors.accentSoft, AA],
    ['carvão label on coral button', colors.onPrimary, colors.primary, AA],
    ['carvão label on pressed button', colors.onPrimary, colors.primaryPressed, AA],
    ['branco on carvão', colors.textInverse, colors.backgroundDark, AA],
    ['linha on carvão', colors.textInverseMuted, colors.backgroundDark, AA],
    ['coral-300 overline on carvão', colors.accentOnDark, colors.backgroundDark, AA],
    ['selected chip', colors.onSelected, colors.selected, AA],
    ['success on branco', colors.success, colors.surface, AA],
    ['error on branco', colors.error, colors.surface, AA],
    ['branco on cinza-800 (offline banner)', palette.branco, palette.cinza800, AA],
    ['coral marker on carvão (UI)', colors.mapVisited, colors.backgroundDark, AA_LARGE],
  ])('%s', (_, fg, bg, min) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
  });

  it('never uses coral (#E45B33) as body text on light backgrounds', () => {
    expect(contrastRatio(palette.coral, palette.areia)).toBeLessThan(AA);
  });
});

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1);
  });
});
