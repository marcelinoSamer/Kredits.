import { getDb } from '../client';
import { newId } from '../id';
import type { Frequency, RecurringRule, TxKind } from '../schema';
import type { CurrencyCode } from '@/money/currencies';
import { dueUpTo } from '@/money/recurring';
import { createTransaction } from './transactions';

export interface RecurringView extends RecurringRule {
  account_name: string;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
}

export interface RecurringInput {
  account_id: string;
  kind: TxKind;
  amount: number;
  currency: CurrencyCode;
  category_id?: string | null;
  merchant?: string | null;
  note?: string | null;
  frequency: Frequency;
  interval?: number;
  next_due: number;
  end_at?: number | null;
  auto_post?: boolean;
  remind?: boolean;
}

const VIEW = `
  SELECT r.*, a.name AS account_name, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
  FROM recurring_rules r
  JOIN accounts a ON r.account_id = a.id
  LEFT JOIN categories c ON r.category_id = c.id
`;

export async function listRecurring(onlyEnabled = false): Promise<RecurringView[]> {
  const db = await getDb();
  return db.getAllAsync<RecurringView>(`${VIEW} ${onlyEnabled ? 'WHERE r.enabled = 1' : ''} ORDER BY r.next_due ASC`);
}

export async function getRecurring(id: string): Promise<RecurringRule | null> {
  const db = await getDb();
  return db.getFirstAsync<RecurringRule>('SELECT * FROM recurring_rules WHERE id = ?', [id]);
}

export async function createRecurring(input: RecurringInput): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO recurring_rules (id, account_id, kind, amount, currency, category_id, merchant, note, frequency, interval, next_due, end_at, auto_post, remind, enabled, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      id, input.account_id, input.kind, input.amount, input.currency, input.category_id ?? null,
      input.merchant ?? null, input.note ?? null, input.frequency, input.interval ?? 1, input.next_due,
      input.end_at ?? null, input.auto_post === false ? 0 : 1, input.remind === false ? 0 : 1, Date.now(),
    ],
  );
  return id;
}

export async function updateRecurring(id: string, input: RecurringInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE recurring_rules SET account_id = ?, kind = ?, amount = ?, currency = ?, category_id = ?, merchant = ?, note = ?,
       frequency = ?, interval = ?, next_due = ?, end_at = ?, auto_post = ?, remind = ? WHERE id = ?`,
    [
      input.account_id, input.kind, input.amount, input.currency, input.category_id ?? null, input.merchant ?? null,
      input.note ?? null, input.frequency, input.interval ?? 1, input.next_due, input.end_at ?? null,
      input.auto_post === false ? 0 : 1, input.remind === false ? 0 : 1, id,
    ],
  );
}

export async function setRecurringEnabled(id: string, enabled: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE recurring_rules SET enabled = ? WHERE id = ?', [enabled ? 1 : 0, id]);
}

export async function deleteRecurring(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM recurring_rules WHERE id = ?', [id]);
}

/** Posts one occurrence of a rule as a real transaction and advances next_due past `at`. */
export async function postOccurrence(rule: RecurringRule, at: number): Promise<string> {
  const id = await createTransaction({
    account_id: rule.account_id,
    kind: rule.kind,
    amount: rule.amount,
    currency: rule.currency,
    category_id: rule.category_id,
    merchant: rule.merchant,
    note: rule.note,
    occurred_at: at,
    source: 'manual',
    sms_ref: `rec:${rule.id}:${at}`,
  });
  const { nextDue } = dueUpTo({ ...rule, next_due: at }, at);
  const db = await getDb();
  await db.runAsync('UPDATE recurring_rules SET next_due = ? WHERE id = ?', [nextDue, rule.id]);
  return id;
}

/** Skips an occurrence: advances next_due without posting. */
export async function skipOccurrence(rule: RecurringRule, at: number): Promise<void> {
  const { nextDue } = dueUpTo({ ...rule, next_due: at }, at);
  const db = await getDb();
  await db.runAsync('UPDATE recurring_rules SET next_due = ? WHERE id = ?', [nextDue, rule.id]);
}

/** Posts every due occurrence of auto-post rules. Returns how many were posted. */
export async function postDueRules(now = Date.now()): Promise<number> {
  const rules = await listRecurring(true);
  let posted = 0;
  for (const r of rules) {
    if (!r.auto_post) continue;
    const { due } = dueUpTo(r, now);
    for (const at of due) {
      await postOccurrence(r, at);
      posted++;
    }
  }
  return posted;
}
