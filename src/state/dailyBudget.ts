// Daily budget config lives in the settings table as JSON (offline, on-device).

import { getSetting, setSetting } from '@/db/repositories/settings';
import type { DailyBudgetConfig } from '@/money/dailyBudget';

const KEY = 'daily_budget_v1';

export async function loadDailyBudget(): Promise<DailyBudgetConfig | null> {
  const raw = await getSetting(KEY);
  if (!raw) return null;
  try {
    const cfg = JSON.parse(raw) as DailyBudgetConfig;
    return cfg && cfg.amount > 0 ? cfg : null;
  } catch {
    return null;
  }
}

export async function saveDailyBudget(cfg: DailyBudgetConfig | null): Promise<void> {
  await setSetting(KEY, cfg ? JSON.stringify(cfg) : '');
}
