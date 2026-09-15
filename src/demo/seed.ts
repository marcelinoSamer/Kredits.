// Demo dataset: a believable Cairo household over the last ~4 months, so every
// feature has something to show. Loaded on request only (tutorial or Settings).
// Everything is generated locally; nothing is fetched.

import { getDb } from '@/db/client';
import { createAccount } from '@/db/repositories/accounts';
import { createTransaction } from '@/db/repositories/transactions';
import { createTransfer } from '@/db/repositories/transfers';
import { createAsset } from '@/db/repositories/assets';
import { createBudget } from '@/db/repositories/budgets';
import { createGoal } from '@/db/repositories/goals';
import { createBox } from '@/db/repositories/boxes';
import { createRecurring } from '@/db/repositories/recurring';
import { createGoldLot } from '@/db/repositories/gold';
import { upsertRate } from '@/db/repositories/fxRates';
import { setSetting } from '@/db/repositories/settings';
import { saveDailyBudget } from '@/state/dailyBudget';
import { saveRewards } from '@/rewards/store';
import { dayKey } from '@/ui/date';

const DAY = 86_400_000;
export const DEMO_FLAG = 'demo_loaded';

function at(daysAgo: number, hour = 12): number {
  const d = new Date(Date.now() - daysAgo * DAY);
  d.setHours(hour, Math.floor(Math.random() * 50), 0, 0);
  return d.getTime();
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function jitter(base: number, pct = 0.25): number {
  return Math.round(base * (1 - pct + Math.random() * 2 * pct));
}

/** Wipes every ledger table (settings kept), then loads the demo. */
export async function loadDemoData(): Promise<void> {
  await eraseLedger();
  const now = Date.now();

  // Pockets
  const cash = await createAccount({ name: 'Cash', type: 'cash', currency: 'EGP', opening_balance: 2_400, icon: 'cash', color: '#34C79A' });
  const bank = await createAccount({ name: 'CIB Current', type: 'bank', currency: 'EGP', opening_balance: 38_500, icon: 'bank', color: '#42A5F5' });
  const savings = await createAccount({ name: 'USD Savings', type: 'savings', currency: 'USD', opening_balance: 3_200, icon: 'piggy-bank', color: '#7E57C2' });
  const visa = await createAccount({ name: 'CIB Visa', type: 'credit', currency: 'EGP', opening_balance: 0, icon: 'credit-card', color: '#EF6C57', credit_limit: 40_000, grace_days: 55, apr: 32 });
  const wallet = await createAccount({ name: 'Vodafone Cash', type: 'wallet', currency: 'EGP', opening_balance: 650, icon: 'cellphone', color: '#E0A93E' });

  // Rates (offline, user-maintained)
  await upsertRate('USD', 'EGP', 50.6);
  await upsertRate('EUR', 'EGP', 55.1);
  await upsertRate('SAR', 'EGP', 13.5);
  await upsertRate('XAU', 'EGP', 165_400); // per troy ounce

  // Salary + rent history and rules going forward
  for (let m = 3; m >= 0; m--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - m, 28);
    d.setHours(9, 0, 0, 0);
    if (d.getTime() <= now) {
      await createTransaction({ account_id: bank, kind: 'income', amount: 32_000, currency: 'EGP', category_id: 'cat_salary', merchant: 'Salary', occurred_at: d.getTime() });
    }
    const r = new Date(now);
    r.setMonth(r.getMonth() - m, 1);
    r.setHours(10, 0, 0, 0);
    if (r.getTime() <= now) {
      await createTransaction({ account_id: bank, kind: 'expense', amount: 9_500, currency: 'EGP', category_id: 'cat_rent', merchant: 'Rent · Maadi', occurred_at: r.getTime() });
    }
  }
  const nextMonth = (day: number) => {
    const d = new Date(now);
    d.setHours(10, 0, 0, 0);
    d.setDate(day);
    if (d.getTime() <= now) d.setMonth(d.getMonth() + 1);
    return d.getTime();
  };
  await createRecurring({ account_id: bank, kind: 'income', amount: 32_000, currency: 'EGP', category_id: 'cat_salary', merchant: 'Salary', frequency: 'monthly', next_due: nextMonth(28) });
  await createRecurring({ account_id: bank, kind: 'expense', amount: 9_500, currency: 'EGP', category_id: 'cat_rent', merchant: 'Rent · Maadi', frequency: 'monthly', next_due: nextMonth(1) });
  await createRecurring({ account_id: visa, kind: 'expense', amount: 199, currency: 'EGP', category_id: 'cat_subscriptions', merchant: 'Netflix', frequency: 'monthly', next_due: nextMonth(6) });
  await createRecurring({ account_id: visa, kind: 'expense', amount: 79.99, currency: 'EGP', category_id: 'cat_subscriptions', merchant: 'Spotify', frequency: 'monthly', next_due: nextMonth(14) });
  await createRecurring({ account_id: bank, kind: 'expense', amount: 850, currency: 'EGP', category_id: 'cat_health', merchant: 'Gold’s Gym', frequency: 'monthly', next_due: nextMonth(3) });
  await createRecurring({ account_id: wallet, kind: 'expense', amount: 320, currency: 'EGP', category_id: 'cat_bills', merchant: 'Vodafone', frequency: 'monthly', next_due: nextMonth(10) });
  await createRecurring({ account_id: bank, kind: 'expense', amount: 1_450, currency: 'EGP', category_id: 'cat_bills', merchant: 'Electricity', frequency: 'monthly', next_due: nextMonth(18), auto_post: false });
  await createRecurring({ account_id: bank, kind: 'expense', amount: 6_200, currency: 'EGP', category_id: 'cat_bills', merchant: 'Car insurance', frequency: 'yearly', next_due: now + 40 * DAY, auto_post: false });

  // Subscription history (so the radar finds them)
  for (let m = 3; m >= 1; m--) {
    await createTransaction({ account_id: visa, kind: 'expense', amount: 199, currency: 'EGP', category_id: 'cat_subscriptions', merchant: 'Netflix', occurred_at: at(m * 30 + 6, 8) });
    await createTransaction({ account_id: visa, kind: 'expense', amount: 79.99, currency: 'EGP', category_id: 'cat_subscriptions', merchant: 'Spotify', occurred_at: at(m * 30 - 2, 8) });
    await createTransaction({ account_id: bank, kind: 'expense', amount: 850, currency: 'EGP', category_id: 'cat_health', merchant: 'Gold’s Gym', occurred_at: at(m * 30 + 9, 7) });
    await createTransaction({ account_id: wallet, kind: 'expense', amount: 320, currency: 'EGP', category_id: 'cat_bills', merchant: 'Vodafone', occurred_at: at(m * 30 + 2, 19) });
    await createTransaction({ account_id: visa, kind: 'expense', amount: 149, currency: 'EGP', category_id: 'cat_subscriptions', merchant: 'iCloud+', occurred_at: at(m * 30 + 12, 9) });
  }

  // Everyday receipts, ~110 days
  const groceries = ['Carrefour', 'Spinneys', 'Kazyon', 'Gourmet'];
  const food = ['Talabat', 'Zooba', 'Cilantro', 'Koshary Abou Tarek', 'Buffalo Burger', 'Starbucks'];
  const transport = ['Uber', 'Careem', 'Metro'];
  const fuel = ['Chillout fuel', 'TotalEnergies', 'Misr Petroleum'];
  const shopping = ['Amazon.eg', 'Zara', 'Noon', 'H&M'];
  const health = ['Seif Pharmacy', 'El Ezaby'];
  for (let d = 110; d >= 0; d--) {
    if (Math.random() < 0.55) await createTransaction({ account_id: pick([cash, wallet, visa]), kind: 'expense', amount: jitter(140), currency: 'EGP', category_id: 'cat_food', merchant: pick(food), occurred_at: at(d, 13) });
    if (d % 4 === 0) await createTransaction({ account_id: pick([visa, bank]), kind: 'expense', amount: jitter(720), currency: 'EGP', category_id: 'cat_groceries', merchant: pick(groceries), occurred_at: at(d, 18) });
    if (Math.random() < 0.5) await createTransaction({ account_id: pick([cash, wallet]), kind: 'expense', amount: jitter(85), currency: 'EGP', category_id: 'cat_transport', merchant: pick(transport), occurred_at: at(d, 9) });
    if (d % 11 === 0) await createTransaction({ account_id: visa, kind: 'expense', amount: jitter(1_600, 0.5), currency: 'EGP', category_id: 'cat_shopping', merchant: pick(shopping), occurred_at: at(d, 20) });
    if (d % 17 === 0) await createTransaction({ account_id: cash, kind: 'expense', amount: jitter(260), currency: 'EGP', category_id: 'cat_health', merchant: pick(health), occurred_at: at(d, 21) });
    if (d % 9 === 0) await createTransaction({ account_id: visa, kind: 'expense', amount: jitter(900, 0.2), currency: 'EGP', category_id: 'cat_fuel', merchant: pick(fuel), occurred_at: at(d, 8) });
    if (d % 30 === 15) await createTransaction({ account_id: bank, kind: 'income', amount: jitter(4_500, 0.3), currency: 'EGP', category_id: 'cat_business', merchant: 'Freelance · Upwork', occurred_at: at(d, 16) });
  }
  // Card repayments so the Visa shows a realistic owed balance
  for (let m = 3; m >= 1; m--) await createTransfer({ from_account_id: bank, to_account_id: visa, from_amount: 5_500, to_amount: 5_500, rate: 1, occurred_at: at(m * 30 - 5, 11), note: 'Card repayment' });
  // Savings top-ups
  for (let m = 3; m >= 0; m--) await createTransfer({ from_account_id: bank, to_account_id: savings, from_amount: 5_060, to_amount: 100, rate: 1 / 50.6, occurred_at: at(m * 30 + 1, 12), note: 'Monthly saving' });

  // Assets & gold
  await createAsset({ name: 'Apple (AAPL) 4 sh', type: 'stock', quantity: 4, unit: 'sh', value: 900, currency: 'USD', valued_at: now });
  await createAsset({ name: 'Bank certificate 3y', type: 'bank_cert', quantity: 1, value: 50_000, currency: 'EGP', valued_at: now, interest_rate: 22, starts_at: now - 200 * DAY, matures_at: now + 895 * DAY });
  await createGoldLot({ name: 'Bracelet · Sagha', grams: 12.5, karat: 21, price_per_gram: 3_650, making_charge: 900, currency: 'EGP', bought_at: at(300) });
  await createGoldLot({ name: '10 g bar · 24k', grams: 10, karat: 24, price_per_gram: 4_150, making_charge: 150, currency: 'EGP', bought_at: at(95) });
  await createGoldLot({ name: 'Old earrings', grams: 4.2, karat: 18, price_per_gram: 2_900, making_charge: 0, currency: 'EGP', bought_at: at(700), sold_at: at(40), sold_price_per_gram: 3_400 });

  // Plans
  await createBudget({ category_id: 'cat_food', limit_amount: 4_000, currency: 'EGP' });
  await createBudget({ category_id: 'cat_groceries', limit_amount: 6_000, currency: 'EGP' });
  await createBudget({ category_id: null, limit_amount: 26_000, currency: 'EGP' });
  await createGoal({ name: 'Emergency fund', target_amount: 6_000, currency: 'USD', target_date: now + 300 * DAY, linked_account_id: savings, note: null });
  await createGoal({ name: 'MacBook', target_amount: 95_000, currency: 'EGP', target_date: now + 180 * DAY, linked_account_id: null, note: null });
  const boxId = await createBox({ name: 'Sahel trip', budget_amount: 12_000, currency: 'EGP', starts_at: now + 20 * DAY, ends_at: now + 27 * DAY, color: '#3FA7A0', note: null });
  const box = await (await getDb()).getFirstAsync<{ account_id: string }>('SELECT account_id FROM event_boxes WHERE id = ?', [boxId]);
  if (box) await createTransfer({ from_account_id: bank, to_account_id: box.account_id, from_amount: 7_000, to_amount: 7_000, rate: 1, occurred_at: at(3, 12), note: 'Trip funding' });

  // Daily budget, payday, rewards
  await saveDailyBudget({ amount: 450, rollover: true, startDay: dayKey(now) - 6 * DAY });
  await setSetting('payday_day', '28');
  await setSetting('debt_monthly_budget', '6000');
  await saveRewards({ points: 185, shields: 1, badges: 2, lastSpinDay: null, coupons: [] });
  await setSetting(DEMO_FLAG, '1');
}

/** Deletes every ledger row. Settings (lock, theme, language) are kept. */
export async function eraseLedger(): Promise<void> {
  const db = await getDb();
  await db.execAsync('PRAGMA foreign_keys = OFF;');
  try {
    await db.withTransactionAsync(async () => {
      for (const t of ['transactions', 'transfers', 'recurring_rules', 'gold_lots', 'event_boxes', 'assets', 'budgets', 'goals', 'sms_pending', 'sms_seen', 'accounts', 'fx_rates']) {
        await db.runAsync(`DELETE FROM ${t}`);
      }
      for (const k of ['daily_budget_v1', 'rewards_v1', 'payday_split_rules', 'payday_split_source', 'debt_monthly_budget', DEMO_FLAG]) {
        await db.runAsync('DELETE FROM settings WHERE key = ?', [k]);
      }
    });
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
}
