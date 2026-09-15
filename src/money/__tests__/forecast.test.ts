import { advance, dueUpTo, monthlyEquivalent, nextPayday, occurrences } from '../recurring';
import { safeToSpend } from '../safeToSpend';
import { detectSubscriptions } from '../subscriptions';
import { valueLot } from '../goldLots';
import { payoffPlan } from '../debt';

const DAY = 86_400_000;
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day).getTime();

describe('recurring', () => {
  it('advances monthly with month-end clamping', () => {
    expect(new Date(advance(d(2026, 1, 31), 'monthly')).getDate()).toBe(28);
    expect(advance(d(2026, 3, 10), 'weekly')).toBe(d(2026, 3, 17));
    expect(new Date(advance(d(2024, 2, 29), 'yearly')).getDate()).toBe(28);
  });
  it('lists occurrences in a window and due dates up to now', () => {
    const rule = { id: 'r', next_due: d(2026, 9, 1), frequency: 'monthly' as const, interval: 1, end_at: null, enabled: 1 };
    expect(occurrences(rule, d(2026, 9, 15), d(2026, 12, 31)).map((o) => new Date(o.at).getMonth())).toEqual([9, 10, 11]);
    const due = dueUpTo(rule, d(2026, 11, 5));
    expect(due.due).toHaveLength(3);
    expect(due.nextDue).toBe(d(2026, 12, 1));
  });
  it('monthly equivalents and payday', () => {
    expect(monthlyEquivalent(120, 'yearly')).toBe(10);
    expect(monthlyEquivalent(12, 'weekly')).toBeCloseTo(52);
    expect(new Date(nextPayday(28, d(2026, 9, 12))).getDate()).toBe(28);
    expect(new Date(nextPayday(5, d(2026, 9, 12))).getMonth()).toBe(9);
    expect(new Date(nextPayday(31, d(2026, 9, 30))).getDate()).toBe(30);
  });
});

describe('safeToSpend', () => {
  it('subtracts bills and goals and divides by days', () => {
    const s = safeToSpend({ liquidCash: 10_000, billsBeforePayday: 3_000, goalContributions: 1_000, daysToPayday: 12 });
    expect(s.total).toBe(6_000);
    expect(s.perDay).toBe(500);
  });
});

describe('detectSubscriptions', () => {
  it('finds a monthly charge and ignores one-offs', () => {
    const base = d(2026, 6, 3);
    const txs = [
      { merchant: 'Netflix', amount: 200, currency: 'EGP', occurred_at: base },
      { merchant: 'Netflix', amount: 200, currency: 'EGP', occurred_at: base + 30 * DAY },
      { merchant: 'netflix', amount: 201, currency: 'EGP', occurred_at: base + 61 * DAY },
      { merchant: 'Carrefour', amount: 540, currency: 'EGP', occurred_at: base },
      { merchant: 'Carrefour', amount: 1200, currency: 'EGP', occurred_at: base + 4 * DAY },
    ];
    const subs = detectSubscriptions(txs);
    expect(subs).toHaveLength(1);
    expect(subs[0]).toMatchObject({ merchant: 'Netflix', cadence: 'monthly', occurrences: 3 });
    expect(subs[0].yearlyCost).toBeCloseTo(subs[0].monthlyCost * 12);
  });
});

describe('valueLot', () => {
  it('values 21k against a 24k gram price with making charge in cost', () => {
    const v = valueLot({ grams: 10, karat: 21, price_per_gram: 4000, making_charge: 500, sold_at: null, sold_price_per_gram: null }, 5000);
    expect(v.cost).toBe(40_500);
    expect(v.value).toBeCloseTo(43_750);
    expect(v.gain).toBeCloseTo(3_250);
  });
  it('uses realised price when sold', () => {
    const v = valueLot({ grams: 5, karat: 24, price_per_gram: 4000, making_charge: 0, sold_at: 1, sold_price_per_gram: 4500 }, 9999);
    expect(v.value).toBe(22_500);
  });
});

describe('payoffPlan', () => {
  const debts = [
    { id: 'a', name: 'Visa', balance: 12_000, apr: 36, minPayment: 600 },
    { id: 'b', name: 'Store card', balance: 3_000, apr: 24, minPayment: 300 },
  ];
  it('snowball clears the small debt first; avalanche pays less interest', () => {
    const snow = payoffPlan(debts, 2_500, 'snowball');
    const aval = payoffPlan(debts, 2_500, 'avalanche');
    expect(snow.order).toEqual(['b', 'a']);
    expect(aval.order).toEqual(['a', 'b']);
    expect(snow.clearedAt.b).toBeLessThan(snow.clearedAt.a);
    expect(aval.totalInterest).toBeLessThanOrEqual(snow.totalInterest);
    expect(snow.insufficient).toBe(false);
    expect(snow.months).toBeGreaterThan(0);
  });
  it('flags a budget below minimums', () => {
    expect(payoffPlan(debts, 500, 'snowball').insufficient).toBe(true);
  });
});
