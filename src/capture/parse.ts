// Parses the amount text Shortcuts hands the App Intent ("EGP 120.50",
// "£12.99", "12,50 €", Arabic-Indic digits). Pure, tested.

import { CURRENCIES, type CurrencyCode } from '@/money/currencies';

export interface CapturedAmount {
  amount: number | null;
  currency: CurrencyCode | null;
}

function asciiDigits(s: string): string {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c >= 0x0660 && c <= 0x0669) out += String(c - 0x0660);
    else if (c >= 0x06f0 && c <= 0x06f9) out += String(c - 0x06f0);
    else out += ch;
  }
  return out;
}

export function parseCapturedAmount(raw: string | undefined | null): CapturedAmount {
  if (!raw) return { amount: null, currency: null };
  let s = asciiDigits(String(raw)).replace(/٫/g, '.').replace(/٬/g, '');
  const code = s.toUpperCase().match(/\b([A-Z]{3})\b/)?.[1] ?? null;
  const currency = code && code in CURRENCIES ? (code as CurrencyCode) : null;
  s = s.replace(/[^0-9.,]/g, '');
  s = s.replace(/(^|[^0-9])[.,]+/g, '$1').replace(/[.,]+(?![0-9])/g, '');
  if (!/[0-9]/.test(s)) return { amount: null, currency };
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  let n: string;
  if (lastDot >= 0 && lastComma >= 0) n = lastDot > lastComma ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.');
  else if (lastComma >= 0) {
    const parts = s.split(',');
    n = parts.length === 2 && parts[1].length > 0 && parts[1].length <= 2 ? `${parts[0]}.${parts[1]}` : parts.join('');
  } else {
    const parts = s.split('.');
    n = parts.length > 2 ? parts.join('') : s;
  }
  const v = parseFloat(n);
  return { amount: Number.isFinite(v) ? Math.abs(v) : null, currency };
}

export function cleanText(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const s = String(raw).replace(/\s+/g, ' ').trim();
  return s.length ? s : null;
}
