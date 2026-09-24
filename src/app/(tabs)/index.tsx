// Home: one figure, one action, the latest receipts. Everything else lives one
// tap away (Pockets tab for net worth, Manage for plans and forecasts).

import { useEffect, useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MoneyText } from '@/components/MoneyText';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Divider } from '@/components/Divider';
import { TransactionRow } from '@/components/TransactionRow';
import { EmptyState } from '@/components/EmptyState';
import { DrawnBar } from '@/components/anim/DrawnBar';
import { Reveal } from '@/components/anim/Reveal';
import { consumeLaunchReveal } from '@/components/anim/motion';
import { t } from '@/i18n';
import { convert, sumInCurrency } from '@/money/fx';
import { formatMoney } from '@/money/format';
import { dailyBudgetStatus } from '@/money/dailyBudget';
import { dayKey, endOfDay, startOfDay } from '@/ui/date';
import { categorizeUnfiled, listActivityDays, sumByKindCurrency, listTransactions } from '@/db/repositories/transactions';
import { expenseByCategory, expenseByDay } from '@/db/repositories/stats';
import { categoryLabel } from '@/ui/labels';
import { monthRange } from '@/ui/date';
import { postDueRules } from '@/db/repositories/recurring';
import { loadDailyBudget } from '@/state/dailyBudget';
import { usePortfolio } from '@/state/portfolio';
import { useAsyncData, bumpData } from '@/state/dataVersion';
import { useSettings } from '@/state/settings';
import { useHints } from '@/state/hints';
import { checkBudgetsAndNotify } from '@/notifications/budgets';
import { scheduleDailyNudges } from '@/notifications/daily';
import { scheduleBillReminders } from '@/notifications/bills';
import { computeStreak } from '@/rewards/streak';
import { loadRewards } from '@/rewards/store';
import { spinGate } from '@/rewards/wheel';
import { getCaptureStatus, scheduleCaptureReminders } from '@/capture/status';
import { Platform } from 'react-native';
import { Button } from 'react-native-paper';
import type { AppTheme } from '@/theme';

export default function DashboardScreen() {
  const theme = useTheme<AppTheme>();
  const { spacing } = theme.tokens;
  const insets = useSafeAreaInsets();
  const { data: pf, loading, reload } = usePortfolio();
  const nudgesEnabled = useSettings((s) => s.nudgesEnabled);
  const setSpinReady = useHints((s) => s.setSpinReady);
  const play = useMemo(() => consumeLaunchReveal(), []);

  const { data } = useAsyncData(async () => {
    const now = Date.now();
    const today = dayKey(now);
    const daily = await loadDailyBudget();
    // File any receipt the classifier can name before we rank the month.
    await categorizeUnfiled().catch(() => 0);
    const range = monthRange(now);
    const [todaySums, recent, days, rewards, dayRows, cats] = await Promise.all([
      sumByKindCurrency(startOfDay(now), endOfDay(now)),
      listTransactions({ limit: 8 }),
      listActivityDays(now - 400 * 86_400_000),
      loadRewards(),
      daily ? expenseByDay(daily.startDay, endOfDay(now)) : Promise.resolve([]),
      expenseByCategory(range.from, range.to),
    ]);
    const streak = computeStreak(days, today, rewards.shields);
    const capture = await getCaptureStatus();
    return { todaySums, recent, daily, dayRows, cats, capture, gate: spinGate(rewards, today, streak.loggedToday) };
  });

  const display = pf?.display ?? 'EGP';
  const spentToday = pf && data
    ? sumInCurrency(data.todaySums.filter((s) => s.kind === 'expense').map((s) => ({ amount: s.total, currency: s.currency })), display, pf.lookup).total
    : 0;

  const status = useMemo(() => {
    if (!pf || !data?.daily) return null;
    const byDay = new Map<number, number>();
    for (const r of data.dayRows) {
      const v = convert(r.total, r.currency, display, pf.lookup, display).value ?? 0;
      byDay.set(r.day, (byDay.get(r.day) ?? 0) + v);
    }
    return dailyBudgetStatus(data.daily, byDay, dayKey(Date.now()));
  }, [pf, data, display]);

  // Ranked spending this month, unknown merchants pooled into "Other".
  const ranked = useMemo(() => {
    if (!pf || !data) return [];
    const map = new Map<string, { label: string; color: string | null; icon: string | null; total: number }>();
    for (const r of data.cats) {
      const v = convert(r.total, r.currency, display, pf.lookup, display).value ?? 0;
      const key = r.category_id ?? 'other';
      const cur = map.get(key) ?? {
        label: r.category_id ? categoryLabel({ id: r.category_id, name: r.category_name ?? '' }) : t('dashboard.other'),
        color: r.category_color,
        icon: r.category_icon,
        total: 0,
      };
      cur.total += v;
      map.set(key, cur);
    }
    const list = [...map.values()].sort((a, b) => b.total - a.total);
    const total = list.reduce((s, x) => s + x.total, 0);
    return list.map((x) => ({ ...x, share: total > 0 ? x.total / total : 0 }));
  }, [pf, data, display]);

  // Background upkeep: post due bills, check budgets, re-arm local reminders.
  useEffect(() => {
    postDueRules().then((n) => n > 0 && bumpData()).catch(() => {}).finally(() => checkBudgetsAndNotify().catch(() => {}));
  }, []);
  useEffect(() => {
    scheduleBillReminders().catch(() => {});
    if (nudgesEnabled) scheduleDailyNudges().catch(() => {});
  }, [data, nudgesEnabled]);
  useEffect(() => {
    setSpinReady(data?.gate === 'ready');
  }, [data?.gate, setSpinReady]);

  // Nag until automatic capture is on (iOS only; one repeating local reminder).
  const needsCapture = Platform.OS === 'ios' && !!data?.capture && !data.capture.setupDone && !data.capture.verifiedAt;
  useEffect(() => {
    if (needsCapture && !data?.capture.remindersOff) scheduleCaptureReminders().catch(() => {});
  }, [needsCapture, data?.capture.remindersOff]);

  const empty = pf && pf.accounts.length === 0;
  const over = status ? status.left < 0 : false;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: 132, paddingHorizontal: spacing.xl, gap: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={!!loading} onRefresh={reload} tintColor={theme.colors.primary} />}
      >
        <View style={styles.topRow}>
          <Text style={[styles.mark, { fontFamily: theme.tokens.font.serif.semibold, color: theme.colors.onSurface }]}>
            K<Text style={{ color: theme.semantic.gold }}>.</Text>
          </Text>
          <Pressable onPress={() => router.push('/manage')} hitSlop={10} style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}>
            <MaterialCommunityIcons name="cog-outline" size={24} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        </View>

        {needsCapture && (
          <Reveal play={play}>
            <Card style={{ gap: spacing.sm, borderWidth: 1, borderColor: theme.semantic.gold }}>
              <View style={[styles.topRow, { gap: 10, justifyContent: 'flex-start' }]}>
                <MaterialCommunityIcons name="contactless-payment" size={22} color={theme.semantic.gold} />
                <AppText role="title">{t('applepay.nagTitle')}</AppText>
              </View>
              <AppText role="muted" variant="bodySmall">{t('applepay.nagBody')}</AppText>
              <Button mode="contained" onPress={() => router.push('/applepay-setup')}>{t('applepay.nagAction')}</Button>
            </Card>
          </Reveal>
        )}

        {empty ? (
          <Reveal play={play}>
            <EmptyState icon="treasure-chest" text={t('dashboard.emptyHint')} actionLabel={t('accounts.addContainer')} onAction={() => router.push('/account-edit')} />
          </Reveal>
        ) : (
          <Reveal play={play}>
            <Pressable onPress={() => router.push('/daily-budget')} style={{ gap: spacing.sm }}>
              <AppText role="muted">{status ? (over ? t('dashboard.overToday') : t('dashboard.leftToday')) : t('dashboard.spentToday')}</AppText>
              <MoneyText
                value={status ? Math.abs(status.left) : spentToday}
                currency={display}
                variant="displaySmall"
                animate
                fromZero={play}
                style={[styles.hero, { color: over ? theme.semantic.expense : theme.colors.onSurface }]}
              />
              {status ? (
                <>
                  <DrawnBar progress={status.used} color={over ? theme.semantic.expense : theme.semantic.gold} trackColor={theme.semantic.goldDim} height={4} />
                  <AppText role="muted" variant="bodySmall">
                    {over
                      ? t('dashboard.overOf', { amount: formatMoney(status.allowance, display) })
                      : t('dashboard.remainingOf', { amount: formatMoney(status.allowance, display) })}
                  </AppText>
                </>
              ) : (
                <AppText variant="bodySmall" style={{ color: theme.colors.primary }}>{t('dashboard.setDaily')}</AppText>
              )}
            </Pressable>
          </Reveal>
        )}

        {ranked.length > 0 && (
          <Reveal play={play} step={1} style={{ gap: spacing.sm }}>
            <View style={styles.topRow}>
              <AppText role="muted">{t('dashboard.byCategory')}</AppText>
              <Pressable onPress={() => router.push('/(tabs)/analytics')} hitSlop={8}>
                <AppText variant="labelMedium" style={{ color: theme.colors.primary }}>{t('dashboard.seeAll')}</AppText>
              </Pressable>
            </View>
            <Card style={{ gap: spacing.md }}>
              {ranked.slice(0, 6).map((r) => (
                <View key={r.label} style={{ gap: 6 }}>
                  <View style={styles.topRow}>
                    <View style={[styles.topRow, { gap: 8 }]}>
                      <MaterialCommunityIcons name={(r.icon ?? 'dots-horizontal') as never} size={16} color={r.color ?? theme.colors.onSurfaceVariant} />
                      <AppText>{r.label}</AppText>
                    </View>
                    <View style={[styles.topRow, { gap: 8 }]}>
                      <MoneyText value={r.total} currency={display} variant="bodySmall" muted />
                      <Text style={[styles.pct, { fontFamily: theme.tokens.font.numeric.semibold, color: theme.colors.onSurface }]}>
                        {`${Math.round(r.share * 100)}%`}
                      </Text>
                    </View>
                  </View>
                  <DrawnBar progress={r.share} color={r.color ?? theme.colors.outline} height={5} />
                </View>
              ))}
            </Card>
          </Reveal>
        )}

        {data && data.recent.length > 0 && (
          <Reveal play={play} step={2} style={{ gap: spacing.sm }}>
            <View style={styles.topRow}>
              <AppText role="muted">{t('dashboard.recent')}</AppText>
              <Pressable onPress={() => router.push('/(tabs)/transactions')} hitSlop={8}>
                <AppText variant="labelMedium" style={{ color: theme.colors.primary }}>{t('dashboard.seeAll')}</AppText>
              </Pressable>
            </View>
            <Card list>
              {data.recent.map((tx, i) => (
                <View key={tx.id}>
                  {i > 0 && <Divider inset={76} />}
                  <TransactionRow tx={tx} onPress={() => router.push({ pathname: '/transaction-edit', params: { id: tx.id } })} />
                </View>
              ))}
            </Card>
          </Reveal>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mark: { fontSize: 28, lineHeight: 32, letterSpacing: -0.5 },
  hero: { fontSize: 56, lineHeight: 62, letterSpacing: -1 },
  pct: { fontSize: 17, minWidth: 44, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
