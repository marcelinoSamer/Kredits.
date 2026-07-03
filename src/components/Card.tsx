import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';

import type { AppTheme } from '@/theme';

type Padding = 'none' | 'lg' | 'xl';

interface Props {
  children: ReactNode;
  /** Inner padding. Use `none` for list containers whose rows own padding. */
  padding?: Padding;
  /** List mode: no padding + clip children to the rounded corners. */
  list?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * The one surface card: emerald-ink `surface`, large radius, soft `shadow.card`.
 * Replaces the surface style that used to be hand-inlined on every screen.
 */
export function Card({ children, padding = 'lg', list = false, onPress, style }: Props) {
  const theme = useTheme<AppTheme>();
  const { spacing, radius, shadow } = theme.tokens;
  const pad = list || padding === 'none' ? 0 : padding === 'xl' ? spacing.xl : spacing.lg;

  const base: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: radius.lg,
    padding: pad,
    ...(list ? { overflow: 'hidden' } : null),
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [base, shadow.card, pressed ? { opacity: 0.85 } : null, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[base, shadow.card, style]}>{children}</View>;
}
