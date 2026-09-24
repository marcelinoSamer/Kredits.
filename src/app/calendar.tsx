// Money calendar: a month grid tinted by daily spend, upcoming bills marked,
// tap a day to see its receipts.

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { IconButton, Text, useTheme } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Eyebrow } from '@/components/Eyebrow';
import { AppText } from '@/components/AppText';
import { MoneyText } from '@/components/MoneyText';
import { Divider } from '@/components/Divider';
import { TransactionRow } from '@/components/TransactionRow';
import { t } from '@/i18n';
import { addMonths, dayKey, formatDayHeader, monthLabel, monthRange } from '@/ui/date';
import { convert } from '@/money/fx';
import { occurrences } from '@/money/recurring';
import { listTransactions } from '@/db/repositories/transactions';
import { listRecurring } from '@/db/repositories/recurring';
import { usePortfolio } from '@/state/portfolio';
import { useAsyncData } from '@/state/dataVersion';
import type { AppTheme } from '@/theme';

const DAY = 86_400_000;
const WEEKDAYS_EN = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function CalendarScreen() {
  const theme = useTheme<AppTheme>();
  const { spacing, radius } = theme.tokens;
  const { data: pf } = usePortfolio();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<number>(dayKey(Date.now()));
  const anchor = addMonths(Date.now(), offset);
  const range = monthRange(anchor);

  const { data } = useAsyncData(async () => {
    const [txs, rules] = await Promise.all([listTransactions({ from: range.from, to: range.to }), listRecurring(true)]);
    const bills = rules.flatMap((r) => occurrences(r, Math.max(range.from, Date.now()), range.to));
    return { txs, bills };
  }, [range.from]);

  const display = pf?.display ?? 'EGP';
  const spendByDay = useMemo(() => {
    const m = new Map<number, number>();
    if (!pf || !data) return m;
    for (const tx of data.txs) {
      if (tx.kind !== 'expense') continue;
      const v = convert(tx.amount, tx.currency, display, pf.lookup, display).value ?? 0;
      const k = dayKey(tx.occurred_at);
      m.set(k, (m.get(k) ?? 0) + v);
    }
    return m;
  }, [data, pf, display]);
  const max = Math.max(1, ...spendByDay.values());
  const billDays = new Set((data?.bills ?? []).map((b) => dayKey(b.at)));

  // Grid: Monday-first.
  const first = new Date(range.from);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => range.from + i * DAY)];
  while (cells.length % 7) cells.push(null);

  const dayTxs = (data?.txs ?? []).filter((tx) => dayKey(tx.occurred_at) === selected);
  const dayBills = (data?.bills ?? []).filter((b) => dayKey(b.at) === selected);
  const today = dayKey(Date.now());

  return (
    <Screen>
      <Stack.Screen options={{ title: t('calendar.title') }} />
      <View style={styles.nav}>
        <IconButton icon="chevron-left" onPress={() => setOffset((o) => o - 1)} />
        <AppText role="title">{monthLabel(anchor)}</AppText>
        <IconButton icon="chevron-right" onPress={() => setOffset((o) => o + 1)} />
      </View>

      <Card style={{ gap: spacing.xs }}>
        <View style={styles.week}>
          {WEEKDAYS_EN.map((d, i) => (
            <Text key={i} variant="labelSmall" style={[styles.cellText, { color: theme.colors.onSurfaceVariant }]}>{d}</Text>
          ))}
        </View>
        {Array.from({ length: cells.length / 7 }, (_, r) => (
          <View key={r} style={styles.week}>
            {cells.slice(r * 7, r * 7 + 7).map((c, i) => {
              if (c == null) return <View key={i} style={styles.cell} />;
              const spend = spendByDay.get(c) ?? 0;
              const heat = spend > 0 ? 0.18 + 0.72 * (spend / max) : 0;
              const isSel = c === selected;
              return (
                <Pressable key={i} onPress={() => setSelected(c)} style={styles.cell}>
                  <View
                    style={[
                      styles.cellInner,
                      { borderRadius: radius.sm, backgroundColor: spend > 0 ? `rgba(240,121,94,${heat.toFixed(2)})` : 'transparent' },
                      isSel && { borderWidth: 1.5, borderColor: theme.semantic.gold },
                      c === today && !isSel && { borderWidth: 1, borderColor: theme.colors.outline },
                    ]}
                  >
                    <Text variant="labelMedium" style={{ color: theme.colors.onSurface }}>{new Date(c).getDate()}</Text>
                    {billDays.has(c) && <View style={[styles.dot, { backgroundColor: theme.semantic.gold }]} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
        <View style={styles.legend}>
          <View style={[styles.dot, { backgroundColor: theme.semantic.gold, position: 'relative' }]} />
          <AppText role="muted" variant="bodySmall">{t('calendar.billMarker')}</AppText>
        </View>
      </Card>

      <View style={{ gap: spacing.sm }}>
        <View style={styles.nav}>
          <Eyebrow>{formatDayHeader(selected)}</Eyebrow>
          <MoneyText value={spendByDay.get(selected) ?? 0} currency={display} variant="titleSmall" muted animate />
        </View>
        {dayBills.length > 0 && (
          <Card list>
            {dayBills.map((b, i) => (
              <View key={`${b.rule.id}-${b.at}`}>
                {i > 0 && <Divider />}
                <Pressable onPress={() => router.push('/bills')} style={[styles.billRow, { padding: spacing.lg }]}>
                  <AppText style={{ flex: 1 }}>{`${t('calendar.upcoming')} · ${b.rule.merchant ?? b.rule.account_name}`}</AppText>
                  <MoneyText value={b.rule.kind === 'income' ? b.rule.amount : -b.rule.amount} currency={b.rule.currency} signed colorBySign variant="titleSmall" />
                </Pressable>
              </View>
            ))}
          </Card>
        )}
        {dayTxs.length === 0 && dayBills.length === 0 ? (
          <AppText role="muted">{t('calendar.nothing')}</AppText>
        ) : (
          dayTxs.length > 0 && (
            <Card list>
              {dayTxs.map((tx, i) => (
                <View key={tx.id}>
                  {i > 0 && <Divider inset={76} />}
                  <TransactionRow tx={tx} onPress={() => router.push({ pathname: '/transaction-edit', params: { id: tx.id } })} />
                </View>
              ))}
            </Card>
          )
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  week: { flexDirection: 'row' },
  cell: { flex: 1, aspectRatio: 1, padding: 2 },
  cellInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cellText: { flex: 1, textAlign: 'center' },
  dot: { position: 'absolute', bottom: 4, width: 5, height: 5, borderRadius: 3 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
  billRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
