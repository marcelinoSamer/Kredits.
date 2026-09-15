import { computeStreak } from '../streak';
import { applyPrize, EMPTY_REWARDS, pickPrize, PRIZES, rotationFor, spinGate } from '../wheel';
import { remainder, rulesValid, splitAmounts } from '../split';
import { suggestCategory } from '../merchantMemory';

const DAY = 86_400_000;
const today = new Date(2026, 8, 12).getTime();

describe('computeStreak', () => {
  it('counts consecutive days ending today', () => {
    const r = computeStreak([today, today - DAY, today - 2 * DAY, today - 5 * DAY], today);
    expect(r).toEqual({ days: 3, loggedToday: true, shieldsUsed: 0 });
  });
  it('keeps a streak alive when nothing logged yet today', () => {
    const r = computeStreak([today - DAY, today - 2 * DAY], today);
    expect(r).toEqual({ days: 2, loggedToday: false, shieldsUsed: 0 });
  });
  it('is zero after a missed day without shields', () => {
    expect(computeStreak([today - 2 * DAY], today).days).toBe(0);
  });
  it('bridges one gap with a shield', () => {
    const r = computeStreak([today, today - 2 * DAY, today - 3 * DAY], today, 1);
    expect(r.days).toBe(3);
    expect(r.shieldsUsed).toBe(1);
  });
});

describe('wheel', () => {
  it('gates one spin per day behind logging', () => {
    expect(spinGate(EMPTY_REWARDS, today, false)).toBe('logFirst');
    expect(spinGate(EMPTY_REWARDS, today, true)).toBe('ready');
    expect(spinGate({ ...EMPTY_REWARDS, lastSpinDay: today }, today, true)).toBe('spunToday');
  });
  it('picks prizes by weight', () => {
    expect(pickPrize(() => 0)).toBe(0);
    expect(pickPrize(() => 0.999999)).toBe(PRIZES.length - 1);
  });
  it('applies points, shields and coupons', () => {
    const now = today + 1000;
    let s = applyPrize(EMPTY_REWARDS, PRIZES.find((p) => p.id === 'p50')!, today, now);
    expect(s.points).toBe(50);
    expect(s.lastSpinDay).toBe(today);
    s = applyPrize(s, PRIZES.find((p) => p.id === 'shield')!, today, now);
    expect(s.shields).toBe(1);
    s = applyPrize(s, PRIZES.find((p) => p.id === 'c-cafe')!, today, now);
    expect(s.coupons).toHaveLength(1);
    expect(s.coupons[0].expiresAt).toBe(now + 7 * DAY);
  });
  it('rotation lands pointer on the sector centre', () => {
    expect(rotationFor(0, 4, 0)).toBe(315);
    expect(rotationFor(3, 4, 1)).toBe(360 + 45);
  });
});

describe('split', () => {
  const rules = [
    { accountId: 'a', percent: 50 },
    { accountId: 'b', percent: 30 },
  ];
  it('validates rules', () => {
    expect(rulesValid(rules)).toBe(true);
    expect(rulesValid([])).toBe(false);
    expect(rulesValid([{ accountId: 'a', percent: 60 }, { accountId: 'a', percent: 10 }])).toBe(false);
    expect(rulesValid([{ accountId: 'a', percent: 101 }])).toBe(false);
  });
  it('splits with floor rounding and remainder', () => {
    const parts = splitAmounts(1000.01, rules);
    expect(parts).toEqual([
      { accountId: 'a', amount: 500 },
      { accountId: 'b', amount: 300 },
    ]);
    expect(remainder(1000.01, parts)).toBe(200.01);
  });
});

describe('merchant memory', () => {
  it('suggests the most used category once seen twice', () => {
    expect(suggestCategory([{ category_id: 'food', uses: 1 }])).toBeNull();
    expect(suggestCategory([{ category_id: 'food', uses: 2 }, { category_id: null, uses: 5 }])).toBe('food');
    expect(suggestCategory([{ category_id: 'food', uses: 2 }, { category_id: 'fun', uses: 3 }])).toBe('fun');
  });
});
