import { computeCreditStatus, daysUntil } from '../credit';

const DAY = 86_400_000;
function ts(y: number, m: number, d: number, h = 12): number {
  return new Date(y, m - 1, d, h, 0, 0, 0).getTime();
}

describe('computeCreditStatus', () => {
  const limit = 10_000;
  const graceDays = 55;

  it('reports full available credit when nothing is charged', () => {
    const s = computeCreditStatus({ limit, graceDays, charges: [], repayments: [], now: ts(2026, 7, 1) });
    expect(s.owed).toBe(0);
    expect(s.available).toBe(10_000);
    expect(s.utilization).toBe(0);
    expect(s.nextDueAt).toBeNull();
    expect(s.outstanding).toHaveLength(0);
  });

  it('owes the charged amount and shrinks available credit', () => {
    const s = computeCreditStatus({
      limit,
      graceDays,
      charges: [{ occurredAt: ts(2026, 7, 1), amount: 2500 }],
      repayments: [],
      now: ts(2026, 7, 2),
    });
    expect(s.owed).toBe(2500);
    expect(s.available).toBe(7500);
    expect(s.utilization).toBe(25);
    expect(s.outstanding).toHaveLength(1);
  });

  it('sets the next-due date at charge date + grace window', () => {
    const charged = ts(2026, 7, 1);
    const s = computeCreditStatus({
      limit,
      graceDays,
      charges: [{ occurredAt: charged, amount: 1000 }],
      repayments: [],
      now: ts(2026, 7, 2),
    });
    expect(s.nextDueAt).toBe(charged + 55 * DAY);
    expect(s.nextDueAmount).toBe(1000);
  });

  it('applies repayments to the oldest charge first (FIFO)', () => {
    const s = computeCreditStatus({
      limit,
      graceDays,
      charges: [
        { occurredAt: ts(2026, 7, 1), amount: 1000 },
        { occurredAt: ts(2026, 7, 10), amount: 1000 },
      ],
      repayments: [{ occurredAt: ts(2026, 7, 15), amount: 1000 }],
      now: ts(2026, 7, 16),
    });
    // First charge is fully cleared; only the second remains.
    expect(s.owed).toBe(1000);
    expect(s.outstanding).toHaveLength(1);
    expect(s.outstanding[0].occurredAt).toBe(ts(2026, 7, 10));
    expect(s.nextDueAt).toBe(ts(2026, 7, 10) + 55 * DAY);
  });

  it('partially clears a charge and keeps the remainder', () => {
    const s = computeCreditStatus({
      limit,
      graceDays,
      charges: [{ occurredAt: ts(2026, 7, 1), amount: 1000 }],
      repayments: [{ occurredAt: ts(2026, 7, 5), amount: 400 }],
      now: ts(2026, 7, 6),
    });
    expect(s.owed).toBe(600);
    expect(s.outstanding[0].remaining).toBe(600);
  });

  it('flags overdue charges past their grace window', () => {
    const charged = ts(2026, 5, 1);
    const s = computeCreditStatus({
      limit,
      graceDays,
      charges: [{ occurredAt: charged, amount: 800 }],
      repayments: [],
      now: charged + 60 * DAY, // 5 days past the 55-day window
    });
    expect(s.outstanding[0].overdue).toBe(true);
    expect(s.overdueAmount).toBe(800);
  });

  it('goes negative-available when charges exceed the limit', () => {
    const s = computeCreditStatus({
      limit: 1000,
      graceDays,
      charges: [{ occurredAt: ts(2026, 7, 1), amount: 1500 }],
      repayments: [],
      now: ts(2026, 7, 2),
    });
    expect(s.available).toBe(-500);
    expect(s.utilization).toBe(150);
  });
});

describe('daysUntil', () => {
  it('is positive before the date and negative after', () => {
    const now = ts(2026, 7, 1);
    expect(daysUntil(now + 10 * DAY, now)).toBe(10);
    expect(daysUntil(now - 3 * DAY, now)).toBe(-3);
  });
});
