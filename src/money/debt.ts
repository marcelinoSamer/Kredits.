// Debt payoff planner for credit Pockets: snowball (smallest balance first) or
// avalanche (highest interest first). Month-by-month simulation.

export interface Debt {
  id: string;
  name: string;
  balance: number; // owed, positive
  apr: number; // yearly %, 0 allowed
  minPayment: number;
}

export type Strategy = 'snowball' | 'avalanche';

export interface PayoffPlan {
  months: number;
  totalInterest: number;
  totalPaid: number;
  order: string[];
  /** Month index (1-based) each debt is cleared. */
  clearedAt: Record<string, number>;
  /** True when the budget cannot cover minimum payments (plan never finishes). */
  insufficient: boolean;
}

export function orderDebts(debts: Debt[], strategy: Strategy): Debt[] {
  const copy = [...debts];
  if (strategy === 'snowball') copy.sort((a, b) => a.balance - b.balance);
  else copy.sort((a, b) => b.apr - a.apr || a.balance - b.balance);
  return copy;
}

export function payoffPlan(debts: Debt[], monthlyBudget: number, strategy: Strategy, maxMonths = 600): PayoffPlan {
  const ordered = orderDebts(debts, strategy).map((d) => ({ ...d }));
  const clearedAt: Record<string, number> = {};
  let totalInterest = 0;
  let totalPaid = 0;
  let month = 0;
  const minTotal = ordered.reduce((s, d) => s + Math.min(d.minPayment, d.balance), 0);
  if (ordered.length === 0) return { months: 0, totalInterest: 0, totalPaid: 0, order: [], clearedAt, insufficient: false };
  if (monthlyBudget < minTotal) return { months: 0, totalInterest: 0, totalPaid: 0, order: ordered.map((d) => d.id), clearedAt, insufficient: true };

  while (ordered.some((d) => d.balance > 0.005) && month < maxMonths) {
    month++;
    // Interest accrues first.
    for (const d of ordered) {
      if (d.balance <= 0) continue;
      const i = (d.balance * d.apr) / 100 / 12;
      d.balance += i;
      totalInterest += i;
    }
    let budget = monthlyBudget;
    // Minimums.
    for (const d of ordered) {
      if (d.balance <= 0) continue;
      const pay = Math.min(d.minPayment, d.balance, budget);
      d.balance -= pay;
      budget -= pay;
      totalPaid += pay;
    }
    // Everything left goes to the focus debt (first open one in order).
    for (const d of ordered) {
      if (budget <= 0) break;
      if (d.balance <= 0) continue;
      const pay = Math.min(d.balance, budget);
      d.balance -= pay;
      budget -= pay;
      totalPaid += pay;
    }
    for (const d of ordered) if (d.balance <= 0.005 && !clearedAt[d.id]) clearedAt[d.id] = month;
  }
  return { months: month, totalInterest, totalPaid, order: ordered.map((d) => d.id), clearedAt, insufficient: month >= maxMonths };
}
