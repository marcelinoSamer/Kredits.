// Wallet card name -> Pocket id, remembered in the settings table.

import { getSetting, setSetting } from '@/db/repositories/settings';

const KEY = 'applepay_card_map';
export type CardMap = Record<string, string>;
const norm = (c: string) => c.trim().toLowerCase();

export async function loadCardMap(): Promise<CardMap> {
  const raw = await getSetting(KEY);
  if (!raw) return {};
  try {
    const p = JSON.parse(raw) as unknown;
    return p && typeof p === 'object' ? (p as CardMap) : {};
  } catch {
    return {};
  }
}
export async function rememberCardAccount(card: string, accountId: string): Promise<void> {
  const m = await loadCardMap();
  m[norm(card)] = accountId;
  await setSetting(KEY, JSON.stringify(m));
}
export async function resolveCardAccount(card: string | null, map?: CardMap): Promise<string | null> {
  if (!card) return null;
  const m = map ?? (await loadCardMap());
  return m[norm(card)] ?? null;
}
/** Cards the intent has seen but that are not mapped yet (for the setup screen). */
const SEEN_KEY = 'applepay_cards_seen';
export async function loadSeenCards(): Promise<string[]> {
  const raw = await getSetting(SEEN_KEY);
  try {
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
export async function markCardSeen(card: string): Promise<void> {
  const seen = await loadSeenCards();
  if (!seen.some((c) => norm(c) === norm(card))) await setSetting(SEEN_KEY, JSON.stringify([...seen, card.trim()]));
}
