import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';

import type { AppTheme } from '@/theme';

interface Props {
  children: ReactNode;
  /** Called once the exit animation finishes (usually router.back). */
  onClose: () => void;
  contentStyle?: StyleProp<ViewStyle>;
}

const IN_SPRING = { damping: 20, stiffness: 220, mass: 0.7 };

/**
 * An animated bottom sheet: a scrim that fades in, a panel that springs up from
 * the bottom (bubble), and a drag-down / tap-scrim dismissal. Reused by the
 * universal Add sheet and the register keypad.
 */
export function BottomSheet({ children, onClose, contentStyle }: Props) {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0); // 0 = hidden below, 1 = resting
  const sheetH = useSharedValue(600);
  const dragY = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(1, IN_SPRING);
  }, [progress]);

  const close = () => {
    progress.value = withTiming(0, { duration: 190 }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      dragY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 900) {
        runOnJS(close)();
      } else {
        dragY.value = withSpring(0, IN_SPRING);
      }
    });

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value * 0.55 }));
  const panelStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * sheetH.value + dragY.value },
      { scale: 0.96 + progress.value * 0.04 },
    ],
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim }, scrimStyle]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View
          onLayout={(e) => {
            sheetH.value = e.nativeEvent.layout.height;
          }}
          style={[
            styles.panel,
            {
              backgroundColor: theme.colors.surface,
              paddingBottom: insets.bottom + theme.tokens.spacing.md,
              ...theme.tokens.shadow.hero,
            },
            panelStyle,
            contentStyle,
          ]}
        >
          <View style={[styles.grab, { backgroundColor: theme.colors.outlineVariant }]} />
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
  },
  grab: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
});
