// Tracks whether the user has enabled automatic Apple Pay capture, and nags
// (local notifications, no server) until they do.
//
//   not set up  -> repeating reminder every REMINDER_MINUTES, home-screen card
//   set up      -> user tapped "I've done the steps": reminders stop
//   verified    -> first purchase arrived through the App Intent

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

import { getSetting, setSetting } from '@/db/repositories/settings';
import { ensureNotificationPermission } from '@/notifications/index';
import { t } from '@/i18n';

/** Cadence of the "turn on capture" reminder. */
export const REMINDER_MINUTES = 10;
const ID = 'capture-reminder';
const K_SETUP = 'capture_setup_done';
const K_VERIFIED = 'capture_verified_at';
const K_DISMISSED = 'capture_reminders_off';

export interface CaptureStatus {
  supported: boolean;
  setupDone: boolean;
  verifiedAt: number | null;
  remindersOff: boolean;
}

export async function getCaptureStatus(): Promise<CaptureStatus> {
  const [setup, verified, off] = await Promise.all([getSetting(K_SETUP), getSetting(K_VERIFIED), getSetting(K_DISMISSED)]);
  return {
    supported: Platform.OS === 'ios',
    setupDone: setup === '1',
    verifiedAt: verified ? Number(verified) : null,
    remindersOff: off === '1',
  };
}

export async function cancelCaptureReminders(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(ID).catch(() => {});
}

/** Schedules one repeating local reminder (iOS coalesces it into a single pending request). */
export async function scheduleCaptureReminders(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  const st = await getCaptureStatus();
  if (st.setupDone || st.verifiedAt || st.remindersOff) return false;
  if (!(await ensureNotificationPermission())) return false;
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  if (pending.some((n) => n.identifier === ID)) return true;
  await Notifications.scheduleNotificationAsync({
    identifier: ID,
    content: { title: t('applepay.remindTitle'), body: t('applepay.remindBody'), data: { route: '/applepay-setup' } },
    trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: REMINDER_MINUTES * 60, repeats: true },
  });
  return true;
}

export async function markSetupDone(): Promise<void> {
  await setSetting(K_SETUP, '1');
  await cancelCaptureReminders();
}

export async function markVerified(): Promise<void> {
  const st = await getCaptureStatus();
  if (!st.verifiedAt) await setSetting(K_VERIFIED, String(Date.now()));
  if (!st.setupDone) await setSetting(K_SETUP, '1');
  await cancelCaptureReminders();
}

export async function stopReminders(): Promise<void> {
  await setSetting(K_DISMISSED, '1');
  await cancelCaptureReminders();
}
