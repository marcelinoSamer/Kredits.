// Daily local nudges (offline). Because a scheduled local notification carries
// fixed text, the numbers are computed now and the three nudges are
// re-scheduled every time the app comes to the foreground, so the morning
// message always reflects the latest ledger.

import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

import { ensureNotificationPermission } from './index';
import { listActivityDays, sumByKindCurrency } from '@/db/repositories/transactions';
import { listRates } from '@/db/repositories/fxRates';
import { buildRateLookup, sumInCurrency } from '@/money/fx';
import { formatMoney } from '@/money/format';
import { dayKey } from '@/ui/date';
import { computeStreak } from '@/rewards/streak';
import { loadRewards } from '@/rewards/store';
import { useSettings } from '@/state/settings';
import { t } from '@/i18n';

const DAY = 86_400_000;
const IDS = { morning: 'nudge-morning', afternoon: 'nudge-afternoon', evening: 'nudge-evening' };
export const NUDGE_TIMES = { morning: 9, afternoon: 15, evening: 20 };

function nextAt(hour: number, now: number): number {
  const d = new Date(now);
  d.setHours(hour, 0, 0, 0);
  if (d.getTime() <= now) d.setDate(d.getDate() + 1);
  return d.getTime();
}

async function schedule(identifier: string, title: string, body: string, at: number): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body },
    trigger: { type: SchedulableTriggerInputTypes.DATE, date: at },
  });
}

export async function cancelDailyNudges(): Promise<void> {
  await Promise.all(Object.values(IDS).map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
}

/** (Re)schedules the next morning / afternoon / evening nudge with fresh numbers. */
export async function scheduleDailyNudges(): Promise<boolean> {
  const granted = await ensureNotificationPermission();
  if (!granted) return false;
  await cancelDailyNudges();

  const now = Date.now();
  const display = useSettings.getState().displayCurrency;
  const morningAt = nextAt(NUDGE_TIMES.morning, now);
  // The day the morning nudge will call "yesterday".
  const refDay = dayKey(morningAt) - DAY;

  const [sums, rates, days, rewards] = await Promise.all([
    sumByKindCurrency(refDay, refDay + DAY - 1),
    listRates(),
    listActivityDays(now - 400 * DAY),
    loadRewards(),
  ]);
  const lookup = buildRateLookup(rates);
  const spent = sumInCurrency(
    sums.filter((s) => s.kind === 'expense').map((s) => ({ amount: s.total, currency: s.currency })),
    display,
    lookup,
  ).total;
  const streak = computeStreak(days, dayKey(now), rewards.shields);

  await schedule(
    IDS.morning,
    t('nudges.morningTitle'),
    t('nudges.morningBody', { amount: formatMoney(spent, display), days: streak.days }),
    morningAt,
  );
  await schedule(IDS.afternoon, t('nudges.afternoonTitle'), t('nudges.afternoonBody'), nextAt(NUDGE_TIMES.afternoon, now));
  const eveningAt = nextAt(NUDGE_TIMES.evening, now);
  const spunThatDay = rewards.lastSpinDay === dayKey(eveningAt);
  await schedule(
    IDS.evening,
    t('nudges.eveningTitle'),
    spunThatDay ? t('nudges.eveningReview') : t('nudges.eveningSpin'),
    eveningAt,
  );
  return true;
}
