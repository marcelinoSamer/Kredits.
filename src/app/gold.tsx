// Gold ledger: lots by gram and karat, valued against the user's XAU rate.

import { StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Chip, IconButton, Text, useTheme } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { HeroPanel } from '@/components/HeroPanel';
import { Eyebrow } from '@/components/Eyebrow';
import { AppText } from '@/components/AppText';
import { MoneyText } from '@/components/MoneyText';
import { Divider } from '@/components/Divider';
import { EmptyState } from '@/components/EmptyState';
import { t } from '@/i18n';
import { formatDate } from '@/ui/date';
import { formatNumber } from '@/money/format';
import { gramPrice } from '@/money/gold';
import { pureGrams, valueLot } from '@/money/goldLots';
import { listGoldLots } from '@/db/repositories/gold';
import { usePortfolio } from '@/state/portfolio';
import { useAsyncData } from '@/state/dataVersion';
import type { AppTheme } from '@/theme';

export default function GoldScreen() {
  const theme = useTheme<AppTheme>();
  const { spacing } = theme.tokens;
  const { data: pf } = usePortfolio();
  const { data: lots } = useAsyncData(() => listGoldLots());
  const display = pf?.display ?? 'EGP';
  const g24 = pf ? gramPrice(display, pf.lookup, 24) : null;

  const open = (lots ?? []).filter((l) => l.sold_at == null);
  let cost = 0;
  let value = 0;
  let grams = 0;
  for (const l of open) {
    const v = valueLot(l, l.currency === display ? g24 : null);
    cost += v.cost;
    value += v.value ?? 0;
    grams += pureGrams(l);
  }
  const gain = value - cost;

  return (
    <Screen>
      <Stack.Screen options={{ title: t('gold.title'), headerRight: () => <IconButton icon="plus" onPress={() => router.push('/gold-edit')} /> }} />

      <HeroPanel>
        <Eyebrow>{t('gold.holding')}</Eyebrow>
        <Text variant="displaySmall" style={{ color: theme.semantic.gold, fontFamily: theme.tokens.font.numeric.semibold }}>
          {`${formatNumber(grams, 2)} g`}
        </Text>
        <AppText role="muted" variant="bodySmall">{t('gold.pureNote')}</AppText>
        <Divider style={{ marginVertical: spacing.xs }} />
        <View style={styles.split}>
          <View style={{ flex: 1, gap: 2 }}>
            <Eyebrow>{t('gold.value')}</Eyebrow>
            {g24 ? <MoneyText value={value} currency={display} variant="titleMedium" animate /> : <AppText role="muted">{t('dashboard.setGoldRate')}</AppText>}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Eyebrow>{t('gold.gain')}</Eyebrow>
            {g24 ? <MoneyText value={gain} currency={display} variant="titleMedium" signed colorBySign animate /> : <AppText role="muted">—</AppText>}
          </View>
        </View>
        {g24 && <AppText role="muted" variant="bodySmall">{t('gold.rateNow', { p24: formatNumber(g24, 0), p21: formatNumber(g24 * (21 / 24), 0) })}</AppText>}
      </HeroPanel>

      {lots && lots.length === 0 && <EmptyState icon="gold" text={t('gold.empty')} actionLabel={t('gold.add')} onAction={() => router.push('/gold-edit')} />}

      {lots && lots.length > 0 && (
        <Card list>
          {lots.map((l, i) => {
            const v = valueLot(l, l.currency === display ? g24 : null);
            return (
              <View key={l.id}>
                {i > 0 && <Divider />}
                <View style={[styles.row, { padding: spacing.lg, gap: spacing.md, opacity: l.sold_at ? 0.6 : 1 }]}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <AppText role="title">{l.name}</AppText>
                    <View style={styles.inline}>
                      <Chip compact>{`${formatNumber(l.grams, 2)} g · ${l.karat}k`}</Chip>
                      {l.sold_at ? <Chip compact icon="check">{t('gold.sold')}</Chip> : null}
                    </View>
                    <AppText role="muted" variant="bodySmall">{t('gold.boughtAt', { date: formatDate(l.bought_at), price: formatNumber(l.price_per_gram, 0) })}</AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    {v.value != null ? <MoneyText value={v.value} currency={l.currency} variant="titleSmall" /> : <MoneyText value={v.cost} currency={l.currency} variant="titleSmall" muted />}
                    {v.gain != null && (
                      <Text variant="labelSmall" style={{ color: v.gain >= 0 ? theme.semantic.positive : theme.semantic.negative }}>
                        {`${v.gain >= 0 ? '+' : ''}${formatNumber(v.gainPct ?? 0, 1)}%`}
                      </Text>
                    )}
                  </View>
                  <IconButton icon="chevron-right" onPress={() => router.push({ pathname: '/gold-edit', params: { id: l.id } })} />
                </View>
              </View>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  split: { flexDirection: 'row', gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  inline: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
});
