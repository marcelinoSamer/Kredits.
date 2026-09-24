import { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Easing, StyleSheet, View, useWindowDimensions, type ColorValue } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { t } from '@/i18n';
import { useHints } from '@/state/hints';
import { useMotionEnabled } from '@/components/anim/motion';
import { tokens, type AppTheme } from '@/theme';

export default function TabsLayout() {
  const theme = useTheme<AppTheme>();
  const { width } = useWindowDimensions();

  // Every destination is labelled; the active one sits in a gold ingot.
  const renderIcon =
    (name: string) =>
    ({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) => (
      <View style={[styles.ingot, focused && { backgroundColor: theme.semantic.goldDim }]}>
        <MaterialCommunityIcons name={name as never} color={color as string} size={size - 2} />
      </View>
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: tokens.font.serif.semibold, fontSize: 22, color: theme.colors.onSurface },
        sceneStyle: { backgroundColor: theme.colors.background },
        transitionSpec: { animation: 'timing', config: { duration: 260, easing: Easing.inOut(Easing.cubic) } },
        sceneStyleInterpolator: ({ current }: any) => ({
          sceneStyle: {
            transform: [{ translateX: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [-width, 0, width] }) }],
          },
        }),
        tabBarActiveTintColor: theme.semantic.gold,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        // A floating dock: the one navigation surface, always reachable, never hidden.
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 14,
          height: 72,
          borderRadius: 28,
          borderTopWidth: 0,
          paddingBottom: 0,
          backgroundColor: theme.colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.outlineVariant,
          ...tokens.shadow.hero,
        },
        tabBarItemStyle: { paddingTop: 8 },
        tabBarLabelStyle: { fontFamily: tokens.font.sans.medium, fontSize: 11, letterSpacing: 0.2 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.dashboard'), headerShown: false, tabBarIcon: renderIcon('view-dashboard-outline') }} />
      <Tabs.Screen name="transactions" options={{ title: t('tabs.transactions'), tabBarIcon: renderIcon('receipt-text-outline') }} />
      <Tabs.Screen
        name="add"
        options={{ title: '', tabBarIcon: () => <Coin />, tabBarLabel: () => null }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/quick-add');
          },
        }}
      />
      <Tabs.Screen name="longgame" options={{ title: t('tabs.longGame'), tabBarIcon: renderIcon('flag-checkered') }} />
      <Tabs.Screen name="accounts" options={{ title: t('tabs.accounts'), tabBarIcon: renderIcon('treasure-chest') }} />
      <Tabs.Screen name="analytics" options={{ href: null, title: t('tabs.analytics') }} />
    </Tabs>
  );
}

/** The raised gold coin — the one place to create anything. Pulses only when a spin is ready. */
function Coin() {
  const theme = useTheme<AppTheme>();
  const spinReady = useHints((s) => s.spinReady);
  const motion = useMotionEnabled();
  const halo = useSharedValue(0);

  useEffect(() => {
    if (spinReady && motion) {
      halo.value = withRepeat(withSequence(withTiming(1, { duration: 1100 }), withTiming(0, { duration: 0 })), -1, false);
    } else {
      cancelAnimation(halo);
      halo.value = 0;
    }
  }, [spinReady, motion, halo]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - halo.value),
    transform: [{ scale: 1 + halo.value * 0.7 }],
  }));

  return (
    <View style={styles.coinWrap}>
      <Animated.View pointerEvents="none" style={[styles.halo, { backgroundColor: theme.semantic.gold }, haloStyle]} />
      <View style={[styles.coin, { backgroundColor: theme.semantic.gold }]}>
        <MaterialCommunityIcons name="plus" color="#1A1205" size={28} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ingot: { minWidth: 44, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: tokens.radius.pill },
  coinWrap: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: -22 },
  halo: { position: 'absolute', width: 56, height: 56, borderRadius: 28 },
  coin: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...tokens.shadow.card },
});
