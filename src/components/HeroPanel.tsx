// The one loud surface: a layered glass panel with an emerald hairline, a
// top-lit inner gradient and a faint diagonal gold grain. Everything else in
// the app stays flat so this reads as the instrument.

import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from 'react-native-paper';

import type { AppTheme } from '@/theme';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function HeroPanel({ children, style }: Props) {
  const theme = useTheme<AppTheme>();
  const { radius, spacing, shadow } = theme.tokens;
  return (
    <View
      style={[
        styles.panel,
        { borderRadius: radius.xl, backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
        shadow.hero,
        style,
      ]}
    >
      <LinearGradient
        colors={[theme.colors.primaryContainer, 'transparent'] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.4, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.55 }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', theme.semantic.goldDim, 'transparent'] as const}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        locations={[0.55, 0.75, 0.95]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={{ padding: spacing.xl, gap: spacing.sm }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
});
