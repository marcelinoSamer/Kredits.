import { StyleSheet, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Button, useTheme } from 'react-native-paper';
import { DrawnBar } from '@/components/anim/DrawnBar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { IconBadge } from '@/components/IconBadge';
import { Divider } from '@/components/Divider';
import { AppText } from '@/components/AppText';
import { MoneyText } from '@/components/MoneyText';
import { Eyebrow } from '@/components/Eyebrow';
import { TransactionRow } from '@/components/TransactionRow';
import { t } from '@/i18n';
import { formatDate } from '@/ui/date';
import { daysUntil } from '@/money/credit';
import { getCreditData } from '@/db/repositories/credit';
import { useAsyncData } from '@/state/dataVersion';
import type { AppTheme } from '@/theme';

function dueLabel(dueAt: number, now: number): string {
  const d = daysUntil(dueAt, now);
  if (d < 0) return t('credit.overdueByDays', { days: -d });
  if (d === 0) return t('credit.dueToday');
  if (d === 1) return t('credit.dueTomorrow');
  return t('credit.dueInDays', { days: d });
}

export default function CreditDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme<AppTheme>();
  const { spacing } = theme.tokens;

  const { data } = useAsyncData(async () => (id ? getCreditData(id, Date.now()) : null), [id]);

  if (!data) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('credit.title') }} />
      </Screen>
    );
  }

  const { account, status, txns, transfers } = data;
  const currency = account.currency;
  const accent = account.color ?? theme.semantic.negative;
  const now = Date.now();
  const overLimit = status.available < 0;
  const utilColor = overLimit || status.overdueAmount > 0.005 ? theme.semantic.negative : accent;

  const repaymentIds = new Set(transfers.filter((tr) => tr.to_account_id === account.id).map((tr) => tr.id));

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: account.name,
          headerRight: () => (
            <MaterialCommunityIcons
              name="pencil-outline"
              size={22}
              color={theme.colors.onSurface}
              onPress={() => router.push({ pathname: '/account-edit', params: { id: account.id } })}
            />
          ),
        }}
      />

      {/* Available panel */}
      <Card padding="xl">
        <Eyebrow>{t('credit.available')}</Eyebrow>
        <MoneyText value={status.available} currency={currency} variant="displaySmall" style={styles.heroFigure} />
        <View style={[styles.rule, { backgroundColor: accent }]} />
        <AppText role="muted">{t('credit.notMine')}</AppText>

        <DrawnBar
          progress={status.limit > 0 ? Math.min(1, status.owed / status.limit) : 0}
          color={utilColor}
          style={{ marginTop: spacing.md, height: 6, borderRadius: 3 }}
        />
        <View style={styles.statRow}>
          <Stat label={t('credit.owed')} value={status.owed} currency={currency} tone={status.owed > 0.005 ? 'negative' : undefined} />
          <Stat label={t('credit.limit')} value={status.limit} currency={currency} />
          <View style={styles.stat}>
            <Eyebrow>{overLimit ? t('credit.overLimit') : t('credit.used', { percent: Math.round(status.utilization) })}</Eyebrow>
          </View>
        </View>
      </Card>

      {/* Next repayment */}
      <Card>
        <View style={styles.dueRow}>
          <IconBadge
            icon={status.overdueAmount > 0.005 ? 'alert-outline' : 'calendar-clock'}
            variant="soft"
            color={status.overdueAmount > 0.005 ? theme.semantic.negative : accent}
            size={44}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <Eyebrow>{t('credit.nextRepayment')}</Eyebrow>
            {status.nextDueAt != null ? (
              <>
                <AppText role="title">{t('credit.repayBy', { date: formatDate(status.nextDueAt) })}</AppText>
                <AppText
                  role="muted"
                  style={status.nextDueAt < now ? { color: theme.semantic.negative } : null}
                >
                  {dueLabel(status.nextDueAt, now)}
                </AppText>
              </>
            ) : (
              <AppText role="title">{t('credit.allPaid')}</AppText>
            )}
          </View>
          {status.nextDueAt != null && (
            <MoneyText value={status.nextDueAmount} currency={currency} variant="titleMedium" />
          )}
        </View>
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          mode="contained"
          icon="cart-outline"
          style={styles.actionBtn}
          onPress={() =>
            router.push({ pathname: '/transaction-edit', params: { kind: 'expense', accountId: account.id } })
          }
        >
          {t('credit.spend')}
        </Button>
        <Button
          mode="contained-tonal"
          icon="cash-refund"
          style={styles.actionBtn}
          onPress={() => router.push({ pathname: '/transfer', params: { to: account.id } })}
        >
          {t('credit.repay')}
        </Button>
      </View>

      {/* Outstanding charges */}
      {status.outstanding.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Eyebrow>{t('credit.outstanding')}</Eyebrow>
          <Card list>
            {status.outstanding.map((o, i) => (
              <View key={`${o.occurredAt}-${i}`}>
                {i > 0 && <Divider inset={68} />}
                <View style={[styles.chargeRow, { paddingVertical: spacing.md, paddingHorizontal: spacing.lg }]}>
                  <IconBadge
                    icon="credit-card-clock-outline"
                    variant="soft"
                    color={o.overdue ? theme.semantic.negative : accent}
                    size={38}
                    iconSize={18}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText role="title">{t('credit.chargedOn', { date: formatDate(o.occurredAt) })}</AppText>
                    <AppText role="muted" style={o.overdue ? { color: theme.semantic.negative } : null}>
                      {t('credit.repayBy', { date: formatDate(o.dueAt) })}  ·  {dueLabel(o.dueAt, now)}
                    </AppText>
                  </View>
                  <MoneyText value={o.remaining} currency={currency} variant="titleSmall" />
                </View>
              </View>
            ))}
          </Card>
        </View>
      )}

      {/* Activity */}
      <View style={{ gap: spacing.sm }}>
        <Eyebrow>{t('credit.activity')}</Eyebrow>
        {txns.length === 0 && transfers.length === 0 ? (
          <AppText role="muted" variant="bodyMedium" style={{ paddingHorizontal: spacing.xs }}>
            {t('credit.noCharges')}
          </AppText>
        ) : (
          <Card list>
            {txns.map((tx, i) => (
              <View key={tx.id}>
                {i > 0 && <Divider inset={76} />}
                <TransactionRow
                  tx={tx}
                  onPress={() => router.push({ pathname: '/transaction-edit', params: { id: tx.id } })}
                />
              </View>
            ))}
            {transfers.map((tr, i) => {
              const into = repaymentIds.has(tr.id);
              return (
                <View key={tr.id}>
                  {(txns.length > 0 || i > 0) && <Divider inset={68} />}
                  <View style={[styles.chargeRow, { paddingVertical: spacing.md, paddingHorizontal: spacing.lg }]}>
                    <IconBadge
                      icon={into ? 'cash-refund' : 'cash-fast'}
                      variant="soft"
                      color={into ? theme.semantic.positive : theme.semantic.negative}
                      size={38}
                      iconSize={18}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText role="title" numberOfLines={1}>
                        {into ? tr.from_name : tr.to_name}
                      </AppText>
                      <AppText role="muted">{t('credit.repaidOn', { date: formatDate(tr.occurred_at) })}</AppText>
                    </View>
                    <MoneyText
                      value={into ? tr.to_amount : -(tr.from_amount + tr.fee)}
                      currency={currency}
                      colorBySign
                      signed
                      variant="titleSmall"
                    />
                  </View>
                </View>
              );
            })}
          </Card>
        )}
      </View>
    </Screen>
  );
}

function Stat({
  label,
  value,
  currency,
  tone,
}: {
  label: string;
  value: number;
  currency: string;
  tone?: 'negative';
}) {
  const theme = useTheme<AppTheme>();
  return (
    <View style={styles.stat}>
      <Eyebrow>{label}</Eyebrow>
      <MoneyText
        value={value}
        currency={currency}
        variant="titleSmall"
        style={tone === 'negative' ? { color: theme.semantic.negative } : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  heroFigure: { fontSize: 40, lineHeight: 46, letterSpacing: -0.5, marginTop: 2 },
  rule: { width: 48, height: 2, borderRadius: 1, marginVertical: 8 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 12 },
  stat: { gap: 2, flex: 1 },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1 },
  chargeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
