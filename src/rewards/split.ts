// Payday split: divide an incoming amount across Pockets by percentage.
// Rounds to currency precision and keeps any remainder in the source Pocket
// so the parts never exceed the total.

export interface SplitRule {
  accountId: string;
  percent: number;
}

export interface SplitPart {
  accountId: string;
  amount: number;
}

export function totalPercent(rules: SplitRule[]): number {
  return rules.reduce((s, r) => s + (Number.isFinite(r.percent) ? r.percent : 0), 0);
}

/** True when the rules are usable: 1..100% total, every percent > 0, no duplicate Pocket. */
export function rulesValid(rules: SplitRule[]): boolean {
  if (rules.length === 0) return false;
  const total = totalPercent(rules);
  if (total <= 0 || total > 100.0001) return false;
  if (rules.some((r) => !(r.percent > 0))) return false;
  return new Set(rules.map((r) => r.accountId)).size === rules.length;
}

export function splitAmounts(total: number, rules: SplitRule[], decimals = 2): SplitPart[] {
  const f = 10 ** decimals;
  const parts = rules.map((r) => ({ accountId: r.accountId, amount: Math.floor((total * r.percent) / 100 * f) / f }));
  return parts.filter((p) => p.amount > 0);
}

/** What stays in the source Pocket after the split. */
export function remainder(total: number, parts: SplitPart[], decimals = 2): number {
  const f = 10 ** decimals;
  const used = parts.reduce((s, p) => s + p.amount, 0);
  return Math.round((total - used) * f) / f;
}
