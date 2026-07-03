import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { AppTheme } from '@/theme';

type Variant = 'filled' | 'soft' | 'ghost';

interface Props {
  icon: string;
  size?: number;
  radius?: number;
  /** Accent color: the fill for `filled`, the icon tint for `soft`/`ghost`. */
  color?: string;
  /**
   * - `filled`: colored background, white glyph (categories, accounts, boxes).
   * - `soft`:   surfaceVariant background, tinted glyph (neutral actions).
   * - `ghost`:  no background, tinted glyph (inline list leading icons).
   */
  variant?: Variant;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Colored icon square. Owns the "white glyph on a colored fill vs. tinted glyph
 * on a soft/absent fill" rule that used to be copy-pasted across screens.
 */
export function IconBadge({
  icon,
  size = 42,
  radius,
  color,
  variant = 'filled',
  iconSize,
  style,
}: Props) {
  const theme = useTheme<AppTheme>();
  const r = radius ?? theme.tokens.radius.md;

  let bg: string | undefined;
  let fg: string;
  if (variant === 'filled') {
    bg = color ?? theme.colors.primary;
    fg = '#fff';
  } else if (variant === 'soft') {
    bg = theme.colors.surfaceVariant;
    fg = color ?? theme.colors.onSurfaceVariant;
  } else {
    bg = undefined;
    fg = color ?? theme.colors.onSurfaceVariant;
  }

  return (
    <View
      style={[
        { width: size, height: size, borderRadius: r, alignItems: 'center', justifyContent: 'center' },
        bg ? { backgroundColor: bg } : null,
        style,
      ]}
    >
      <MaterialCommunityIcons
        name={icon as never}
        size={iconSize ?? Math.round(size * 0.47)}
        color={fg}
      />
    </View>
  );
}
