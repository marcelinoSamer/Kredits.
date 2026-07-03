import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ProgressBar, Text, useTheme } from 'react-native-paper';

import { Card } from '@/components/Card';
import { IconBadge } from '@/components/IconBadge';
import { MoneyText } from '@/components/MoneyText';
import { AppText } from '@/components/AppText';
import { Eyebrow } from '@/components/Eyebrow';
import { EmptyState } from '@/components/EmptyState';
import { getLocale, t } from '@/i18n';
import { formatMoney } from '@/money/format';
import type { CurrencyCode } from '@/money/currencies';
import { formatDate } from '@/ui/date';
import { boxPhase, boxProgress, type BoxPhase } from '@/money/boxes';
import { listBoxes, type EventBoxView } from '@/db/repositories/boxes';
import { useAsyncData } from '@/state/dataVersion';
import type { AppTheme } from '@/theme';

const DAY = 86_400_000;

function money(value: number, currency: CurrencyCode): string {
  return formatMoney(value, currency, { arabicDigits: getLocale() === 'ar' });
}

const PHASE_ORDER: BoxPhase[] = ['active', 'upcoming', 'ended', 'closed'];

const PHASE_SECTION: Record<BoxPhase, string> = {
  active: 'boxes.sectionActive',
  upcoming: 'boxes.sectionUpcoming',
  ended: 'boxes.sectionEnded',
  closed: 'boxes.sectionClosed',
};

/** The event-box list, grouped by phase. Shared by the Long Game tab and /boxes. */
export function BoxList() {
  const theme = useTheme<AppTheme>();
  const { spacing } = theme.tokens;

  const { data: boxes } = useAsyncData(() => listBoxes());

  const groups = PHASE_ORDER.map((phase) => ({
    phase,
    items: (boxes ?? []).filter((b) => boxPhase(b) === phase),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {boxes && boxes.length === 0 && <EmptyState icon="party-popper" text={t('boxes.empty')} />}
      {groups.map((g) => (
        <View key={g.phase} style={{ gap: spacing.sm }}>
          <Eyebrow>{t(PHASE_SECTION[g.phase])}</Eyebrow>
          <View style={{ gap: spacing.md }}>
            {g.items.map((b) => (
              <BoxCard key={b.id} box={b} phase={g.phase} />
            ))}
          </View>
        </View>
      ))}
    </>
  );
}

function BoxCard({ box, phase }: { box: EventBoxView; phase: BoxPhase }) {
  const theme = useTheme<AppTheme>();
  const { spacing } = theme.tokens;
  const p = boxProgress({
    budget: box.budget_amount,
    funded: box.funded,
    spent: box.spent,
    returned: box.returned,
  });

  const accent = box.color ?? theme.colors.primary;
  const over = p.remainingBudget < 0;

  // Upcoming boxes show saving progress; running/finished ones show spending.
  const showFunding = phase === 'upcoming';
  const barValue = showFunding ? p.fundedPercent : p.spentPercent;
  const barColor = showFunding ? accent : over ? theme.semantic.negative : accent;

  let statusLine: string | null = null;
  const now = Date.now();
  if (phase === 'upcoming') {
    const days = Math.max(1, Math.ceil((box.starts_at - now) / DAY));
    statusLine = days === 1 ? t('boxes.dayToGo') : t('boxes.daysToGo', { days });
  } else if (phase === 'active') {
    const days = Math.max(0, Math.ceil((box.ends_at - now) / DAY));
    statusLine = days <= 1 ? t('boxes.dayLeft') : t('boxes.daysLeft', { days });
  } else if (phase === 'ended') {
    statusLine = t('boxes.eventOverSeeReport');
  }

  return (
    <Card
      onPress={() => router.push({ pathname: '/box-detail', params: { id: box.id } })}
      style={{ gap: spacing.sm }}
    >
      <View style={styles.headRow}>
        <IconBadge icon="party-popper" color={accent} />
        <View style={styles.headBody}>
          <AppText role="title" variant="titleMedium" numberOfLines={1}>
            {box.name}
          </AppText>
          <AppText role="muted">
            {formatDate(box.starts_at)} — {formatDate(box.ends_at)}
          </AppText>
        </View>
        <MoneyText value={p.inBox} currency={box.currency} variant="titleMedium" />
      </View>

      <ProgressBar progress={Math.min(1, barValue / 100)} color={barColor} />
      <View style={styles.footRow}>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, fontVariant: ['tabular-nums'] }}
        >
          {showFunding ? t('boxes.saved') : t('boxes.spent')}:{' '}
          {money(showFunding ? p.funded : p.spent, box.currency)} / {money(p.budget, box.currency)}
        </Text>
        {statusLine && (
          <Text
            variant="bodySmall"
            style={{ color: over ? theme.semantic.negative : theme.colors.onSurfaceVariant }}
          >
            {statusLine}
          </Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headBody: { flex: 1, gap: 2 },
  footRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
});
