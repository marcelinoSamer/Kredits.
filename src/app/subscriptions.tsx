// Subscription radar: recurring charges detected from the user's own receipts.

import { StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Button, Chip, useTheme } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Eyebrow } from '@/components/Eyebrow';
import { AppText } from '@/components/AppText';
import { MoneyText } from '@/components/MoneyText';
import { Divider } from '@/components/Divider';
import { EmptyState } from '@/components/EmptyState';
import { t } from '@/i18n';
import { formatDayHeader } from '@/ui/date';
import { convert } from '@/money/fx';
import { detectSubscriptions } from '@/money/subscriptions';
import { listTransactions } from '@/db/repositories/transactions';
import { listRecurring } from '@/db/repositories/recurring';
import { usePortfolio } from '@/state/portfolio';
import { useAsyncData } from '@/state/dataVersion';
import type { AppTheme } from '@/theme';

export default function SubscriptionsScreen() {
  const theme = useTheme<AppTheme>();
  const { spacing } = theme.tokens;
  const { data: pf } = usePortfolio();
  const { data } = useAsyncData(async () => {
    const [txs, rules] = await Promise.all([listTransactions({ kind: 'expense', from: Date.now() - 400 * 86_400_000 }), listRecurring(false)]);
    const tracked = new Set(rules.map((r) => (r.merchant ?? '').trim().toLowerCase()));
    return { subs: detectSubscriptions(txs), tracked };
  });

  const display = pf?.display ?? 'EGP';
  const monthlyTotal = pf && data ? data.subs.reduce((s, x) => s + (convert(x.monthlyCost, x.currency, display, pf.lookup, display).value ?? 0), 0) : 0;

  return (
    <Screen>
      <Stack.Screen options={{ title: t('subs.title') }} />
      {data && data.subs.length === 0 ? (
        <EmptyState icon="radar" text={t('subs.empty')} />
      ) : (
        <>
          <Card style={{ gap: 4 }}>
            <Eyebrow>{t('subs.monthlyTotal')}</Eyebrow>
            <MoneyText value={monthlyTotal} currency={display} variant="headlineMedium" animate fromZero />
            <AppText role="muted" variant="bodySmall">{t('subs.yearly', { amount: Math.round(monthlyTotal * 12).toLocaleString() })}</AppText>
          </Card>
          <Card list>
            {data?.subs.map((s, i) => {
              const tracked = data.tracked.has(s.merchant.toLowerCase());
              return (
                <View key={`${s.merchant}-${s.amount}`}>
                  {i > 0 && <Divider />}
                  <View style={{ padding: spacing.lg, gap: spacing.sm }}>
                    <View style={styles.row}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <AppText role="title">{s.merchant}</AppText>
                        <AppText role="muted" variant="bodySmall">
                          {t('subs.seen', { n: s.occurrences, next: formatDayHeader(s.nextExpected) })}
                        </AppText>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <MoneyText value={s.amount} currency={s.currency} variant="titleSmall" />
                        <Chip compact>{t(`bills.freq.${s.cadence}`)}</Chip>
                      </View>
                    </View>
                    <View style={styles.row}>
                      <AppText role="muted" variant="bodySmall">{t('subs.perYear', { amount: Math.round(s.yearlyCost).toLocaleString() })}</AppText>
                      {tracked ? (
                        <Chip compact icon="check">{t('subs.tracked')}</Chip>
                      ) : (
                        <Button
                          compact
                          mode="contained-tonal"
                          onPress={() => router.push({ pathname: '/recurring-edit', params: { merchant: s.merchant, amount: String(Math.round(s.amount * 100) / 100), frequency: s.cadence } })}
                        >
                          {t('subs.track')}
                        </Button>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
});
