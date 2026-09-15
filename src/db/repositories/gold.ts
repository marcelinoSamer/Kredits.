import { getDb } from '../client';
import { newId } from '../id';
import type { GoldLot } from '../schema';
import type { CurrencyCode } from '@/money/currencies';

export interface GoldLotInput {
  name: string;
  grams: number;
  karat: number;
  price_per_gram: number;
  making_charge?: number;
  currency: CurrencyCode;
  bought_at: number;
  sold_at?: number | null;
  sold_price_per_gram?: number | null;
  note?: string | null;
}

export async function listGoldLots(): Promise<GoldLot[]> {
  const db = await getDb();
  return db.getAllAsync<GoldLot>('SELECT * FROM gold_lots ORDER BY sold_at IS NOT NULL, bought_at DESC');
}

export async function getGoldLot(id: string): Promise<GoldLot | null> {
  const db = await getDb();
  return db.getFirstAsync<GoldLot>('SELECT * FROM gold_lots WHERE id = ?', [id]);
}

export async function createGoldLot(input: GoldLotInput): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO gold_lots (id, name, grams, karat, price_per_gram, making_charge, currency, bought_at, sold_at, sold_price_per_gram, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.name, input.grams, input.karat, input.price_per_gram, input.making_charge ?? 0, input.currency, input.bought_at,
     input.sold_at ?? null, input.sold_price_per_gram ?? null, input.note ?? null, Date.now()],
  );
  return id;
}

export async function updateGoldLot(id: string, input: GoldLotInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE gold_lots SET name = ?, grams = ?, karat = ?, price_per_gram = ?, making_charge = ?, currency = ?, bought_at = ?, sold_at = ?, sold_price_per_gram = ?, note = ? WHERE id = ?`,
    [input.name, input.grams, input.karat, input.price_per_gram, input.making_charge ?? 0, input.currency, input.bought_at,
     input.sold_at ?? null, input.sold_price_per_gram ?? null, input.note ?? null, id],
  );
}

export async function deleteGoldLot(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM gold_lots WHERE id = ?', [id]);
}
