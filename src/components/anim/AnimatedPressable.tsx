import type { ReactNode } from 'react';
import { Pressable, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const AnimatedP = Animated.createAnimatedComponent(Pressable);

const SPRING = { damping: 15, stiffness: 320, mass: 0.5 };

interface Props {
  children: ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  /** Scale at the bottom of the press. Smaller = punchier. */
  scaleTo?: number;
  hitSlop?: number;
  style?: StyleProp<ViewStyle>;
}

/** A Pressable that springs down on press — the tactile base for keys, cards, buttons. */
export function AnimatedPressable({
  children,
  onPress,
  onLongPress,
  disabled,
  scaleTo = 0.95,
  hitSlop,
  style,
}: Props) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedP
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => {
        scale.value = withSpring(scaleTo, SPRING);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING);
      }}
      style={[style, aStyle]}
    >
      {children}
    </AnimatedP>
  );
}
