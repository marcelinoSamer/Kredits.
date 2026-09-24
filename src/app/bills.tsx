// Bills & recurring: what is due now (post or skip), what is coming in the
// next 30 days, and every rule with its monthly equivalent.

import { StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Button, Chip, IconButton, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Eyebrow } from '@/components/Eyebrow';
import { AppText } from '@/components/AppText';
import { MoneyText } from '@/components/MoneyText';
import { IconBadge } from '@/components/IconBadge';
import { Divider } from '@/components/Divider';
import { EmptyState } from '@/components/EmptyState';
import { t } from '@/i18n';
import { formatDayHeader } from '@/ui/date';
import { dueUpTo, monthlyEquivalent, occurrences } from '@/money/recurring';
import { listRecurring, postOccurrence, skipOccurrence, type RecurringView } from '@/db/repositories/recurring';
import { useAsyncData, bumpData } from '@/state/dataVersion';
import type { AppTheme } from '@/theme';

const DAY = 86_400_000;

export default function BillsScreen() {
  const theme = useTheme<AppTheme>();
  const { spacing } = theme.tokens;
  const { data: rules } = useAsyncData(() => listRecurring(false));
  const now = Date.now();

  const enabled = (rules ?? []).filter((r) => r.enabled);
  const due = enabled.flatMap((r) => (r.auto_post ? [] : dueUpTo(r, now).due.map((at) => ({ rule: r, at }))));
  const upcoming = enabled
    .flatMap((r) => occurrences(r, now, now + 30 * DAY))
    .sort((a, b) => a.at - b.at);

  const post = async (r: RecurringView, at: number) => {
    await postOccurrence(r, at);
    bumpData();
  };
  const skip = async (r: RecurringView, at: number) => {
    await skipOccurrence(r, at);
    bumpData();
  };

  const Row = ({ r, at, actions }: { r: RecurringView; at: number; actions?: boolean }) => (
    <View style={[styles.row, { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.md }]}>
      <IconBadge icon={r.category_icon ?? (r.kind === 'income' ? 'cash' : 'file-document-outline')} color={r.category_color ?? theme.colors.primary} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText role="title" numberOfLines={1}>{r.merchant ?? r.note ?? r.account_name}</AppText>
        <AppText role="muted" variant="bodySmall">{`${formatDayHeader(at)} · ${r.account_name}`}</AppText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <MoneyText value={r.kind === 'income' ? r.amount : -r.amount} currency={r.currency} signed colorBySign variant="titleSmall" />
        {actions && (
          <View style={styles.inline}>
            <Button compact onPress={() => skip(r, at)}>{t('bills.skip')}</Button>
            <Button compact mode="contained-tonal" onPress={() => post(r, at)}>{t('bills.post')}</Button>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <Screen>
      <Stack.Screen
        options={{ title: t('bills.title'), headerRight: () => <IconButton icon="plus" onPress={() => router.push('/recurring-edit')} /> }}
      />

      {rules && rules.length === 0 && (
        <EmptyState icon="calendar-repeat" text={t('bills.empty')} actionLabel={t('bills.add')} onAction={() => router.push('/recurring-edit')} />
      )}

      {due.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Eyebrow color={theme.semantic.gold}>{t('bills.dueNow')}</Eyebrow>
          <Card list>
            {due.map((d, i) => (
              <View key={`${d.rule.id}-${d.at}`}>
                {i > 0 && <Divider inset={72} />}
                <Row r={d.rule} at={d.at} actions />
              </View>
            ))}
          </Card>
        </View>
      )}

      {upcoming.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Eyebrow>{t('bills.next30')}</Eyebrow>
          <Card list>
            {upcoming.map((o, i) => (
              <View key={`${o.rule.id}-${o.at}`}>
                {i > 0 && <Divider inset={72} />}
                <Row r={o.rule} at={o.at} />
              </View>
            ))}
          </Card>
        </View>
      )}

      {rules && rules.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Eyebrow>{t('bills.allRules')}</Eyebrow>
          <Card list>
            {rules.map((r, i) => (
              <View key={r.id}>
                {i > 0 && <Divider inset={72} />}
                <View style={[styles.row, { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.md, opacity: r.enabled ? 1 : 0.5 }]}>
                  <IconBadge icon={r.category_icon ?? (r.kind === 'income' ? 'cash' : 'file-document-outline')} color={r.category_color ?? theme.colors.primary} size={40} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText role="title" numberOfLines={1}>{r.merchant ?? r.note ?? r.account_name}</AppText>
                    <View style={styles.inline}>
                      <Chip compact>{t(`bills.freq.${r.frequency}`)}</Chip>
                      {!r.auto_post && <Chip compact icon="hand-back-right-outline">{t('bills.manual')}</Chip>}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <MoneyText value={r.amount} currency={r.currency} variant="titleSmall" />
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {t('bills.perMonth', { amount: Math.round(monthlyEquivalent(r.amount, r.frequency, r.interval)) })}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} onPress={() => router.push({ pathname: '/recurring-edit', params: { id: r.id } })} />
                </View>
              </View>
            ))}
          </Card>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
});
