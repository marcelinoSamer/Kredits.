// Pure credit-pocket math. A credit pocket is a card / line of credit: charges
// (expenses booked on it) build up debt, repayments (money moved back in) clear
// it. Each charge must be repaid within a grace window (e.g. 55 days), and
// repayments settle the oldest charges first (FIFO), so the "next due" is always
// the oldest still-unpaid charge. Kept UI-free and tested.

const DAY = 86_400_000;

/** A single spend booked against the credit pocket. */
export interface CreditCharge {
  occurredAt: number;
  amount: number;
}

/** Money moved back into the pocket to pay it down. */
export interface CreditRepayment {
  occurredAt: number;
  amount: number;
}

/** An unpaid (or partly paid) charge with its repayment deadline. */
export interface OutstandingCharge {
  occurredAt: number;
  dueAt: number;
  /** Original charge amount. */
  amount: number;
  /** Still owed on this charge after FIFO repayments. */
  remaining: number;
  overdue: boolean;
}

export interface CreditStatus {
  limit: number;
  /** Total still owed across all charges. */
  owed: number;
  /** limit − owed. Negative if the pocket is over its limit. */
  available: number;
  /** owed / limit, as a 0–100 percentage (0 when no limit set). */
  utilization: number;
  /** Charges with money still owed, oldest first. */
  outstanding: OutstandingCharge[];
  /** Due date of the oldest unpaid charge, or null when nothing is owed. */
  nextDueAt: number | null;
  /** Amount still owed on that oldest unpaid charge. */
  nextDueAmount: number;
  /** Sum still owed on charges whose due date has already passed. */
  overdueAmount: number;
}

// Below this, a remaining balance is float dust and counts as fully paid.
const EPS = 0.005;

/**
 * Derive the state of a credit pocket from its charges and repayments.
 * Repayments are applied to the oldest charges first.
 */
export function computeCreditStatus(args: {
  limit: number;
  graceDays: number;
  charges: CreditCharge[];
  repayments: CreditRepayment[];
  now: number;
}): CreditStatus {
  const { limit, graceDays, charges, repayments, now } = args;
  const grace = Math.max(0, graceDays) * DAY;

  const sorted = [...charges].sort((a, b) => a.occurredAt - b.occurredAt);
  let pool = repayments.reduce((sum, r) => sum + r.amount, 0);

  const outstanding: OutstandingCharge[] = [];
  for (const c of sorted) {
    const paid = Math.min(pool, c.amount);
    pool -= paid;
    const remaining = c.amount - paid;
    if (remaining <= EPS) continue;
    const dueAt = c.occurredAt + grace;
    outstanding.push({
      occurredAt: c.occurredAt,
      dueAt,
      amount: c.amount,
      remaining,
      overdue: dueAt < now,
    });
  }

  const owed = outstanding.reduce((sum, o) => sum + o.remaining, 0);
  const overdueAmount = outstanding
    .filter((o) => o.overdue)
    .reduce((sum, o) => sum + o.remaining, 0);
  const next = outstanding[0] ?? null;

  return {
    limit,
    owed,
    available: limit - owed,
    utilization: limit > 0 ? (owed / limit) * 100 : 0,
    outstanding,
    nextDueAt: next ? next.dueAt : null,
    nextDueAmount: next ? next.remaining : 0,
    overdueAmount,
  };
}

/** Whole days from `now` until `dueAt` (negative when already overdue). */
export function daysUntil(dueAt: number, now: number): number {
  return Math.ceil((dueAt - now) / DAY);
}
