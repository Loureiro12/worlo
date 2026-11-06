import { ACTIVITY_GROUPS, ACTIVITY_ICONS, groupOf, normalizeTime } from './activities';

describe('activities', () => {
  it('has the shortcuts the team asked for, each with an icon', () => {
    expect(ACTIVITY_GROUPS.find((g) => g.key === 'food')?.kinds).toEqual([
      'breakfast',
      'afternoonCoffee',
      'lunch',
      'dinner',
      'snack',
    ]);
    expect(groupOf('checkOut')).toBe('lodging');
    expect(groupOf('rest')).toBe('rest');
    for (const g of ACTIVITY_GROUPS)
      for (const k of g.kinds) expect(ACTIVITY_ICONS[k]).toBeTruthy();
  });

  it('reads times the way people type them', () => {
    expect(normalizeTime('8')).toBe('08:00');
    expect(normalizeTime('8h30')).toBe('08:30');
    expect(normalizeTime('19h')).toBe('19:00');
    expect(normalizeTime('7 h')).toBe('07:00');
    expect(normalizeTime('20:15')).toBe('20:15');
    expect(normalizeTime('')).toBe('');
    expect(normalizeTime('25:00')).toBeNull();
    expect(normalizeTime('tarde')).toBeNull();
  });
});
