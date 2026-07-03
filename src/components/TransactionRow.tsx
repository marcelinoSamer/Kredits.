import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';

import { MoneyText } from './MoneyText';
import { AppText } from './AppText';
import { IconBadge } from './IconBadge';
import { categoryLabel } from '@/ui/labels';
import { formatDate } from '@/ui/date';
import { t } from '@/i18n';
import type { TransactionView } from '@/db/repositories/transactions';
import type { AppTheme } from '@/theme';

interface Props {
  tx: TransactionView;
  onPress?: () => void;
}

export function TransactionRow({ tx, onPress }: Props) {
  const theme = useTheme<AppTheme>();
  const { spacing } = theme.tokens;
  const isExpense = tx.kind === 'expense';

  const title =
    tx.merchant ||
    (tx.category_id ? categoryLabel({ id: tx.category_id, name: tx.category_name ?? '' }) : '') ||
    t(isExpense ? 'tx.expense' : 'tx.income');

  const catName = tx.category_id
    ? categoryLabel({ id: tx.category_id, name: tx.category_name ?? '' })
    : null;
  const meta = [catName, tx.account_name, formatDate(tx.occurred_at)].filter(Boolean).join('  ·  ');

  const icon = tx.category_icon || (isExpense ? 'arrow-top-right' : 'arrow-bottom-left');
  const semanticTint = isExpense ? theme.semantic.negative : theme.semantic.positive;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.md },
        pressed && { backgroundColor: theme.colors.surfaceVariant },
      ]}
    >
      {tx.category_color ? (
        <IconBadge icon={icon} color={tx.category_color} />
      ) : (
        <IconBadge icon={icon} variant="soft" color={semanticTint} />
      )}
      <View style={styles.body}>
        <AppText role="title" numberOfLines={1}>
          {title}
        </AppText>
        {!!meta && (
          <AppText role="muted" numberOfLines={1}>
            {meta}
          </AppText>
        )}
      </View>
      <MoneyText
        value={isExpense ? -tx.amount : tx.amount}
        currency={tx.currency}
        colorBySign
        signed
        variant="titleSmall"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  body: { flex: 1, gap: 2 },
});
