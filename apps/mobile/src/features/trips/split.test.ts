import { balances, companionKey, settle } from './split';

const parties = [
  { key: 'ana', name: 'Ana' },
  { key: 'bia', name: 'Bia' },
  { key: companionKey('Caio'), name: 'Caio' },
];

describe('divisão de gastos', () => {
  it('who paid gets back what the others owe', () => {
    const b = balances(
      [{ amount: 90, paidBy: 'ana', participants: ['ana', 'bia', 'name:Caio'] }],
      parties,
    );
    expect(Object.fromEntries(b)).toEqual({ ana: 60, bia: -30, 'name:Caio': -30 });
    expect(settle(b)).toEqual([
      { from: 'bia', to: 'ana', amount: 30 },
      { from: 'name:Caio', to: 'ana', amount: 30 },
    ]);
  });

  it('only those who took part pay their share; the payer may not be one of them', () => {
    const b = balances(
      [
        { amount: 100, paidBy: 'ana', participants: ['bia', 'name:Caio'] },
        { amount: 40, paidBy: 'bia', participants: ['ana', 'bia'] },
      ],
      parties,
    );
    expect(Object.fromEntries(b)).toEqual({ ana: 80, bia: -30, 'name:Caio': -50 });
    expect(settle(b)).toEqual([
      { from: 'name:Caio', to: 'ana', amount: 50 },
      { from: 'bia', to: 'ana', amount: 30 },
    ]);
  });

  it('never loses a cent and settles in as few transfers as possible', () => {
    const b = balances(
      [{ amount: 100, paidBy: 'ana', participants: ['ana', 'bia', 'name:Caio'] }],
      parties,
    );
    const sum = [...b.values()].reduce((s, v) => s + v, 0);
    expect(Math.abs(sum)).toBeLessThan(0.001);
    expect(settle(b).reduce((s, x) => s + x.amount, 0)).toBeCloseTo(66.66, 1);
    expect(settle(balances([], parties))).toEqual([]);
  });
});
