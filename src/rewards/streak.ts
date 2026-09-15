// Receipt streak: consecutive calendar days on which at least one receipt was
// logged. A "shield" (won on the wheel) forgives one missed day.

const DAY = 86_400_000;

export interface StreakResult {
  /** Consecutive days including today (or ending yesterday if nothing yet today). */
  days: number;
  /** True when something was logged today. */
  loggedToday: boolean;
  /** Shields consumed to bridge gaps. */
  shieldsUsed: number;
}

/**
 * @param dayKeys  Local-midnight timestamps of days with activity (any order, may repeat).
 * @param today    Local-midnight timestamp of today.
 * @param shields  Number of missed days that may be forgiven.
 */
export function computeStreak(dayKeys: number[], today: number, shields = 0): StreakResult {
  const set = new Set(dayKeys);
  const loggedToday = set.has(today);
  let cursor = loggedToday ? today : today - DAY;
  if (!set.has(cursor)) return { days: 0, loggedToday, shieldsUsed: 0 };

  let days = 0;
  let shieldsUsed = 0;
  while (true) {
    if (set.has(cursor)) {
      days++;
    } else if (shieldsUsed < shields) {
      shieldsUsed++;
    } else {
      break;
    }
    cursor -= DAY;
  }
  return { days, loggedToday, shieldsUsed };
}
