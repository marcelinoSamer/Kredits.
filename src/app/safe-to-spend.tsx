// Safe to spend: liquid cash minus bills before payday minus goal contributions.

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Button, TextInput, useTheme } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { HeroPanel } from '@/components/HeroPanel';
import { Eyebrow } from '@/components/Eyebrow';
import { AppText } from '@/components/AppText';
import { MoneyText } from '@/components/MoneyText';
import { Divider } from '@/components/Divider';
import { t } from '@/i18n';
import { formatDate } from '@/ui/date';
import { useSafeToSpend } from '@/state/safeToSpend';
import { getSetting, setSetting } from '@/db/repositories/settings';
import { bumpData } from '@/state/dataVersion';
import type { AppTheme } from '@/theme';

export const PAYDAY_KEY = 'payday_day';

export default function SafeToSpendScreen() {
  const theme = useTheme<AppTheme>();
  const { spacing } = theme.tokens;
  const { data } = useSafeToSpend();
  const [payday, setPayday] = useState('');

  useEffect(() => {
    getSetting(PAYDAY_KEY).then((v) => setPayday(v ?? '1'));
  }, []);

  const savePayday = async (v: string) => {
    const n = Math.min(31, Math.max(1, parseInt(v.replace(/[^0-9]/g, ''), 10) || 1));
    setPayday(String(n));
    await setSetting(PAYDAY_KEY, String(n));
    bumpData();
  };

  if (!data) return <Screen><Stack.Screen options={{ title: t('safe.title') }} /></Screen>;
  const { result, display, paydayAt, bills } = data;

  const Line = ({ label, value, negative, onPress }: { label: string; value: number; negative?: boolean; onPress?: () => void }) => (
    <View style={styles.row}>
      <AppText style={{ flex: 1 }} role={onPress ? 'title' : 'body'}>{label}</AppText>
      <MoneyText value={negative ? -value : value} currency={display} signed={negative} colorBySign={negative} />
    </View>
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: t('safe.title') }} />
      <HeroPanel>
        <Eyebrow>{t('safe.untilPayday', { date: formatDate(paydayAt) })}</Eyebrow>
        <MoneyText value={result.total} currency={display} tone="gold" variant="displaySmall" animate fromZero />
        <AppText role="muted">{t('safe.perDay', { amount: Math.round(result.perDay).toLocaleString(), days: result.parts.daysToPayday })}</AppText>
      </HeroPanel>

      <Card style={{ gap: spacing.sm }}>
        <Eyebrow>{t('safe.breakdown')}</Eyebrow>
        <Line label={t('safe.liquid')} value={result.parts.liquidCash} />
        <Line label={t('safe.bills', { n: bills.length })} value={result.parts.billsBeforePayday} negative />
        <Line label={t('safe.goals')} value={result.parts.goalContributions} negative />
        <Divider />
        <Line label={t('safe.title')} value={result.total} />
      </Card>

      {bills.length > 0 && (
        <Card list>
          {bills.map((b, i) => (
            <View key={`${b.rule.id}-${b.at}`}>
              {i > 0 && <Divider />}
              <View style={[styles.row, { padding: spacing.lg }]}>
                <AppText style={{ flex: 1 }}>{`${formatDate(b.at)} · ${b.rule.merchant ?? b.rule.account_name}`}</AppText>
                <MoneyText value={b.rule.amount} currency={b.rule.currency} variant="titleSmall" />
              </View>
            </View>
          ))}
        </Card>
      )}

      <Card style={{ gap: spacing.sm }}>
        <Eyebrow>{t('safe.paydaySetting')}</Eyebrow>
        <TextInput mode="outlined" label={t('safe.paydayDay')} keyboardType="number-pad" value={payday} onChangeText={setPayday} onBlur={() => savePayday(payday)} />
        <AppText role="muted" variant="bodySmall">{t('safe.paydayHint')}</AppText>
      </Card>
      <Button mode="text" icon="calendar-repeat" onPress={() => router.push('/bills')}>{t('safe.manageBills')}</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
