import { contrastRatio } from './contrast';
import { type ColorScheme, colors } from './semantic';

// WCAG AA: 4.5 for body text, 3 for large text and UI component boundaries.
const AA_TEXT = 4.5;
const AA_UI = 3;

describe.each<ColorScheme>(['light', 'dark'])('%s theme contrast', (scheme) => {
  const c = colors[scheme];

  it.each([
    ['text / background', c.text, c.background, AA_TEXT],
    ['text / surface', c.text, c.surface, AA_TEXT],
    ['textMuted / background', c.textMuted, c.background, AA_TEXT],
    ['textMuted / surface', c.textMuted, c.surface, AA_TEXT],
    ['textSubtle / surface', c.textSubtle, c.surface, AA_TEXT],
    ['onPrimary / primary', c.onPrimary, c.primary, AA_TEXT],
    ['onPrimary / primaryPressed', c.onPrimary, c.primaryPressed, AA_TEXT],
    ['onSecondary / secondary', c.onSecondary, c.secondary, AA_TEXT],
    ['onDanger / danger', c.onDanger, c.danger, AA_TEXT],
    ['primary / surface', c.primary, c.surface, AA_UI],
    ['borderStrong / surface (input edge)', c.borderStrong, c.surface, 1.2],
  ])('%s', (_, fg, bg, min) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
  });

  it.each(Object.entries(c.status))('status %s', (_, { foreground, background }) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1);
  });
});
