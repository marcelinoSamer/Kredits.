import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { AppTheme } from '@/theme';

/** A little rotated stamp — the personal-brand "flex" on receipts and the Save key. */
export function Seal({ label = 'LEDGER' }: { label?: string }) {
  const theme = useTheme<AppTheme>();
  return (
    <View style={[styles.seal, { borderColor: theme.semantic.gold }]}>
      <MaterialCommunityIcons name="check-decagram-outline" size={15} color={theme.semantic.gold} />
      <Text style={[styles.text, { color: theme.semantic.gold, fontFamily: theme.tokens.font.serif.semibold }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  seal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    transform: [{ rotate: '-7deg' }],
    opacity: 0.9,
  },
  text: { fontSize: 11, letterSpacing: 1 },
});
