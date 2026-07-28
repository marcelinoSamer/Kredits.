import { getDb } from '../client';
import { getAccount } from './accounts';
import { listTransactions, type TransactionView } from './transactions';
import { listTransfersForAccount, type TransferView } from './transfers';
import { computeCreditStatus, type CreditStatus } from '@/money/credit';
import type { Account } from '../schema';

/** Fallback grace window when a credit pocket has none set. */
export const DEFAULT_GRACE_DAYS = 55;

export interface CreditData {
  account: Account;
  status: CreditStatus;
  /** All transactions booked on the pocket (charges = expenses), newest first. */
  txns: TransactionView[];
  /** All transfers touching the pocket (repayments = transfers in), newest first. */
  transfers: TransferView[];
}

/**
 * Load a credit pocket and derive its repayment state. Charges are expenses (and
 * any money transferred out); repayments are transfers in (and any income /
 * refund booked on it) — mirroring the sign of the account balance.
 */
export async function getCreditData(accountId: string, now = Date.now()): Promise<CreditData | null> {
  const account = await getAccount(accountId);
  if (!account || account.type !== 'credit') return null;

  const [txns, transfers] = await Promise.all([
    listTransactions({ accountId, limit: 500 }),
    listTransfersForAccount(accountId),
  ]);

  const charges = [
    ...txns.filter((t) => t.kind === 'expense').map((t) => ({ occurredAt: t.occurred_at, amount: t.amount })),
    ...transfers
      .filter((t) => t.from_account_id === accountId)
      .map((t) => ({ occurredAt: t.occurred_at, amount: t.from_amount + t.fee })),
  ];
  const repayments = [
    ...txns.filter((t) => t.kind === 'income').map((t) => ({ occurredAt: t.occurred_at, amount: t.amount })),
    ...transfers
      .filter((t) => t.to_account_id === accountId)
      .map((t) => ({ occurredAt: t.occurred_at, amount: t.to_amount })),
  ];

  const status = computeCreditStatus({
    limit: account.credit_limit ?? 0,
    graceDays: account.grace_days ?? DEFAULT_GRACE_DAYS,
    charges,
    repayments,
    now,
  });

  return { account, status, txns, transfers };
}

/** Status for every active credit pocket — used by the Wealth list. */
export async function listCreditSummaries(now = Date.now()): Promise<CreditData[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Account>(
    "SELECT * FROM accounts WHERE type = 'credit' AND archived = 0 ORDER BY sort_order ASC, created_at ASC",
  );
  const out: CreditData[] = [];
  for (const a of rows) {
    const d = await getCreditData(a.id, now);
    if (d) out.push(d);
  }
  return out;
}
