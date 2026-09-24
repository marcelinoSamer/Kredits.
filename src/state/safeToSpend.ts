import { listRecurring, type RecurringView } from '@/db/repositories/recurring';
import { listGoals } from '@/db/repositories/goals';
import { getSetting } from '@/db/repositories/settings';
import { convert } from '@/money/fx';
import { nextPayday, occurrences } from '@/money/recurring';
import { safeToSpend, type SafeToSpend } from '@/money/safeToSpend';
import { goalProgress } from '@/money/planning';
import { listAccountsWithBalances } from '@/db/repositories/accounts';
import { listRates } from '@/db/repositories/fxRates';
import { buildRateLookup } from '@/money/fx';
import { useAsyncData, type AsyncData } from './dataVersion';
import { useSettings } from './settings';

const DAY = 86_400_000;

export interface SafeToSpendData {
  result: SafeToSpend;
  display: string;
  paydayAt: number;
  bills: { rule: RecurringView; at: number }[];
}

/** Computes "safe to spend until payday" from the ledger alone. */
export function useSafeToSpend(): AsyncData<SafeToSpendData> {
  const display = useSettings((s) => s.displayCurrency);
  return useAsyncData<SafeToSpendData>(async () => {
    const now = Date.now();
    const [accounts, rates, rules, goals, paydayRaw] = await Promise.all([
      listAccountsWithBalances(),
      listRates(),
      listRecurring(true),
      listGoals(),
      getSetting('payday_day'),
    ]);
    const lookup = buildRateLookup(rates);
    const paydayAt = nextPayday(parseInt(paydayRaw ?? '1', 10) || 1, now);
    const conv = (v: number, c: string) => convert(v, c, display, lookup, display).value ?? 0;

    const liquidCash = accounts
      .filter((a) => a.type !== 'credit' && a.type !== 'box' && a.balance > 0)
      .reduce((s, a) => s + conv(a.balance, a.currency), 0);

    const bills = rules
      .filter((r) => r.kind === 'expense')
      .flatMap((r) => occurrences(r, now, paydayAt))
      .sort((a, b) => a.at - b.at);
    const billsBeforePayday = bills.reduce((s, b) => s + conv(b.rule.amount, b.rule.currency), 0);

    let goalContributions = 0;
    for (const g of goals) {
      const linked = g.linked_account_id ? accounts.find((a) => a.id === g.linked_account_id) : null;
      const saved = linked ? linked.balance : 0;
      const p = goalProgress(saved, g.target_amount, { targetDate: g.target_date ?? undefined, now });
      if (p.monthlyNeeded != null && !p.reached) goalContributions += conv(p.monthlyNeeded, g.currency);
    }

    const daysToPayday = Math.max(1, Math.ceil((paydayAt - now) / DAY));
    return { result: safeToSpend({ liquidCash, billsBeforePayday, goalContributions, daysToPayday }), display, paydayAt, bills };
  }, [display]);
}
