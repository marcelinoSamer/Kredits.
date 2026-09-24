// Local reminders the day before each upcoming bill (next 14 days). Rescheduled
// whenever the ledger changes; identifiers are stable so re-arming replaces.

import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

import { ensureNotificationPermission } from './index';
import { listRecurring } from '@/db/repositories/recurring';
import { occurrences } from '@/money/recurring';
import { formatMoney } from '@/money/format';
import { t } from '@/i18n';

const DAY = 86_400_000;
const PREFIX = 'bill-';
const REMIND_HOUR = 18;

export async function scheduleBillReminders(): Promise<void> {
  const rules = (await listRecurring(true)).filter((r) => r.remind && r.kind === 'expense');
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled.filter((n) => n.identifier.startsWith(PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})),
  );
  if (rules.length === 0) return;
  if (!(await ensureNotificationPermission())) return;

  const now = Date.now();
  for (const r of rules) {
    for (const o of occurrences(r, now, now + 14 * DAY)) {
      const at = new Date(o.at - DAY);
      at.setHours(REMIND_HOUR, 0, 0, 0);
      if (at.getTime() <= now) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX}${r.id}-${o.at}`,
        content: {
          title: t('bills.reminderTitle'),
          body: t('bills.reminderBody', { name: r.merchant ?? r.note ?? r.account_name, amount: formatMoney(r.amount, r.currency) }),
        },
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: at.getTime() },
      });
    }
  }
}
