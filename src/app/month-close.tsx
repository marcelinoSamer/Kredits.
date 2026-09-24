// "Closing the ledger": a monthly summary ritual — income, spend, net,
// biggest category, top merchants, event-box verdicts and the receipt
// streak — with a share-as-text button. Computed on-device only.

import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { Button, IconButton, Text, useTheme } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Eyebrow } from '@/components/Eyebrow';
import { AppText } from '@/components/AppText';
import { MoneyText } from '@/components/MoneyText';
import { Divider } from '@/components/Divider';
import { t } from '@/i18n';
import { addMonths, dayKey, monthLabel, monthRange } from '@/ui/date';
import { categoryLabel } from '@/ui/labels';
import { formatMoney } from '@/money/format';
import { convert, sumInCurrency } from '@/money/fx';
import { boxVerdict } from '@/money/boxes';
import { listActivityDays, sumByKindCurrency } from '@/db/repositories/transactions';
import { expenseByCategory, merchantTotals } from '@/db/repositories/stats';
import { listBoxes } from '@/db/repositories/boxes';
import { computeStreak } from '@/rewards/streak';
import { loadRewards } from '@/rewards/store';
import { usePortfolio } from '@/state/portfolio';
import { useAsyncData } from '@/state/dataVersion';
import type { AppTheme } from '@/theme';

const VERDICT_KEY = {
  underBudget: 'verdictUnder',
  nearBudget: 'verdictNear',
  overBudget: 'verdictOver',
  farOverBudget: 'verdictFarOver',
} as const;

export default function MonthCloseScreen() {
  const theme = useTheme<AppTheme>();
  const { spacing } = theme.tokens;
  const [offset, setOffset] = useState(0);
  const { data: pf } = usePortfolio();

  const anchor = addMonths(Date.now(), offset);
  const range = monthRange(anchor);

  const { data } = useAsyncData(async () => {
    const [sums, cats, merchants, boxes, days, rewards] = await Promise.all([
      sumByKindCurrency(range.from, range.to),
      expenseByCategory(range.from, range.to),
      merchantTotals(range.from, range.to),
      listBoxes(true),
      listActivityDays(range.from),
      loadRewards(),
    ]);
    return { sums, cats, merchants, boxes, days, rewards };
  }, [range.from]);

  if (!pf || !data) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('close.title') }} />
      </Screen>
    );
  }

  const { display, lookup } = pf;
  const conv = (amount: number, currency: string) => convert(amount, currency, display, lookup, display).value ?? 0;

  const income = sumInCurrency(data.sums.filter((s) => s.kind === 'income').map((s) => ({ amount: s.total, currency: s.currency })), display, lookup).total;
  const expense = sumInCurrency(data.sums.filter((s) => s.kind === 'expense').map((s) => ({ amount: s.total, currency: s.currency })), display, lookup).total;
  const net = income - expense;

  const catTotals = new Map<string, { label: string; total: number }>();
  for (const r of data.cats) {
    const key = r.category_id ?? '';
    const label = r.category_id ? categoryLabel({ id: r.category_id, name: r.category_name ?? '' }) : t('common.none');
    const cur = catTotals.get(key) ?? { label, total: 0 };
    cur.total += conv(r.total, r.currency);
    catTotals.set(key, cur);
  }
  const topCat = [...catTotals.values()].sort((a, b) => b.total - a.total)[0] ?? null;

  const merchantMap = new Map<string, number>();
  for (const m of data.merchants) merchantMap.set(m.merchant, (merchantMap.get(m.merchant) ?? 0) + conv(m.total, m.currency));
  const topMerchants = [...merchantMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const boxesInMonth = data.boxes.filter((b) => b.ends_at >= range.from && b.ends_at <= range.to);
  const streak = computeStreak(data.days, dayKey(Date.now()), data.rewards.shields);
  const activeDays = data.days.filter((d) => d >= range.from && d <= range.to).length;

  const share = async () => {
    const lines = [
      `${t('app.name')} · ${monthLabel(anchor)}`,
      `${t('dashboard.income')}: ${formatMoney(income, display)}`,
      `${t('dashboard.expenses')}: ${formatMoney(expense, display)}`,
      `${t('close.net')}: ${formatMoney(net, display)}`,
      topCat ? `${t('close.topCategory')}: ${topCat.label} (${formatMoney(topCat.total, display)})` : null,
      topMerchants.length ? `${t('close.topMerchants')}: ${topMerchants.map(([m, v]) => `${m} ${formatMoney(v, display)}`).join(', ')}` : null,
      `${t('close.activeDays', { n: activeDays })}`,
      `${t('wheel.streak', { n: streak.days })}`,
      '',
      t('more.offlineBadge'),
    ].filter(Boolean);
    await Share.share({ message: lines.join('\n') });
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('close.title') }} />

      <View style={styles.nav}>
        <IconButton icon="chevron-left" onPress={() => setOffset((o) => o - 1)} />
        <AppText role="title">{monthLabel(anchor)}</AppText>
        <IconButton icon="chevron-right" disabled={offset >= 0} onPress={() => setOffset((o) => o + 1)} />
      </View>

      <Card style={{ gap: spacing.sm }}>
        <Eyebrow>{t('close.net')}</Eyebrow>
        <MoneyText value={net} currency={display} tone="gold" variant="displaySmall" signed colorBySign />
        <Divider />
        <View style={styles.split}>
          <View style={{ gap: 2 }}>
            <Eyebrow>{t('dashboard.income')}</Eyebrow>
            <MoneyText value={income} currency={display} style={{ color: theme.semantic.income }} />
          </View>
          <View style={{ gap: 2 }}>
            <Eyebrow>{t('dashboard.expenses')}</Eyebrow>
            <MoneyText value={expense} currency={display} style={{ color: theme.semantic.expense }} />
          </View>
        </View>
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <Eyebrow>{t('close.topCategory')}</Eyebrow>
        {topCat ? (
          <View style={styles.row}>
            <AppText role="title">{topCat.label}</AppText>
            <MoneyText value={topCat.total} currency={display} />
          </View>
        ) : (
          <AppText role="muted">{t('close.nothing')}</AppText>
        )}
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <Eyebrow>{t('close.topMerchants')}</Eyebrow>
        {topMerchants.length === 0 ? (
          <AppText role="muted">{t('close.nothing')}</AppText>
        ) : (
          topMerchants.map(([m, v]) => (
            <View key={m} style={styles.row}>
              <AppText numberOfLines={1} style={{ flex: 1 }}>{m}</AppText>
              <MoneyText value={v} currency={display} />
            </View>
          ))
        )}
      </Card>

      {boxesInMonth.length > 0 && (
        <Card style={{ gap: spacing.sm }}>
          <Eyebrow>{t('plan.events')}</Eyebrow>
          {boxesInMonth.map((b) => (
            <View key={b.id} style={styles.row}>
              <AppText numberOfLines={1} style={{ flex: 1 }}>{b.name}</AppText>
              <Text variant="labelLarge" style={{ color: boxVerdict(b.budget_amount, b.spent) === 'underBudget' ? theme.semantic.income : theme.semantic.expense }}>
                {t(`boxes.${VERDICT_KEY[boxVerdict(b.budget_amount, b.spent)]}`)}
              </Text>
            </View>
          ))}
        </Card>
      )}

      <Card style={{ gap: spacing.xs }}>
        <Eyebrow>{t('close.habit')}</Eyebrow>
        <AppText>{t('close.activeDays', { n: activeDays })}</AppText>
        <AppText>{t('wheel.streak', { n: streak.days })}</AppText>
      </Card>

      <Button mode="contained" icon="share-variant" onPress={share}>
        {t('close.share')}
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  split: { flexDirection: 'row', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
});
