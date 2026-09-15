// Subscription radar: find merchants charged the same amount on a steady
// cadence, from the user's own receipts. No bank feed needed.

export interface TxLike {
  merchant: string | null;
  amount: number;
  currency: string;
  occurred_at: number;
}

export interface Subscription {
  merchant: string;
  amount: number;
  currency: string;
  cadence: 'weekly' | 'monthly' | 'yearly';
  occurrences: number;
  lastAt: number;
  nextExpected: number;
  monthlyCost: number;
  yearlyCost: number;
}

const DAY = 86_400_000;

function cadenceOf(avgGapDays: number): Subscription['cadence'] | null {
  if (avgGapDays >= 5.5 && avgGapDays <= 8.5) return 'weekly';
  if (avgGapDays >= 26 && avgGapDays <= 35) return 'monthly';
  if (avgGapDays >= 350 && avgGapDays <= 380) return 'yearly';
  return null;
}

export function detectSubscriptions(txs: TxLike[], minOccurrences = 2): Subscription[] {
  const groups = new Map<string, TxLike[]>();
  for (const t of txs) {
    const m = t.merchant?.trim();
    if (!m) continue;
    const key = `${m.toLowerCase()}|${t.currency}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(t);
  }
  const out: Subscription[] = [];
  for (const list of groups.values()) {
    list.sort((a, b) => a.occurred_at - b.occurred_at);
    // Cluster by amount within 2%.
    const clusters: TxLike[][] = [];
    for (const t of list) {
      const c = clusters.find((cl) => Math.abs(cl[0].amount - t.amount) <= Math.max(0.5, cl[0].amount * 0.02));
      if (c) c.push(t);
      else clusters.push([t]);
    }
    for (const c of clusters) {
      if (c.length < minOccurrences) continue;
      const gaps: number[] = [];
      for (let i = 1; i < c.length; i++) gaps.push((c[i].occurred_at - c[i - 1].occurred_at) / DAY);
      const avg = gaps.reduce((s, g) => s + g, 0) / gaps.length;
      const cadence = cadenceOf(avg);
      if (!cadence) continue;
      const amount = c.reduce((s, t) => s + t.amount, 0) / c.length;
      const monthly = cadence === 'weekly' ? (amount * 52) / 12 : cadence === 'yearly' ? amount / 12 : amount;
      const last = c[c.length - 1].occurred_at;
      out.push({
        merchant: c[0].merchant!.trim(),
        amount,
        currency: c[0].currency,
        cadence,
        occurrences: c.length,
        lastAt: last,
        nextExpected: last + Math.round(avg) * DAY,
        monthlyCost: monthly,
        yearlyCost: monthly * 12,
      });
    }
  }
  return out.sort((a, b) => b.monthlyCost - a.monthlyCost);
}
