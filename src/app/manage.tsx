import { Stack, router } from 'expo-router';
import { Platform, StyleSheet, View, Pressable } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Divider } from '@/components/Divider';
import { IconBadge } from '@/components/IconBadge';
import { AppText } from '@/components/AppText';
import { Eyebrow } from '@/components/Eyebrow';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import type { AppTheme } from '@/theme';

interface Row {
  title: string;
  description: string;
  icon: string;
  route: string;
}

interface Group {
  title: string;
  rows: Row[];
}

export default function ManageScreen() {
  const theme = useTheme<AppTheme>();
  const { spacing } = theme.tokens;
  const displayCurrency = useSettings((s) => s.displayCurrency);
  const locale = useSettings((s) => s.locale);
  const localeLabel = locale === 'ar' ? 'العربية' : 'English';

  const groups: Group[] = [
    {
      title: t('more.sectionPersonal'),
      rows: [
        {
          title: t('more.accountSettings'),
          description: `${displayCurrency} · ${localeLabel}`,
          icon: 'account-cog-outline',
          route: '/settings',
        },
        { title: t('dashboard.dailySpin'), description: t('more.spinDesc'), icon: 'ferris-wheel', route: '/wheel' },
        { title: t('dashboard.closeLedger'), description: t('dashboard.closeLedgerDesc'), icon: 'book-lock-outline', route: '/month-close' },
      ],
    },
    {
      title: t('more.sectionForecast'),
      rows: [
        { title: t('safe.title'), description: t('more.safeDesc'), icon: 'shield-check-outline', route: '/safe-to-spend' },
        { title: t('bills.title'), description: t('more.billsDesc'), icon: 'calendar-sync-outline', route: '/bills' },
        { title: t('subs.title'), description: t('more.subsDesc'), icon: 'radar', route: '/subscriptions' },
        { title: t('calendar.title'), description: t('more.calendarDesc'), icon: 'calendar-month-outline', route: '/calendar' },
        { title: t('debt.title'), description: t('more.debtDesc'), icon: 'credit-card-clock-outline', route: '/debt-plan' },
        { title: t('gold.title'), description: t('more.goldDesc'), icon: 'gold', route: '/gold' },
      ],
    },
    {
      title: t('more.sectionData'),
      rows: [
        {
          title: t('fx.title'),
          description: t('more.fxDesc'),
          icon: 'swap-horizontal',
          route: '/fx-rates',
        },
        {
          title: t('sms.title'),
          description: t('more.smsDesc'),
          icon: 'message-text-outline',
          route: '/sms',
        },
        {
          title: t('daily.title'),
          description: t('more.dailyDesc'),
          icon: 'calendar-today',
          route: '/daily-budget',
        },
        ...(Platform.OS === 'ios'
          ? [{ title: t('applepay.title'), description: t('more.applePayDesc'), icon: 'contactless-payment', route: '/applepay-setup' }]
          : []),
      ],
    },
  ];

  return (
    <Screen>
      <Stack.Screen options={{ title: t('settings.title') }} />

      <View style={[styles.offlineBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
        <MaterialCommunityIcons
          name="shield-lock-outline"
          size={16}
          color={theme.colors.onSurfaceVariant}
        />
        <AppText role="muted" variant="labelMedium">
          {t('more.offlineBadge')}
        </AppText>
      </View>

      {groups.map((group) => (
        <View key={group.title} style={styles.group}>
          <Eyebrow style={styles.groupTitle}>{group.title}</Eyebrow>
          <Card list>
            {group.rows.map((row, i) => (
              <View key={row.title}>
                {i > 0 && <Divider inset={64} />}
                <Pressable
                  onPress={() => router.push(row.route as never)}
                  style={({ pressed }) => [
                    styles.row,
                    { paddingVertical: spacing.md, paddingHorizontal: spacing.md, gap: spacing.md },
                    pressed && { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                >
                  <IconBadge icon={row.icon} variant="ghost" color={theme.colors.primary} iconSize={22} />
                  <View style={styles.rowBody}>
                    <AppText role="title">{row.title}</AppText>
                    <AppText role="muted" numberOfLines={2}>
                      {row.description}
                    </AppText>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={22}
                    color={theme.colors.onSurfaceVariant}
                  />
                </Pressable>
              </View>
            ))}
          </Card>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  group: { gap: 10 },
  groupTitle: { paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBody: { flex: 1, gap: 2 },
});
