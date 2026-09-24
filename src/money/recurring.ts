// Repeating receipts: pure date arithmetic for bills, subscriptions and salary.

import type { Frequency } from '@/db/schema';

/** The occurrence after `due` for a rule. Month/year steps clamp to month end. */
export function advance(due: number, frequency: Frequency, interval = 1): number {
  const d = new Date(due);
  if (frequency === 'weekly') return due + 7 * 86_400_000 * interval;
  const day = d.getDate();
  const target = new Date(d);
  target.setDate(1);
  if (frequency === 'monthly') target.setMonth(d.getMonth() + interval);
  else target.setFullYear(d.getFullYear() + interval);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return target.getTime();
}

export interface RuleLike {
  id: string;
  next_due: number;
  frequency: Frequency;
  interval: number;
  end_at: number | null;
  enabled: number;
}

/** All due dates of a rule inside [from, to], starting from its next_due. */
export function occurrences<R extends RuleLike>(rule: R, from: number, to: number, cap = 60): { rule: R; at: number }[] {
  if (!rule.enabled) return [];
  const out: { rule: R; at: number }[] = [];
  let at = rule.next_due;
  let n = 0;
  while (at <= to && n < cap) {
    if (rule.end_at != null && at > rule.end_at) break;
    if (at >= from) out.push({ rule, at });
    at = advance(at, rule.frequency, rule.interval);
    n++;
  }
  return out;
}

/** Due dates at or before `now` (to post), and the next_due to store afterwards. */
export function dueUpTo<R extends RuleLike>(rule: R, now: number, cap = 24): { due: number[]; nextDue: number } {
  const due: number[] = [];
  let at = rule.next_due;
  let n = 0;
  while (at <= now && n < cap && (rule.end_at == null || at <= rule.end_at)) {
    due.push(at);
    at = advance(at, rule.frequency, rule.interval);
    n++;
  }
  return { due, nextDue: at };
}

/** Monthly-equivalent cost of a rule amount. */
export function monthlyEquivalent(amount: number, frequency: Frequency, interval = 1): number {
  if (frequency === 'weekly') return (amount * 52) / 12 / interval;
  if (frequency === 'yearly') return amount / 12 / interval;
  return amount / interval;
}

/** Next payday: the given day-of-month, today or later. */
export function nextPayday(paydayDay: number, now: number): number {
  const d = new Date(now);
  const clamp = (y: number, m: number) => Math.min(paydayDay, new Date(y, m + 1, 0).getDate());
  let t = new Date(d.getFullYear(), d.getMonth(), clamp(d.getFullYear(), d.getMonth()), 23, 59, 59, 999).getTime();
  if (t < now) t = new Date(d.getFullYear(), d.getMonth() + 1, clamp(d.getFullYear(), d.getMonth() + 1), 23, 59, 59, 999).getTime();
  return t;
}
