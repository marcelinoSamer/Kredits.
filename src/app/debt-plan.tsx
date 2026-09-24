// Debt payoff planner for credit Pockets: snowball or avalanche.

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { SegmentedButtons, Text, useTheme } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { HeroPanel } from '@/components/HeroPanel';
import { Eyebrow } from '@/components/Eyebrow';
import { AppText } from '@/components/AppText';
import { MoneyText } from '@/components/MoneyText';
import { AmountInput } from '@/components/AmountInput';
import { DrawnBar } from '@/components/anim/DrawnBar';
import { EmptyState } from '@/components/EmptyState';
import { t } from '@/i18n';
import { parseAmount } from '@/ui/number';
import { addMonths, monthLabel } from '@/ui/date';
import { convert } from '@/money/fx';
import { payoffPlan, type Debt, type Strategy } from '@/money/debt';
import { getSetting, setSetting } from '@/db/repositories/settings';
import { usePortfolio } from '@/state/portfolio';
import type { AppTheme } from '@/theme';

const BUDGET_KEY = 'debt_monthly_budget';

export default function DebtPlanScreen() {
  const theme = useTheme<AppTheme>();
  const { spacing } = theme.tokens;
  const { data: pf } = usePortfolio();
  const [strategy, setStrategy] = useState<Strategy>('avalanche');
  const [budget, setBudget] = useState('');

  useEffect(() => {
    getSetting(BUDGET_KEY).then((v) => v && setBudget(v));
  }, []);
  useEffect(() => {
    if (budget) setSetting(BUDGET_KEY, budget).catch(() => {});
  }, [budget]);

  const display = pf?.display ?? 'EGP';
  const debts: Debt[] = (pf?.accounts ?? [])
    .filter((a) => a.type === 'credit' && a.balance < -0.005)
    .map((a) => {
      const owed = convert(-a.balance, a.currency, display, pf!.lookup, display).value ?? 0;
      return { id: a.id, name: a.name, balance: owed, apr: a.apr ?? 0, minPayment: Math.max(owed * 0.05, Math.min(owed, 100)) };
    });
  const monthly = parseAmount(budget);
  const plan = payoffPlan(debts, monthly, strategy);
  const totalOwed = debts.reduce((s, d) => s + d.balance, 0);
  const minTotal = debts.reduce((s, d) => s + Math.min(d.minPayment, d.balance), 0);

  return (
    <Screen>
      <Stack.Screen options={{ title: t('debt.title') }} />
      {debts.length === 0 ? (
        <EmptyState icon="credit-card-check-outline" text={t('debt.empty')} actionLabel={t('accounts.addCredit')} onAction={() => router.push({ pathname: '/account-edit', params: { type: 'credit' } })} />
      ) : (
        <>
          <HeroPanel>
            <Eyebrow>{t('debt.owed')}</Eyebrow>
            <MoneyText value={totalOwed} currency={display} variant="displaySmall" animate fromZero style={{ color: theme.semantic.expense }} />
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              <AmountInput label={t('debt.monthlyBudget')} value={budget} onChangeText={setBudget} currency={display} />
              <AppText role="muted" variant="bodySmall">{t('debt.minimums', { amount: Math.round(minTotal).toLocaleString() })}</AppText>
              <SegmentedButtons
                value={strategy}
                onValueChange={(v) => setStrategy(v as Strategy)}
                buttons={[
                  { value: 'avalanche', label: t('debt.avalanche'), icon: 'fire' },
                  { value: 'snowball', label: t('debt.snowball'), icon: 'snowflake' },
                ]}
              />
              <AppText role="muted" variant="bodySmall">{strategy === 'avalanche' ? t('debt.avalancheDesc') : t('debt.snowballDesc')}</AppText>
            </View>
          </HeroPanel>

          {monthly > 0 && (
            <Card style={{ gap: spacing.sm }}>
              {plan.insufficient ? (
                <Text style={{ color: theme.semantic.negative }}>{t('debt.insufficient')}</Text>
              ) : (
                <>
                  <View style={styles.split}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Eyebrow>{t('debt.debtFree')}</Eyebrow>
                      <AppText role="title">{monthLabel(addMonths(Date.now(), plan.months))}</AppText>
                      <AppText role="muted" variant="bodySmall">{t('debt.inMonths', { n: plan.months })}</AppText>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Eyebrow>{t('debt.interest')}</Eyebrow>
                      <MoneyText value={plan.totalInterest} currency={display} variant="titleMedium" animate />
                    </View>
                  </View>
                </>
              )}
            </Card>
          )}

          <View style={{ gap: spacing.sm }}>
            <Eyebrow>{t('debt.order')}</Eyebrow>
            {plan.order.map((id, i) => {
              const d = debts.find((x) => x.id === id)!;
              const cleared = plan.clearedAt[id];
              return (
                <Card key={id} style={{ gap: spacing.sm }}>
                  <View style={styles.split}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <AppText role="title">{`${i + 1}. ${d.name}`}</AppText>
                      <AppText role="muted" variant="bodySmall">{t('debt.aprLine', { apr: d.apr })}</AppText>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <MoneyText value={d.balance} currency={display} variant="titleSmall" />
                      {cleared && <AppText role="muted" variant="bodySmall">{t('debt.clearedIn', { month: monthLabel(addMonths(Date.now(), cleared)) })}</AppText>}
                    </View>
                  </View>
                  <DrawnBar progress={cleared ? 1 - cleared / Math.max(1, plan.months) : 0} color={theme.semantic.expense} />
                </Card>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  split: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
});
