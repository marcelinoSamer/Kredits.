// Safe to spend: what is truly free until payday, from the ledger alone.
//   liquid cash (non-credit, non-box Pockets)
//   - bills due before payday (recurring expenses)
//   - this month's goal contributions
//   = safe to spend

export interface SafeToSpendInput {
  liquidCash: number;
  billsBeforePayday: number;
  goalContributions: number;
  /** Days from now to payday, inclusive of today. */
  daysToPayday: number;
}

export interface SafeToSpend {
  total: number;
  perDay: number;
  parts: SafeToSpendInput;
}

export function safeToSpend(input: SafeToSpendInput): SafeToSpend {
  const total = input.liquidCash - input.billsBeforePayday - input.goalContributions;
  const days = Math.max(1, input.daysToPayday);
  return { total, perDay: total / days, parts: input };
}
