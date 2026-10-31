import { describe, expect, it } from 'vitest';
import { createI18n, resolveLanguage, resources, supportedLanguages } from './index';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') acc[path] = value;
    else Object.assign(acc, flatten(value, path));
    return acc;
  }, {});
}

const placeholders = (text: string) => [...text.matchAll(/{{\s*(\w+)/g)].map((m) => m[1]).sort();

const reference = flatten(resources['pt-BR'].translation);

describe.each(supportedLanguages)('locale %s', (lang) => {
  const messages = flatten(resources[lang].translation);

  it('has exactly the same keys as pt-BR', () => {
    expect(Object.keys(messages).sort()).toEqual(Object.keys(reference).sort());
  });

  it('has no empty messages', () => {
    expect(Object.entries(messages).filter(([, text]) => text.trim() === '')).toEqual([]);
  });

  it('uses the same interpolation variables as pt-BR', () => {
    for (const [key, text] of Object.entries(messages)) {
      expect({ key, vars: placeholders(text) }).toEqual({
        key,
        vars: placeholders(reference[key] ?? ''),
      });
    }
  });
});

describe('resolveLanguage', () => {
  it.each([
    [['pt-BR'], 'pt-BR'],
    [['pt-PT'], 'pt-BR'],
    [['en-US', 'pt-BR'], 'en'],
    [['fr-FR', 'es-MX'], 'es'],
    [['ja-JP'], 'pt-BR'],
    [[null, undefined], 'pt-BR'],
  ])('%j → %s', (tags, expected) => {
    expect(resolveLanguage(tags)).toBe(expected);
  });
});

describe('createI18n', () => {
  it('translates and pluralises synchronously', () => {
    const i18n = createI18n('en');
    expect(i18n.t('common.count.countries', { count: 1 })).toBe('1 country');
    expect(i18n.t('common.count.countries', { count: 6 })).toBe('6 countries');
  });

  it('switches language at runtime', async () => {
    const i18n = createI18n('pt-BR');
    await i18n.changeLanguage('es');
    expect(i18n.t('common.tabs.trips')).toBe('Viajes');
  });
});

describe('zero counts', () => {
  it.each(supportedLanguages)('%s uses the plural form for zero', (lang) => {
    const i18n = createI18n(lang);
    expect(i18n.t('common.count.places', { count: 0 })).toMatch(/^0 \S+s$/);
  });
});
