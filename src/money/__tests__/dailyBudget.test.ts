import { dailyBudgetStatus } from '../dailyBudget';

const DAY = 86_400_000;
const today = new Date(2026, 8, 12).getTime();

describe('dailyBudgetStatus', () => {
  it('without rollover, allowance is the flat daily amount', () => {
    const s = dailyBudgetStatus({ amount: 300, rollover: false, startDay: today - 3 * DAY }, new Map([[today, 120]]), today);
    expect(s).toMatchObject({ allowance: 300, spentToday: 120, left: 180, carried: 0, daysTracked: 3 });
    expect(s.used).toBeCloseTo(0.4);
  });

  it('with rollover, unspent days carry forward and overspend eats tomorrow', () => {
    const spent = new Map([
      [today - 2 * DAY, 100], // +200
      [today - DAY, 450], // -150
      [today, 50],
    ]);
    const s = dailyBudgetStatus({ amount: 300, rollover: true, startDay: today - 2 * DAY }, spent, today);
    expect(s.carried).toBe(50);
    expect(s.allowance).toBe(350);
    expect(s.left).toBe(300);
    expect(s.daysTracked).toBe(2);
  });

  it('caps used at 1 when overspent', () => {
    const s = dailyBudgetStatus({ amount: 100, rollover: false, startDay: today }, new Map([[today, 250]]), today);
    expect(s.left).toBe(-150);
    expect(s.used).toBe(1);
  });
});
