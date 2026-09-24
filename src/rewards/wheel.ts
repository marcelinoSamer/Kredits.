// Daily reward wheel. Pure: the screen supplies randomness and persistence.
// Prizes are deliberately non-monetary; coupons are SAMPLE placeholders until
// merchant partnerships exist (and must stay clearly labelled as samples).

export type PrizeKind = 'points' | 'shield' | 'coupon' | 'badge';

export interface Prize {
  id: string;
  kind: PrizeKind;
  /** Points awarded (points prizes) or 0. */
  points: number;
  /** Relative probability weight. */
  weight: number;
  /** Sample coupon details (coupon prizes only). */
  coupon?: { merchant: string; percent: number; code: string; validDays: number };
}

export const PRIZES: Prize[] = [
  { id: 'p10', kind: 'points', points: 10, weight: 30 },
  { id: 'p25', kind: 'points', points: 25, weight: 22 },
  { id: 'p50', kind: 'points', points: 50, weight: 12 },
  { id: 'p100', kind: 'points', points: 100, weight: 4 },
  { id: 'shield', kind: 'shield', points: 0, weight: 10 },
  { id: 'badge', kind: 'badge', points: 15, weight: 10 },
  { id: 'c-cafe', kind: 'coupon', points: 0, weight: 7, coupon: { merchant: 'Sample Cafe', percent: 10, code: 'KRD-CAFE10', validDays: 7 } },
  { id: 'c-market', kind: 'coupon', points: 0, weight: 5, coupon: { merchant: 'Sample Market', percent: 15, code: 'KRD-MKT15', validDays: 7 } },
];

export interface Coupon {
  id: string;
  merchant: string;
  percent: number;
  code: string;
  wonAt: number;
  expiresAt: number;
}

export interface RewardState {
  points: number;
  shields: number;
  badges: number;
  /** Local-midnight day key of the last spin, or null. */
  lastSpinDay: number | null;
  coupons: Coupon[];
}

export const EMPTY_REWARDS: RewardState = { points: 0, shields: 0, badges: 0, lastSpinDay: null, coupons: [] };

export type SpinGate = 'ready' | 'spunToday' | 'logFirst';

/** One spin per day, unlocked by logging at least one receipt today. */
export function spinGate(state: RewardState, today: number, loggedToday: boolean): SpinGate {
  if (state.lastSpinDay === today) return 'spunToday';
  if (!loggedToday) return 'logFirst';
  return 'ready';
}

/** Pick a prize index by weight. `rng` returns [0, 1). */
export function pickPrize(rng: () => number = Math.random, prizes: Prize[] = PRIZES): number {
  const total = prizes.reduce((s, p) => s + p.weight, 0);
  let r = rng() * total;
  for (let i = 0; i < prizes.length; i++) {
    r -= prizes[i].weight;
    if (r < 0) return i;
  }
  return prizes.length - 1;
}

/** Apply a prize to the reward state. Pure; returns a new state. */
export function applyPrize(state: RewardState, prize: Prize, today: number, now: number): RewardState {
  const next: RewardState = { ...state, coupons: [...state.coupons], lastSpinDay: today };
  next.points += prize.points;
  if (prize.kind === 'shield') next.shields += 1;
  if (prize.kind === 'badge') next.badges += 1;
  if (prize.kind === 'coupon' && prize.coupon) {
    next.coupons.push({
      id: `${prize.id}-${now}`,
      merchant: prize.coupon.merchant,
      percent: prize.coupon.percent,
      code: prize.coupon.code,
      wonAt: now,
      expiresAt: now + prize.coupon.validDays * 86_400_000,
    });
  }
  // Keep only live coupons.
  next.coupons = next.coupons.filter((c) => c.expiresAt > now);
  return next;
}

/** Rotation (degrees) that lands the pointer on `index` after `turns` full spins. */
export function rotationFor(index: number, count: number, turns = 5): number {
  const sector = 360 / count;
  // Pointer at top (0deg); sector i is centred at i*sector + sector/2 clockwise.
  return turns * 360 + (360 - (index * sector + sector / 2));
}
