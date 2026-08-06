// Pure bank-certificate math. A certificate is blocked capital (the principal)
// that may accrue simple interest at an annual rate between a start date and a
// maturity date. We report interest accrued so far and the projected payout at
// maturity. Net worth still counts only the principal — accrued interest is
// shown as a projection, never booked. Kept UI-free and tested.

const DAY = 86_400_000;
const YEAR = 365 * DAY;

export interface CertStatus {
  principal: number;
  /** Annual interest rate as a percentage (0 for a no-interest deposit). */
  ratePct: number;
  startsAt: number | null;
  maturesAt: number | null;
  /** Whole term length in days, or null when dates are missing. */
  termDays: number | null;
  /** Whole days from now until maturity (0 once matured), or null. */
  daysToMaturity: number | null;
  matured: boolean;
  /** Simple interest earned from start to now (capped at the full term). */
  accruedInterest: number;
  /** Simple interest over the full term. */
  projectedInterest: number;
  /** principal + projectedInterest — the value at maturity. */
  maturityValue: number;
}

/** Derive a certificate's accrued and projected interest. */
export function computeCert(args: {
  principal: number;
  ratePct: number | null;
  startsAt: number | null;
  maturesAt: number | null;
  now: number;
}): CertStatus {
  const { principal, startsAt, maturesAt, now } = args;
  const ratePct = args.ratePct ?? 0;
  const yearlyInterest = principal * (ratePct / 100);

  const hasTerm = startsAt != null && maturesAt != null && maturesAt > startsAt;
  const termDays = hasTerm ? Math.round((maturesAt! - startsAt!) / DAY) : null;
  const matured = maturesAt != null ? now >= maturesAt : false;
  const daysToMaturity =
    maturesAt != null ? Math.max(0, Math.ceil((maturesAt - now) / DAY)) : null;

  const projectedInterest = hasTerm ? (yearlyInterest * (maturesAt! - startsAt!)) / YEAR : 0;

  let accruedInterest = 0;
  if (hasTerm) {
    const elapsed = Math.min(Math.max(0, now - startsAt!), maturesAt! - startsAt!);
    accruedInterest = (yearlyInterest * elapsed) / YEAR;
  }

  return {
    principal,
    ratePct,
    startsAt,
    maturesAt,
    termDays,
    daysToMaturity,
    matured,
    accruedInterest,
    projectedInterest,
    maturityValue: principal + projectedInterest,
  };
}
