// The launch reveal: children settle into place in order. Used once on the
// dashboard per app run; elsewhere motion answers the user's action instead.

import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { MOTION, useMotionEnabled } from './motion';

interface Props {
  children: ReactNode;
  /** Order in the sequence; each step waits ~90ms more. */
  step?: number;
  /** Set false to render instantly (e.g. after the launch reveal has played). */
  play?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Reveal({ children, step = 0, play = true, style }: Props) {
  const motion = useMotionEnabled();
  if (!play || !motion) return <Animated.View style={style}>{children}</Animated.View>;
  return (
    <Animated.View entering={FadeInDown.duration(MOTION.settle).delay(120 + step * 90)} style={style}>
      {children}
    </Animated.View>
  );
}
