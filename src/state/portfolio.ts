import { listAccountsWithBalances, type AccountWithBalance } from '@/db/repositories/accounts';
import { listAssets } from '@/db/repositories/assets';
import { listGoldLots } from '@/db/repositories/gold';
import { gramPrice } from '@/money/gold';
import { valueLot } from '@/money/goldLots';
import { listRates } from '@/db/repositories/fxRates';
import { buildRateLookup, type FxRate, type RateLookup } from '@/money/fx';
import { computeNetWorth, type NetWorth } from '@/money/portfolio';
import type { Asset } from '@/db/schema';
import { useAsyncData, type AsyncData } from './dataVersion';
import { useSettings } from './settings';

export interface PortfolioData {
  accounts: AccountWithBalance[];
  assets: Asset[];
  rates: FxRate[];
  lookup: RateLookup;
  netWorth: NetWorth;
  display: string;
}

/** Loads accounts (with balances), assets and FX rates, and derives net worth. */
export function usePortfolio(): AsyncData<PortfolioData> {
  const display = useSettings((s) => s.displayCurrency);
  return useAsyncData<PortfolioData>(async () => {
    const [accounts, assets, rates, lots] = await Promise.all([
      listAccountsWithBalances(),
      listAssets(),
      listRates(),
      listGoldLots(),
    ]);
    const lookup = buildRateLookup(rates);
    // Unsold gold lots count as assets at today's gram price (their own currency).
    const goldItems = lots
      .filter((l) => l.sold_at == null)
      .map((l) => ({ amount: valueLot(l, gramPrice(l.currency, lookup, 24)).value ?? 0, currency: l.currency }));
    const netWorth = computeNetWorth(
      accounts.map((a) => ({ amount: a.balance, currency: a.currency })),
      [...assets.map((a) => ({ amount: a.value, currency: a.currency })), ...goldItems],
      display,
      lookup,
    );
    return { accounts, assets, rates, lookup, netWorth, display };
  }, [display]);
}
