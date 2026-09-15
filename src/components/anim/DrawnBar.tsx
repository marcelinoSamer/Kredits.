// A progress line that draws itself from zero — the same stroke used for the
// gold hairline under net worth and for budget / goal / box progress.

import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { MOTION, useMotionEnabled } from './motion';
import type { AppTheme } from '@/theme';

interface Props {
  /** 0..1 */
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function DrawnBar({ progress, color, trackColor, height = 6, style }: Props) {
  const theme = useTheme<AppTheme>();
  const motion = useMotionEnabled();
  const w = useSharedValue(0);
  const target = Math.max(0, Math.min(1, progress)) * 100;

  useEffect(() => {
    w.value = motion ? withTiming(target, { duration: MOTION.settle, easing: MOTION.easeOut }) : target;
  }, [target, motion, w]);

  const fill = useAnimatedStyle(() => ({ width: `${w.value}%` }));

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: trackColor ?? theme.colors.surfaceVariant },
        style,
      ]}
    >
      <Animated.View style={[styles.fill, { borderRadius: height / 2, backgroundColor: color ?? theme.colors.primary }, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
});
