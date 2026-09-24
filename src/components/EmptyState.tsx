import { StyleSheet, View } from 'react-native';
import { Button, useTheme } from 'react-native-paper';

import { AppText } from './AppText';
import { IconBadge } from './IconBadge';
import type { AppTheme } from '@/theme';

interface Props {
  icon: string;
  text: string;
  /** An empty screen is an invitation: give it the next action. */
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, text, actionLabel, onAction }: Props) {
  const theme = useTheme<AppTheme>();
  const { spacing, radius } = theme.tokens;
  return (
    <View style={[styles.container, { paddingVertical: spacing.xxxl, gap: spacing.lg }]}>
      <IconBadge icon={icon} variant="soft" size={76} radius={radius.pill} iconSize={34} />
      <AppText role="muted" variant="bodyMedium" style={styles.text}>
        {text}
      </AppText>
      {actionLabel && onAction ? (
        <Button mode="contained-tonal" icon="plus" onPress={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  text: { textAlign: 'center', maxWidth: 280 },
});
