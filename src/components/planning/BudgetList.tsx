import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { DrawnBar } from '@/components/anim/DrawnBar';

import { Card } from '@/components/Card';
import { AppText } from '@/components/AppText';
import { MoneyText } from '@/components/MoneyText';
import { EmptyState } from '@/components/EmptyState';
import { t } from '@/i18n';
import { buildRateLookup } from '@/money/fx';
import { computeBudgetStatuses } from '@/money/budgets';
import { categoryLabel } from '@/ui/labels';
import { monthRange } from '@/ui/date';
import { listBudgets } from '@/db/repositories/budgets';
import { expenseByCategory } from '@/db/repositories/stats';
import { listRates } from '@/db/repositories/fxRates';
import { useAsyncData } from '@/state/dataVersion';
import type { AppTheme } from '@/theme';

/** The budget cards. Rendered both by the Long Game tab and the /budgets route. */
export function BudgetList() {
  const theme = useTheme<AppTheme>();

  const { data } = useAsyncData(async () => {
    const range = monthRange();
    const [budgets, rows, rates] = await Promise.all([
      listBudgets(),
      expenseByCategory(range.from, range.to),
      listRates(),
    ]);
    const lookup = buildRateLookup(rates);
    return computeBudgetStatuses(budgets, rows, lookup);
  });

  if (!data || data.length === 0) {
    return <EmptyState icon="chart-donut" text={t('budgets.empty')} actionLabel={t('budgets.addBudget')} onAction={() => router.push('/budget-edit')} />;
  }

  return (
    <>
      {data.map((st) => {
        const name = st.budget.category_id
          ? categoryLabel({ id: st.budget.category_id, name: st.budget.category_name ?? '' })
          : t('budgets.overall');
        const remaining = st.budget.limit_amount - st.spent;
        const color = st.over ? theme.semantic.expense : theme.colors.primary;
        return (
          <Card
            key={st.budget.id}
            onPress={() => router.push({ pathname: '/budget-edit', params: { id: st.budget.id } })}
            style={{ gap: 6 }}
          >
            <View style={styles.row}>
              <AppText role="title" variant="titleMedium">
                {name}
              </AppText>
              <AppText role="muted" variant="bodySmall">
                {Math.round(st.percent)}%
              </AppText>
            </View>
            <DrawnBar progress={Math.min(1, st.percent / 100)} color={color} />
            <View style={styles.row}>
              <MoneyText value={st.spent} currency={st.budget.currency} variant="bodyMedium" />
              <AppText role="muted">/ {st.budget.limit_amount}</AppText>
            </View>
            <AppText
              variant="bodySmall"
              style={{ color: st.over ? theme.semantic.expense : theme.colors.onSurfaceVariant }}
            >
              {st.over ? t('budgets.overBudget') : `${t('budgets.remaining')}: `}
              {!st.over && (
                <MoneyText value={remaining} currency={st.budget.currency} variant="bodySmall" />
              )}
            </AppText>
          </Card>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
