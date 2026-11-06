/**
 * Divisão de gastos (7.4). Pure: who paid what, who owes whom.
 *
 * A party is a trip member (their user id) or a companion without an account
 * ("name:Bia"). Each expense is paid by one party and shared equally by its
 * participants. A balance > 0 is money to receive; < 0, money to pay.
 */

export type Party = { key: string; name: string };
export type SplitExpense = { amount: number; paidBy: string; participants: readonly string[] };
export type Transfer = { from: string; to: string; amount: number };

const cents = (n: number) => Math.round(n * 100);

/** Balance of every party, in cents to avoid float drift, back in currency units. */
export function balances(
  expenses: readonly SplitExpense[],
  parties: readonly Party[],
): Map<string, number> {
  const total = new Map<string, number>(parties.map((p) => [p.key, 0]));
  for (const e of expenses) {
    const people = e.participants.length ? e.participants : [e.paidBy];
    const amount = cents(e.amount);
    const share = Math.floor(amount / people.length);
    // The leftover cents fall on the first participants (never lost).
    let rest = amount - share * people.length;
    total.set(e.paidBy, (total.get(e.paidBy) ?? 0) + amount);
    for (const key of people) {
      const extra = rest > 0 ? 1 : 0;
      rest -= extra;
      total.set(key, (total.get(key) ?? 0) - share - extra);
    }
  }
  return new Map([...total].map(([key, value]) => [key, value / 100]));
}

/** Fewest transfers that settle everything: the biggest debtor pays the biggest creditor. */
export function settle(balance: ReadonlyMap<string, number>): Transfer[] {
  const debt = [...balance].filter(([, v]) => v < -0.004).map(([k, v]) => ({ k, v: cents(-v) }));
  const credit = [...balance].filter(([, v]) => v > 0.004).map(([k, v]) => ({ k, v: cents(v) }));
  const out: Transfer[] = [];
  debt.sort((a, b) => b.v - a.v);
  credit.sort((a, b) => b.v - a.v);
  let i = 0;
  let j = 0;
  while (i < debt.length && j < credit.length) {
    const d = debt[i];
    const c = credit[j];
    if (!d || !c) break;
    const amount = Math.min(d.v, c.v);
    if (amount > 0) out.push({ from: d.k, to: c.k, amount: amount / 100 });
    d.v -= amount;
    c.v -= amount;
    if (d.v === 0) i++;
    if (c.v === 0) j++;
  }
  return out;
}

/** Party key of a companion without an account. */
export const companionKey = (name: string) => `name:${name}`;
