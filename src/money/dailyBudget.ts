// Daily budget: a single daily allowance, independent of Pockets and of the
// monthly category budgets. Spending from any Pocket counts against it. With
// rollover on, whatever is left at midnight carries into tomorrow (and an
// overspend eats into tomorrow), the classic "daily budget" discipline.

const DAY = 86_400_000;

export interface DailyBudgetConfig {
  /** Allowance per day, in the display currency. */
  amount: number;
  rollover: boolean;
  /** Local-midnight day key when tracking (re)started. */
  startDay: number;
}

export interface DailyBudgetStatus {
  /** What may be spent today: amount + carried. */
  allowance: number;
  spentToday: number;
  left: number;
  /** Net carried over from previous days (0 when rollover is off). */
  carried: number;
  /** 0..1 share of today's allowance used. */
  used: number;
  daysTracked: number;
}

/**
 * @param spentByDay  dayKey -> total spent that day (display currency).
 */
export function dailyBudgetStatus(
  cfg: DailyBudgetConfig,
  spentByDay: Map<number, number>,
  today: number,
): DailyBudgetStatus {
  let carried = 0;
  let daysTracked = 0;
  if (cfg.rollover) {
    for (let d = cfg.startDay; d < today; d += DAY) {
      carried += cfg.amount - (spentByDay.get(d) ?? 0);
      daysTracked++;
    }
  } else {
    daysTracked = Math.max(0, Math.round((today - cfg.startDay) / DAY));
  }
  const allowance = cfg.amount + carried;
  const spentToday = spentByDay.get(today) ?? 0;
  const left = allowance - spentToday;
  const used = allowance > 0 ? Math.min(1, Math.max(0, spentToday / allowance)) : spentToday > 0 ? 1 : 0;
  return { allowance, spentToday, left, carried, used, daysTracked };
}
