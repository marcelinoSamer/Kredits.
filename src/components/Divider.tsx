import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';

import type { AppTheme } from '@/theme';

interface Props {
  /** Left indent (aligns the rule with row text past a leading icon). */
  inset?: number;
  /** Render a vertical hairline that stretches to the parent's height. */
  vertical?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Hairline rule in `outlineVariant`. Replaces the inline divider Views. */
export function Divider({ inset = 0, vertical = false, style }: Props) {
  const theme = useTheme<AppTheme>();
  const color = { backgroundColor: theme.colors.outlineVariant };

  if (vertical) {
    return <View style={[{ width: StyleSheet.hairlineWidth, alignSelf: 'stretch' }, color, style]} />;
  }
  return <View style={[{ height: StyleSheet.hairlineWidth, marginLeft: inset }, color, style]} />;
}
