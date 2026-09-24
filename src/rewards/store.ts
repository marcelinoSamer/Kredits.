// Persistence for rewards (settings table, JSON) — offline, on-device.

import { getSetting, setSetting } from '@/db/repositories/settings';
import { EMPTY_REWARDS, type RewardState } from './wheel';

const KEY = 'rewards_v1';

export async function loadRewards(): Promise<RewardState> {
  const raw = await getSetting(KEY);
  if (!raw) return EMPTY_REWARDS;
  try {
    return { ...EMPTY_REWARDS, ...(JSON.parse(raw) as Partial<RewardState>) };
  } catch {
    return EMPTY_REWARDS;
  }
}

export async function saveRewards(state: RewardState): Promise<void> {
  await setSetting(KEY, JSON.stringify(state));
}
