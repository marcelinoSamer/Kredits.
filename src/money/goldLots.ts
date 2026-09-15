// Gold lots: cost basis and gain/loss against the user's current gram price.

export interface LotLike {
  grams: number;
  karat: number;
  price_per_gram: number;
  making_charge: number;
  sold_at: number | null;
  sold_price_per_gram: number | null;
}

export interface LotValuation {
  cost: number;
  /** Market value now (or realised proceeds if sold). */
  value: number | null;
  gain: number | null;
  gainPct: number | null;
}

/** `gramPrice24k` = current price of one gram of 24k in the lot's currency (null if unknown). */
export function valueLot(lot: LotLike, gramPrice24k: number | null): LotValuation {
  const cost = lot.grams * lot.price_per_gram + lot.making_charge;
  let value: number | null;
  if (lot.sold_at != null && lot.sold_price_per_gram != null) value = lot.grams * lot.sold_price_per_gram;
  else value = gramPrice24k == null ? null : lot.grams * gramPrice24k * (lot.karat / 24);
  const gain = value == null ? null : value - cost;
  return { cost, value, gain, gainPct: gain == null || cost === 0 ? null : (gain / cost) * 100 };
}

export function pureGrams(lot: LotLike): number {
  return lot.grams * (lot.karat / 24);
}
