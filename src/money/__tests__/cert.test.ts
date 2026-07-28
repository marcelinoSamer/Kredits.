import { computeCert } from '../cert';

const DAY = 86_400_000;
function ts(y: number, m: number, d: number): number {
  return new Date(y, m - 1, d, 12, 0, 0, 0).getTime();
}

describe('computeCert', () => {
  it('projects simple interest over the full term', () => {
    const starts = ts(2026, 1, 1);
    const matures = starts + 365 * DAY;
    const s = computeCert({ principal: 10_000, ratePct: 10, startsAt: starts, maturesAt: matures, now: starts });
    expect(s.projectedInterest).toBeCloseTo(1000, 5);
    expect(s.maturityValue).toBeCloseTo(11_000, 5);
    expect(s.termDays).toBe(365);
  });

  it('accrues interest pro-rata to the elapsed time', () => {
    const starts = ts(2026, 1, 1);
    const matures = starts + 365 * DAY;
    const half = starts + 182.5 * DAY;
    const s = computeCert({ principal: 10_000, ratePct: 10, startsAt: starts, maturesAt: matures, now: half });
    expect(s.accruedInterest).toBeCloseTo(500, 0);
  });

  it('caps accrued interest at the full term once matured', () => {
    const starts = ts(2026, 1, 1);
    const matures = starts + 365 * DAY;
    const s = computeCert({ principal: 10_000, ratePct: 10, startsAt: starts, maturesAt: matures, now: matures + 100 * DAY });
    expect(s.accruedInterest).toBeCloseTo(1000, 5);
    expect(s.matured).toBe(true);
    expect(s.daysToMaturity).toBe(0);
  });

  it('reports zero interest for a no-interest deposit', () => {
    const starts = ts(2026, 1, 1);
    const matures = starts + 365 * DAY;
    const s = computeCert({ principal: 5000, ratePct: null, startsAt: starts, maturesAt: matures, now: starts + 100 * DAY });
    expect(s.accruedInterest).toBe(0);
    expect(s.projectedInterest).toBe(0);
    expect(s.maturityValue).toBe(5000);
  });

  it('handles a certificate with no dates set', () => {
    const s = computeCert({ principal: 5000, ratePct: 8, startsAt: null, maturesAt: null, now: ts(2026, 7, 1) });
    expect(s.termDays).toBeNull();
    expect(s.daysToMaturity).toBeNull();
    expect(s.matured).toBe(false);
    expect(s.accruedInterest).toBe(0);
    expect(s.projectedInterest).toBe(0);
  });

  it('counts days remaining before maturity', () => {
    const now = ts(2026, 7, 1);
    const s = computeCert({ principal: 1000, ratePct: 5, startsAt: ts(2026, 1, 1), maturesAt: now + 30 * DAY, now });
    expect(s.daysToMaturity).toBe(30);
    expect(s.matured).toBe(false);
  });
});
