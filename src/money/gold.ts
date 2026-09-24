// Net worth expressed as grams of gold — the way cash-heavy MENA households
// already think about wealth. Uses the user's own XAU (troy ounce) rate from
// the offline FX table; nothing is fetched.

import type { CurrencyCode } from './currencies';
import { convert, type RateLookup } from './fx';

/** Grams in one troy ounce. */
export const TROY_OUNCE_GRAMS = 31.1034768;

export type Karat = 24 | 21 | 18;

export interface GoldEquivalent {
  grams: number;
  karat: Karat;
  /** Price of one gram at that karat, in the display currency. */
  gramPrice: number;
}

/**
 * Price of one gram of `karat` gold in `display`, derived from the XAU rate.
 * Returns null when no XAU rate path exists.
 */
export function gramPrice(display: CurrencyCode, lookup: RateLookup, karat: Karat = 21): number | null {
  const oz = convert(1, 'XAU', display, lookup, display);
  if (oz.value == null || oz.value <= 0) return null;
  return (oz.value / TROY_OUNCE_GRAMS) * (karat / 24);
}

/** How many grams of `karat` gold `amount` (in `display`) buys. */
export function goldEquivalent(
  amount: number,
  display: CurrencyCode,
  lookup: RateLookup,
  karat: Karat = 21,
): GoldEquivalent | null {
  const price = gramPrice(display, lookup, karat);
  if (price == null) return null;
  return { grams: amount / price, karat, gramPrice: price };
}
