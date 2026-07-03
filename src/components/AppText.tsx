import type { ReactNode } from 'react';
import { Text, useTheme } from 'react-native-paper';
import type { StyleProp, TextStyle } from 'react-native';

import type { AppTheme } from '@/theme';

type Role = 'title' | 'body' | 'muted';
type Variant =
  | 'titleLarge'
  | 'titleMedium'
  | 'titleSmall'
  | 'bodyLarge'
  | 'bodyMedium'
  | 'bodySmall'
  | 'labelLarge'
  | 'labelMedium';

interface Props {
  children: ReactNode;
  /** `title`/`body` → onSurface, `muted` → onSurfaceVariant. */
  role?: Role;
  variant?: Variant;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
}

const DEFAULT_VARIANT: Record<Role, Variant> = {
  title: 'titleSmall',
  body: 'bodyMedium',
  muted: 'bodySmall',
};

/**
 * Body/title text with a single, explicit color source. The third typography
 * role alongside `Eyebrow` (labels) and `MoneyText` (figures) — so no screen
 * hand-picks `onSurface`/`onSurfaceVariant` or leans on Paper's default.
 */
export function AppText({ children, role = 'body', variant, numberOfLines, style }: Props) {
  const theme = useTheme<AppTheme>();
  const color = role === 'muted' ? theme.colors.onSurfaceVariant : theme.colors.onSurface;
  return (
    <Text
      variant={variant ?? DEFAULT_VARIANT[role]}
      numberOfLines={numberOfLines}
      style={[{ color }, style]}
    >
      {children}
    </Text>
  );
}
