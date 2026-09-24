// Daily reward wheel. One spin per day, unlocked by logging a receipt today.
// Prizes are non-monetary (points, a streak shield, a badge) plus SAMPLE
// coupons that are clearly labelled as placeholders. Entirely offline.

import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Button, Chip, Text, useTheme } from 'react-native-paper';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Eyebrow } from '@/components/Eyebrow';
import { AppText } from '@/components/AppText';
import { Reveal } from '@/components/anim/Reveal';
import { t } from '@/i18n';
import { dayKey, formatDate } from '@/ui/date';
import { listActivityDays } from '@/db/repositories/transactions';
import { computeStreak } from '@/rewards/streak';
import { loadRewards, saveRewards } from '@/rewards/store';
import { applyPrize, pickPrize, PRIZES, rotationFor, spinGate, type Prize, type RewardState, type SpinGate } from '@/rewards/wheel';
import { useAsyncData, bumpData } from '@/state/dataVersion';
import type { AppTheme } from '@/theme';

const SIZE = 280;
const R = SIZE / 2;

function sectorPath(i: number, n: number): string {
  const a0 = ((i * 360) / n - 90) * (Math.PI / 180);
  const a1 = (((i + 1) * 360) / n - 90) * (Math.PI / 180);
  const x0 = R + R * Math.cos(a0);
  const y0 = R + R * Math.sin(a0);
  const x1 = R + R * Math.cos(a1);
  const y1 = R + R * Math.sin(a1);
  return `M${R},${R} L${x0},${y0} A${R},${R} 0 0,1 ${x1},${y1} Z`;
}

export function prizeLabel(p: Prize): string {
  if (p.kind === 'points') return `+${p.points}`;
  if (p.kind === 'shield') return t('wheel.shield');
  if (p.kind === 'badge') return t('wheel.badge');
  return `${p.coupon?.percent ?? 0}%`;
}

export default function WheelScreen() {
  const theme = useTheme<AppTheme>();
  const { spacing } = theme.tokens;
  const today = dayKey(Date.now());

  const { data } = useAsyncData(async () => {
    const [rewards, days] = await Promise.all([loadRewards(), listActivityDays(Date.now() - 400 * 86_400_000)]);
    const streak = computeStreak(days, today, rewards.shields);
    return { rewards, streak };
  });

  const [state, setState] = useState<RewardState | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<Prize | null>(null);
  useEffect(() => {
    if (data) setState(data.rewards);
  }, [data]);

  const rotation = useSharedValue(0);
  const wheelStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  const gate: SpinGate = state && data ? spinGate(state, today, data.streak.loggedToday) : 'logFirst';

  const landed = async (index: number) => {
    if (!state) return;
    const prize = PRIZES[index];
    const next = applyPrize(state, prize, today, Date.now());
    await saveRewards(next);
    setState(next);
    setWon(prize);
    setSpinning(false);
    bumpData();
  };

  const spin = () => {
    if (gate !== 'ready' || spinning) return;
    setSpinning(true);
    setWon(null);
    const index = pickPrize();
    const target = Math.ceil(rotation.value / 360) * 360 + rotationFor(index, PRIZES.length);
    rotation.value = withTiming(target, { duration: 3400, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(landed)(index);
    });
  };

  const fills = useMemo(
    () => [theme.semantic.gold, theme.colors.primary, theme.semantic.goldDim, theme.colors.surfaceVariant],
    [theme],
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: t('wheel.title') }} />

      <View style={styles.statRow}>
        <Chip icon="star-four-points" compact>{t('wheel.points', { n: state?.points ?? 0 })}</Chip>
        <Chip icon="shield-half-full" compact>{t('wheel.shields', { n: state?.shields ?? 0 })}</Chip>
        <Chip icon="fire" compact>{t('wheel.streak', { n: data?.streak.days ?? 0 })}</Chip>
      </View>

      <View style={styles.wheelWrap}>
        <MaterialCommunityIcons name="menu-down" size={44} color={theme.semantic.gold} style={styles.pointer} />
        <Animated.View style={wheelStyle}>
          <Svg width={SIZE} height={SIZE}>
            <G>
              {PRIZES.map((p, i) => {
                const mid = ((i + 0.5) * 360) / PRIZES.length - 90;
                const tx = R + R * 0.62 * Math.cos((mid * Math.PI) / 180);
                const ty = R + R * 0.62 * Math.sin((mid * Math.PI) / 180);
                const fill = fills[i % fills.length];
                const dark = fill === theme.semantic.gold || fill === theme.colors.primary;
                return (
                  <G key={p.id}>
                    <Path d={sectorPath(i, PRIZES.length)} fill={fill} stroke={theme.colors.background} strokeWidth={2} />
                    <SvgText
                      x={tx}
                      y={ty}
                      fill={dark ? '#0C1311' : theme.colors.onSurface}
                      fontSize={13}
                      fontWeight="700"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      transform={`rotate(${mid + 90}, ${tx}, ${ty})`}
                    >
                      {prizeLabel(p)}
                    </SvgText>
                  </G>
                );
              })}
            </G>
          </Svg>
        </Animated.View>
      </View>

      <Button mode="contained" icon="rotate-right" onPress={spin} disabled={gate !== 'ready' || spinning} loading={spinning}>
        {gate === 'ready' ? t('wheel.spin') : gate === 'spunToday' ? t('wheel.spunToday') : t('wheel.logFirst')}
      </Button>
      {gate === 'logFirst' && (
        <Button mode="text" onPress={() => router.push({ pathname: '/transaction-edit', params: { kind: 'expense' } })}>
          {t('dashboard.addExpense')}
        </Button>
      )}

      {won && (
        <Reveal>
        <Card style={{ alignItems: 'center', gap: spacing.sm }}>
          <MaterialCommunityIcons name="party-popper" size={32} color={theme.semantic.gold} />
          <AppText role="title">{t('wheel.youWon')}</AppText>
          <Text variant="headlineSmall" style={{ color: theme.semantic.gold }}>{prizeLabel(won)}</Text>
          {won.kind === 'coupon' && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              {t('wheel.sampleNote')}
            </Text>
          )}
        </Card>
        </Reveal>
      )}

      <View style={{ gap: spacing.sm }}>
        <Eyebrow>{t('wheel.coupons')}</Eyebrow>
        {state && state.coupons.length === 0 ? (
          <AppText role="muted">{t('wheel.noCoupons')}</AppText>
        ) : (
          <Card list>
            {state?.coupons.map((c) => (
              <View key={c.id} style={{ padding: spacing.lg, gap: 2 }}>
                <View style={styles.statRow}>
                  <AppText role="title">{`${c.percent}% · ${c.merchant}`}</AppText>
                  <Chip compact>{t('wheel.sample')}</Chip>
                </View>
                <AppText role="muted">{`${c.code} · ${t('wheel.expires', { date: formatDate(c.expiresAt) })}`}</AppText>
              </View>
            ))}
          </Card>
        )}
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{t('wheel.sampleNote')}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  wheelWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 28 },
  pointer: { position: 'absolute', top: -2, zIndex: 2 },
});
