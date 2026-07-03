import { StyleSheet, View } from 'react-native';
import { Stack, router, type Href } from 'expo-router';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { BottomSheet } from '@/components/anim/BottomSheet';
import { AnimatedPressable } from '@/components/anim/AnimatedPressable';
import { Card } from '@/components/Card';
import { IconBadge } from '@/components/IconBadge';
import { AppText } from '@/components/AppText';
import { Eyebrow } from '@/components/Eyebrow';
import { Divider } from '@/components/Divider';
import { t } from '@/i18n';
import type { AppTheme } from '@/theme';

interface Action {
  icon: string;
  color?: string;
  label: string;
  href: Href;
}

export default function QuickAddScreen() {
  const theme = useTheme<AppTheme>();
  const { spacing } = theme.tokens;

  // Replace the sheet with the destination so Back doesn't return here.
  const go = (href: Href) => router.replace(href);

  const money: Action[] = [
    {
      icon: 'arrow-bottom-left',
      color: theme.semantic.income,
      label: t('dashboard.addIncome'),
      href: { pathname: '/transaction-edit', params: { kind: 'income' } },
    },
    {
      icon: 'arrow-top-right',
      color: theme.semantic.expense,
      label: t('dashboard.addExpense'),
      href: { pathname: '/transaction-edit', params: { kind: 'expense' } },
    },
    {
      icon: 'swap-horizontal',
      color: theme.colors.primary,
      label: t('dashboard.transfer'),
      href: '/transfer',
    },
  ];

  const create: Action[] = [
    { icon: 'wallet', color: theme.colors.primary, label: t('accounts.addContainer'), href: '/account-edit' },
    { icon: 'gold', color: theme.semantic.gold, label: t('accounts.addAsset'), href: '/asset-edit' },
    { icon: 'chart-donut', color: theme.colors.primary, label: t('budgets.addBudget'), href: '/budget-edit' },
    { icon: 'target', color: theme.colors.primary, label: t('goals.addGoal'), href: '/goal-edit' },
    { icon: 'party-popper', color: theme.colors.primary, label: t('boxes.justThisTime'), href: '/box-edit' },
  ];

  const Section = ({ title, actions }: { title: string; actions: Action[] }) => (
    <View style={{ gap: spacing.sm }}>
      <Eyebrow>{title}</Eyebrow>
      <Card list>
        {actions.map((a, i) => (
          <View key={a.label}>
            {i > 0 && <Divider inset={68} />}
            <AnimatedPressable
              onPress={() => go(a.href)}
              scaleTo={0.97}
              style={[styles.row, { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.md }]}
            >
              <IconBadge icon={a.icon} variant="soft" color={a.color} />
              <AppText role="title" style={styles.rowLabel}>
                {a.label}
              </AppText>
              <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
            </AnimatedPressable>
          </View>
        ))}
      </Card>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'transparentModal',
          animation: 'none',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <BottomSheet onClose={() => router.back()}>
        <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.xs, gap: spacing.lg }}>
          <View style={styles.header}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
              {t('quickAdd.title')}
            </Text>
            <MaterialCommunityIcons name="cash-register" size={24} color={theme.semantic.gold} />
          </View>
          <Section title={t('quickAdd.money')} actions={money} />
          <Section title={t('quickAdd.create')} actions={create} />
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { flex: 1 },
});
