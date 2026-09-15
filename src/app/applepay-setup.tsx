// Apple Pay capture: a four-tap one-time setup in the Shortcuts app, then every
// tap records itself in the background. Also maps Wallet cards to Pockets.

import { Platform, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { Button, List, Text, useTheme } from 'react-native-paper';
import { getCaptureStatus, markSetupDone, stopReminders, REMINDER_MINUTES } from '@/capture/status';
import { drainCaptureQueue, readQueueDiagnostics } from '@/capture/queue';
import { formatDate } from '@/ui/date';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Eyebrow } from '@/components/Eyebrow';
import { AppText } from '@/components/AppText';
import { SelectField, type SelectOption } from '@/components/SelectField';
import { t } from '@/i18n';
import { loadCardMap, loadSeenCards, rememberCardAccount } from '@/capture/cards';
import { listAccounts } from '@/db/repositories/accounts';
import { useAsyncData, bumpData } from '@/state/dataVersion';
import type { AppTheme } from '@/theme';

export default function ApplePaySetupScreen() {
  const theme = useTheme<AppTheme>();
  const { spacing } = theme.tokens;
  const { data } = useAsyncData(async () => {
    const [map, seen, accounts, status, diag] = await Promise.all([loadCardMap(), loadSeenCards(), listAccounts(false), getCaptureStatus(), readQueueDiagnostics()]);
    const cards = [...new Set([...Object.keys(map), ...seen.map((c) => c.toLowerCase())])];
    return { map, seen, cards, accounts, status, diag };
  });
  const status = data?.status;
  const options: SelectOption[] = (data?.accounts ?? []).filter((a) => a.type !== 'box').map((a) => ({ key: a.id, label: `${a.name} (${a.currency})` }));
  const steps = [1, 2, 3, 4, 5].map((n) => t(`applepay.step${n}`));

  return (
    <Screen>
      <Stack.Screen options={{ title: t('applepay.title') }} />
      {Platform.OS !== 'ios' && <Text style={{ color: theme.colors.onSurfaceVariant }}>{t('applepay.onlyIos')}</Text>}

      {status && (
        <Card style={{ gap: spacing.sm, borderWidth: 1, borderColor: status.verifiedAt ? theme.colors.primary : status.setupDone ? theme.colors.outline : theme.semantic.gold }}>
          <AppText role="title">
            {status.verifiedAt
              ? t('applepay.statusVerified', { date: formatDate(status.verifiedAt) })
              : status.setupDone
                ? t('applepay.statusWaiting')
                : t('applepay.statusOff')}
          </AppText>
          {!status.setupDone && !status.verifiedAt && (
            <>
              <AppText role="muted" variant="bodySmall">{t('applepay.statusOffBody', { minutes: REMINDER_MINUTES })}</AppText>
              <Button mode="contained" icon="check" onPress={async () => { await markSetupDone(); bumpData(); }}>
                {t('applepay.iDidIt')}
              </Button>
              {!status.remindersOff && (
                <Button mode="text" onPress={async () => { await stopReminders(); bumpData(); }}>{t('applepay.stopReminders')}</Button>
              )}
            </>
          )}
        </Card>
      )}

      <Card style={{ gap: spacing.sm }}>
        <AppText role="title">{t('applepay.howItWorks')}</AppText>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{t('applepay.intro')}</Text>
      </Card>

      <View style={{ gap: spacing.sm }}>
        <Eyebrow>{t('applepay.smsTitle')}</Eyebrow>
        <Card list>
          {[1, 2, 3, 4].map((n, i) => (
            <View key={n} style={[styles.step, { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.md }]}>
              <View style={[styles.num, { backgroundColor: theme.semantic.goldDim }]}>
                <Text variant="labelLarge" style={{ color: theme.semantic.gold }}>{i + 1}</Text>
              </View>
              <Text variant="bodyMedium" style={{ flex: 1 }}>{t(`applepay.sms${n}`)}</Text>
            </View>
          ))}
        </Card>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{t('applepay.smsPrivacy')}</Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Eyebrow>{t('applepay.setupTitle')}</Eyebrow>
        <Card list>
          {steps.map((s, i) => (
            <View key={i} style={[styles.step, { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.md }]}>
              <View style={[styles.num, { backgroundColor: theme.semantic.goldDim }]}>
                <Text variant="labelLarge" style={{ color: theme.semantic.gold }}>{i + 1}</Text>
              </View>
              <Text variant="bodyMedium" style={{ flex: 1 }}>{s}</Text>
            </View>
          ))}
        </Card>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{t('applepay.afterSetup')}</Text>
      </View>

      {data?.diag && (
        <View style={{ gap: spacing.sm }}>
          <Eyebrow>{t('applepay.diag')}</Eyebrow>
          <Card style={{ gap: 4 }}>
            <AppText variant="bodySmall">{t('applepay.diagPending', { n: data.diag.pending })}</AppText>
            <AppText variant="bodySmall">{t('applepay.diagReceived', { when: data.diag.lastReceivedAt ? new Date(data.diag.lastReceivedAt).toLocaleString() : '—' })}</AppText>
            <AppText variant="bodySmall">{t('applepay.diagRecorded', { n: data.diag.totalRecorded })}</AppText>
            {data.diag.lastError ? <AppText variant="bodySmall" style={{ color: theme.semantic.negative }}>{t('applepay.diagError', { error: data.diag.lastError })}</AppText> : null}
            <Button mode="outlined" icon="refresh" onPress={async () => { await drainCaptureQueue(); bumpData(); }}>{t('applepay.processNow')}</Button>
          </Card>
        </View>
      )}

      <View style={{ gap: spacing.sm }}>
        <Eyebrow>{t('applepay.cards')}</Eyebrow>
        {data && data.cards.length === 0 ? (
          <AppText role="muted">{t('applepay.noCards')}</AppText>
        ) : (
          <Card style={{ gap: spacing.sm }}>
            {data?.cards.map((card) => (
              <SelectField
                key={card}
                label={data.seen.find((c) => c.toLowerCase() === card) ?? card}
                value={data.map[card] ?? null}
                placeholder={t('applepay.pickPocket')}
                onChange={async (id) => {
                  await rememberCardAccount(card, id);
                  bumpData();
                }}
                options={options}
              />
            ))}
          </Card>
        )}
        <List.Item title={t('applepay.fallback')} left={() => <List.Icon icon="information-outline" />} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', alignItems: 'flex-start' },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
