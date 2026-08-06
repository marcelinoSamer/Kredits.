import { Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { AppTheme } from '@/theme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}

interface Props<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  style?: StyleProp<ViewStyle>;
}

/**
 * Underline tab row — replaces Paper's boxy outlined SegmentedButtons.
 * Each tab hugs its own label width (long labels never truncate) and sits
 * on a hairline baseline with an emerald indicator under the active tab.
 */
export function SegmentTabs<T extends string>({ value, onChange, options, style }: Props<T>) {
  const theme = useTheme<AppTheme>();
  const { spacing, font } = theme.tokens;

  return (
    <View style={[styles.row, { gap: spacing.xl, borderBottomColor: theme.colors.outlineVariant }, style]}>
      {options.map((opt) => {
        const active = opt.value === value;
        const color = active ? theme.colors.primary : theme.colors.onSurfaceVariant;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            hitSlop={8}
            style={({ pressed }) => [styles.tab, pressed && !active && { opacity: 0.6 }]}
          >
            <View style={styles.labelRow}>
              {opt.icon && <MaterialCommunityIcons name={opt.icon} size={15} color={color} />}
              <Text
                variant="titleSmall"
                style={{ color, fontFamily: active ? font.sans.semibold : font.sans.medium }}
              >
                {opt.label}
              </Text>
            </View>
            {active && <View style={[styles.indicator, { backgroundColor: theme.colors.primary }]} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', borderBottomWidth: 1 },
  tab: { paddingBottom: 10 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  indicator: { position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, borderRadius: 1 },
});
