import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';

import type { AppTheme } from '@/theme';

/** A dashed tear-line — the perforation between a receipt's head and its body. */
export function Perforation({ color }: { color?: string }) {
  const theme = useTheme<AppTheme>();
  const c = color ?? theme.colors.outlineVariant;
  return (
    <View style={styles.row}>
      {Array.from({ length: 32 }).map((_, i) => (
        <View key={i} style={[styles.dash, { backgroundColor: c }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', overflow: 'hidden', paddingHorizontal: 4 },
  dash: { width: 5, height: 2, borderRadius: 1 },
});
