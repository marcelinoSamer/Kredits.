// Drains receipts queued by the native "Record in Kredits" App Intent.
// The intent appends JSON entries to Documents/kredits-capture-queue.json;
// we read it with expo-file-system, file each entry as an expense, and clear
// the file. Diagnostics (pending count, last received, last error) are kept
// for the setup screen so problems are visible, not silent.

import { AppState, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

import { parseCapturedAmount, cleanText } from './parse';
import { loadCardMap, markCardSeen, resolveCardAccount } from './cards';
import { markVerified } from './status';
import { listAccounts } from '@/db/repositories/accounts';
import { createTransaction, merchantCategoryHistory } from '@/db/repositories/transactions';
import { getSetting, setSetting } from '@/db/repositories/settings';
import { getDb } from '@/db/client';
import { suggestCategory } from '@/rewards/merchantMemory';
import { classifyMerchant } from '@/money/classify';
import { bumpData } from '@/state/dataVersion';
import { interpretBankMessage } from './bankMessage';
import { dedupHash } from '@/sms/dedup';
import { insertPending, isSeen, listEnabledTemplates, markSeen } from '@/db/repositories/sms';

const FILE = 'kredits-capture-queue.json';
const K_LAST_DRAIN = 'capture_last_drain';
const K_LAST_ERROR = 'capture_last_error';
const K_TOTAL = 'capture_total_recorded';

interface Entry {
  /** 'sms' = bank text message; absent = Apple Pay tap. */
  kind?: 'sms';
  amount?: string;
  merchant?: string;
  card?: string;
  body?: string;
  sender?: string;
  at: number;
}

export function captureSupported(): boolean {
  return Platform.OS === 'ios';
}

function queuePath(): string | null {
  const dir = FileSystem.documentDirectory;
  return dir ? `${dir}${FILE}` : null;
}

export interface QueueDiagnostics {
  pending: number;
  lastReceivedAt: number | null;
  lastDrainAt: number | null;
  lastError: string | null;
  totalRecorded: number;
}

export async function readQueueDiagnostics(): Promise<QueueDiagnostics> {
  const path = queuePath();
  let pending = 0;
  let lastReceivedAt: number | null = null;
  if (path) {
    const info = await FileSystem.getInfoAsync(path).catch(() => null);
    if (info?.exists) {
      lastReceivedAt = info.modificationTime ? Math.round(info.modificationTime * 1000) : null;
      pending = (await readQueue()).length;
    }
  }
  const [d, e, tot] = await Promise.all([getSetting(K_LAST_DRAIN), getSetting(K_LAST_ERROR), getSetting(K_TOTAL)]);
  return { pending, lastReceivedAt, lastDrainAt: d ? Number(d) : null, lastError: e || null, totalRecorded: Number(tot ?? '0') };
}

async function readQueue(): Promise<Entry[]> {
  const path = queuePath();
  if (!path) return [];
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(path);
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Entry[]) : [];
  } catch {
    return [];
  }
}

let draining = false;

/** Writes queued taps into the ledger. Returns how many were recorded. */
export async function drainCaptureQueue(): Promise<number> {
  if (!captureSupported() || draining) return 0;
  const path = queuePath();
  if (!path) return 0;
  const entries = await readQueue();
  await setSetting(K_LAST_DRAIN, String(Date.now()));
  if (entries.length === 0) return 0;
  draining = true;
  try {
    // Clear first so a crash mid-way cannot double-post; the copy is in memory.
    await FileSystem.writeAsStringAsync(path, '[]');
    const [accounts, map] = await Promise.all([listAccounts(false), loadCardMap()]);
    if (accounts.length === 0) {
      await setSetting(K_LAST_ERROR, 'no-pocket');
      // Put entries back so they are filed once a Pocket exists.
      await FileSystem.writeAsStringAsync(path, JSON.stringify(entries));
      return 0;
    }
    const db = await getDb();
    const templates = await listEnabledTemplates();
    let recorded = 0;
    for (const e of entries) {
      if (e.kind === 'sms') {
        if (await recordBankMessage(e, accounts, map, templates)) recorded++;
        continue;
      }
      const { amount, currency } = parseCapturedAmount(e.amount);
      if (amount == null || amount <= 0) {
        await setSetting(K_LAST_ERROR, `unparsed-amount:${String(e.amount).slice(0, 40)}`);
        continue;
      }
      const merchant = cleanText(e.merchant);
      const card = cleanText(e.card);
      const ref = `intent:${e.at}:${amount}:${merchant ?? ''}`;
      const dup = await db.getFirstAsync<{ id: string }>('SELECT id FROM transactions WHERE sms_ref = ?', [ref]);
      if (dup) continue;
      if (card) await markCardSeen(card);
      const mappedId = await resolveCardAccount(card, map);
      const account =
        accounts.find((a) => a.id === mappedId) ??
        (currency ? accounts.find((a) => a.currency === currency && a.type !== 'box') : undefined) ??
        accounts.find((a) => a.type !== 'box') ??
        accounts[0];
      const category_id = merchant ? (suggestCategory(await merchantCategoryHistory(merchant)) ?? classifyMerchant(merchant)) : null;
      await createTransaction({
        account_id: account.id,
        kind: 'expense',
        amount,
        currency: account.currency,
        category_id,
        merchant,
        note: card ? `Apple Pay · ${card}` : 'Apple Pay',
        occurred_at: e.at || Date.now(),
        source: 'auto',
        sms_ref: ref,
      });
      recorded++;
    }
    if (recorded > 0) {
      const total = Number((await getSetting(K_TOTAL)) ?? '0') + recorded;
      await setSetting(K_TOTAL, String(total));
      await setSetting(K_LAST_ERROR, '');
      await markVerified();
      bumpData();
    }
    return recorded;
  } catch (err) {
    await setSetting(K_LAST_ERROR, err instanceof Error ? err.message : String(err)).catch(() => {});
    return 0;
  } finally {
    draining = false;
  }
}

type Accounts = Awaited<ReturnType<typeof listAccounts>>;

/** Files one bank text: records it, sends it to review, or ignores it. Returns true when recorded. */
async function recordBankMessage(
  e: Entry,
  accounts: Accounts,
  map: Awaited<ReturnType<typeof loadCardMap>>,
  templates: Awaited<ReturnType<typeof listEnabledTemplates>>,
): Promise<boolean> {
  const body = (e.body ?? '').trim();
  const sender = cleanText(e.sender) ?? 'Bank';
  if (!body) return false;
  const hash = dedupHash(sender, body);
  if (await isSeen(hash)) return false;
  const decision = interpretBankMessage(body, sender, templates);
  if (decision.action === 'ignore') {
    // OTPs and promos are dropped without storing their text.
    return false;
  }
  await markSeen(hash);
  const parsed = decision.parsed!;
  if (decision.action === 'review') {
    await insertPending({
      raw_body: body,
      sender,
      received_at: e.at || Date.now(),
      parsed_guess: JSON.stringify(parsed),
      confidence: parsed.confidence,
      dedup_hash: hash,
    });
    return false;
  }
  await markCardSeen(sender);
  const mappedId = await resolveCardAccount(sender, map);
  const account =
    accounts.find((a) => a.id === mappedId) ??
    (parsed.currency ? accounts.find((a) => a.currency === parsed.currency && a.type !== 'box') : undefined) ??
    accounts.find((a) => a.type === 'bank' || a.type === 'credit') ??
    accounts.find((a) => a.type !== 'box') ??
    accounts[0];
  const merchant = parsed.merchant;
  const category_id =
    decision.kind === 'expense' && merchant
      ? (suggestCategory(await merchantCategoryHistory(merchant)) ?? classifyMerchant(merchant))
      : decision.kind === 'income'
        ? 'cat_income_other'
        : null;
  await createTransaction({
    account_id: account.id,
    kind: decision.kind,
    amount: parsed.amount!,
    currency: account.currency,
    category_id,
    merchant,
    note: `Bank SMS · ${sender}`,
    occurred_at: e.at || Date.now(),
    source: 'sms',
    sms_ref: hash,
  });
  return true;
}

/** Drain now and whenever the app returns to the foreground. */
export function startCaptureQueueWatcher(): () => void {
  if (!captureSupported()) return () => {};
  drainCaptureQueue().catch(() => {});
  const sub = AppState.addEventListener('change', (s) => {
    if (s === 'active') drainCaptureQueue().catch(() => {});
  });
  return () => sub.remove();
}
