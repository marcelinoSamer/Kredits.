// Merchant memory: once a merchant has been filed under the same category at
// least `minUses` times, suggest that category for the next receipt.

export interface MerchantCategoryUse {
  category_id: string | null;
  uses: number;
}

export function suggestCategory(rows: MerchantCategoryUse[], minUses = 2): string | null {
  let best: MerchantCategoryUse | null = null;
  for (const r of rows) {
    if (!r.category_id) continue;
    if (!best || r.uses > best.uses) best = r;
  }
  return best && best.uses >= minUses ? best.category_id : null;
}
