import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';

import { AppText } from './AppText';
import { IconBadge } from './IconBadge';
import type { AppTheme } from '@/theme';

interface Props {
  icon: string;
  text: string;
}

export function EmptyState({ icon, text }: Props) {
  const theme = useTheme<AppTheme>();
  const { spacing, radius } = theme.tokens;
  return (
    <View style={[styles.container, { paddingVertical: spacing.xxxl, gap: spacing.lg }]}>
      <IconBadge icon={icon} variant="soft" size={76} radius={radius.pill} iconSize={34} />
      <AppText role="muted" variant="bodyMedium" style={styles.text}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  text: { textAlign: 'center', maxWidth: 280 },
});
