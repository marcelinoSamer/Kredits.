import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { FAB, useTheme } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { SegmentTabs } from '@/components/SegmentTabs';
import { BudgetList } from '@/components/planning/BudgetList';
import { GoalList } from '@/components/planning/GoalList';
import { BoxList } from '@/components/planning/BoxList';
import { t } from '@/i18n';
import type { AppTheme } from '@/theme';

type Segment = 'budgets' | 'goals' | 'boxes';

const ADD_ROUTE: Record<Segment, string> = {
  budgets: '/budget-edit',
  goals: '/goal-edit',
  boxes: '/box-edit',
};

export default function LongGameScreen() {
  const theme = useTheme<AppTheme>();
  const [segment, setSegment] = useState<Segment>('budgets');

  return (
    <View style={styles.flex}>
      <Screen>
        <SegmentTabs
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'budgets', label: t('plan.budgets') },
            { value: 'goals', label: t('plan.goals') },
            { value: 'boxes', label: t('plan.events') },
          ]}
        />
        {segment === 'budgets' && <BudgetList />}
        {segment === 'goals' && <GoalList />}
        {segment === 'boxes' && <BoxList />}
      </Screen>
      <FAB
        icon="plus"
        color={theme.colors.onPrimary}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push(ADD_ROUTE[segment] as never)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
