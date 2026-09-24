// Decides what to do with one bank text message handed over by the
// "Record bank message in Kredits" action. Pure and tested.
//
//  - OTP / verification-code texts are ignored and never stored (the native
//    action applies the same filter before anything touches disk).
//  - A message with an amount and a clear direction is recorded directly.
//  - A message with an amount but unclear meaning goes to the review queue.
//  - Everything else (promos, notices) is ignored.

import { parseSms } from '@/sms/parser';
import type { ParsedSms } from '@/sms/types';
import type { SmsTemplate } from '@/db/schema';

const OTP_MARKERS = [
  'otp', 'one time password', 'one-time password', 'one time pin', 'verification code', 'verify code',
  'security code', 'activation code', 'passcode', 'do not share', "don't share", 'never share',
  'رمز التحقق', 'رمز التفعيل', 'كلمة المرور لمرة واحدة', 'كلمة مرور لمرة واحدة', 'الرقم السري لمرة واحدة', 'لا تشارك', 'لا تفصح', 'كود التحقق',
];

const PURCHASE_WORDS = [
  'purchase', 'purchased', 'paid', 'spent', 'debited', 'charged', 'transaction', 'trx', 'pos', 'payment of', 'withdraw',
  'شراء', 'خصم', 'مدين', 'عملية', 'سحب', 'دفع',
];

export function isOtpMessage(body: string): boolean {
  const s = body.toLowerCase();
  return OTP_MARKERS.some((m) => s.includes(m));
}

function mentionsPurchase(body: string): boolean {
  const s = body.toLowerCase();
  return PURCHASE_WORDS.some((w) => s.includes(w));
}

export type BankMessageAction = 'record' | 'review' | 'ignore';

export interface BankMessageDecision {
  action: BankMessageAction;
  kind: 'expense' | 'income';
  parsed: ParsedSms | null;
  reason: string;
}

export function interpretBankMessage(body: string, sender: string, templates: SmsTemplate[] = []): BankMessageDecision {
  if (!body || !body.trim()) return { action: 'ignore', kind: 'expense', parsed: null, reason: 'empty' };
  if (isOtpMessage(body)) return { action: 'ignore', kind: 'expense', parsed: null, reason: 'otp' };
  const parsed = parseSms(body, sender, templates);
  if (parsed.amount == null || parsed.amount <= 0) return { action: 'ignore', kind: 'expense', parsed, reason: 'no-amount' };
  if (parsed.direction === 'in') return { action: 'record', kind: 'income', parsed, reason: 'credit' };
  if (parsed.direction === 'out') return { action: 'record', kind: 'expense', parsed, reason: 'debit' };
  if (mentionsPurchase(body)) return { action: 'record', kind: 'expense', parsed, reason: 'purchase-word' };
  return { action: 'review', kind: 'expense', parsed, reason: 'unclear' };
}
