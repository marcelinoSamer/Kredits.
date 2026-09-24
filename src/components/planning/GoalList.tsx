import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { DrawnBar } from '@/components/anim/DrawnBar';

import { Card } from '@/components/Card';
import { AppText } from '@/components/AppText';
import { MoneyText } from '@/components/MoneyText';
import { EmptyState } from '@/components/EmptyState';
import { t } from '@/i18n';
import { buildRateLookup, convert } from '@/money/fx';
import { goalProgress } from '@/money/planning';
import { addMonths, formatDate, monthRange } from '@/ui/date';
import { listGoals } from '@/db/repositories/goals';
import { listAccountsWithBalances } from '@/db/repositories/accounts';
import { listRates } from '@/db/repositories/fxRates';
import { sumByKindCurrency } from '@/db/repositories/transactions';
import { useAsyncData } from '@/state/dataVersion';
import { useSettings } from '@/state/settings';
import type { AppTheme } from '@/theme';

/** The goal cards. Rendered both by the Long Game tab and the /goals route. */
export function GoalList() {
  const theme = useTheme<AppTheme>();
  const display = useSettings((s) => s.displayCurrency);

  const { data } = useAsyncData(async () => {
    const [goals, accounts, rates] = await Promise.all([
      listGoals(),
      listAccountsWithBalances(),
      listRates(),
    ]);
    const lookup = buildRateLookup(rates);

    // Average monthly savings over the last 3 months, in the display currency.
    let net3 = 0;
    for (let i = 0; i < 3; i++) {
      const r = monthRange(addMonths(Date.now(), -i));
      const sums = await sumByKindCurrency(r.from, r.to);
      for (const s of sums) {
        const c = convert(s.total, s.currency, display, lookup, display);
        if (c.value == null) continue;
        net3 += s.kind === 'income' ? c.value : -c.value;
      }
    }
    const avgMonthlyDisplay = net3 / 3;

    return goals.map((g) => {
      const acc = g.linked_account_id ? accounts.find((a) => a.id === g.linked_account_id) : null;
      const saved = acc
        ? convert(acc.balance, acc.currency, g.currency, lookup, g.currency).value ?? 0
        : 0;
      const avgMonthlySaving =
        convert(avgMonthlyDisplay, display, g.currency, lookup, g.currency).value ?? 0;
      const progress = goalProgress(saved, g.target_amount, {
        targetDate: g.target_date,
        avgMonthlySaving: avgMonthlySaving > 0 ? avgMonthlySaving : undefined,
      });
      return { goal: g, progress };
    });
  }, [display]);

  if (!data || data.length === 0) {
    return <EmptyState icon="target" text={t('goals.empty')} actionLabel={t('goals.addGoal')} onAction={() => router.push('/goal-edit')} />;
  }

  return (
    <>
      {data.map(({ goal, progress }) => (
        <Card
          key={goal.id}
          onPress={() => router.push({ pathname: '/goal-edit', params: { id: goal.id } })}
          style={{ gap: 6 }}
        >
          <View style={styles.row}>
            <AppText role="title" variant="titleMedium">
              {goal.name}
            </AppText>
            <AppText role="muted" variant="bodySmall">
              {Math.round(progress.percent)}%
            </AppText>
          </View>
          <DrawnBar
            progress={Math.min(1, progress.percent / 100)}
            color={progress.reached ? theme.semantic.positive : theme.colors.primary}
          />
          <View style={styles.row}>
            <MoneyText value={progress.saved} currency={goal.currency} variant="bodyMedium" />
            <AppText role="muted">
              / <MoneyText value={goal.target_amount} currency={goal.currency} variant="bodyMedium" />
            </AppText>
          </View>
          {progress.reached ? (
            <AppText style={{ color: theme.semantic.positive }}>{t('goals.reached')}</AppText>
          ) : (
            <>
              {goal.target_date != null && progress.monthlyNeeded != null && (
                <AppText role="muted" variant="bodySmall">
                  {t('goals.targetDate')}: {formatDate(goal.target_date)} ·{' '}
                  {t('goals.perMonth', { amount: Math.round(progress.monthlyNeeded) })}
                </AppText>
              )}
              {progress.etaMonths != null && (
                <AppText role="muted" variant="bodySmall">
                  {t('goals.etaMonths', { months: progress.etaMonths })}
                </AppText>
              )}
            </>
          )}
        </Card>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
