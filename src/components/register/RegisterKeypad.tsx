import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { BottomSheet } from '@/components/anim/BottomSheet';
import { AnimatedPressable } from '@/components/anim/AnimatedPressable';
import { Eyebrow } from '@/components/Eyebrow';
import { t } from '@/i18n';
import { sanitizeDecimal } from '@/ui/number';
import { currencyMeta, type CurrencyCode } from '@/money/currencies';
import type { AppTheme } from '@/theme';

type Sign = 'expense' | 'income';

interface Props {
  value: string;
  onChange: (s: string) => void;
  currency?: CurrencyCode;
  sign?: Sign;
  label?: string;
  onClose: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

/** Group the integer part with thousands separators (Hermes-safe, no Intl). */
function group(int: string): string {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** A cash-register keypad: big animated total + chunky springy keys. */
export function RegisterKeypad({ value, onChange, currency, sign, label, onClose }: Props) {
  const theme = useTheme<AppTheme>();
  const { spacing, radius, font } = theme.tokens;
  const decimals = currency ? currencyMeta(currency).decimals : 2;
  const symbol = currency ? currencyMeta(currency).symbol : '';

  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withSequence(
      withTiming(1.05, { duration: 80 }),
      withSpring(1, { damping: 12, stiffness: 300 }),
    );
  }, [value, pulse]);
  const displayStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const press = (k: string) => {
    if (k === '⌫') return onChange(value.slice(0, -1));
    if (k === '.') {
      if (value.includes('.')) return;
      return onChange((value === '' ? '0' : value) + '.');
    }
    if (value.includes('.')) {
      const frac = value.split('.')[1] ?? '';
      if (frac.length >= decimals) return;
    }
    const next = value === '0' ? k : value + k;
    onChange(sanitizeDecimal(next));
  };

  const [intPart, fracPart] = (value || '0').split('.');
  const display = fracPart !== undefined ? `${group(intPart)}.${fracPart}` : group(intPart);
  const signColor =
    sign === 'expense'
      ? theme.semantic.negative
      : sign === 'income'
        ? theme.semantic.income
        : theme.colors.onSurface;
  const signChar = sign === 'expense' ? '−' : sign === 'income' ? '+' : '';

  return (
    <BottomSheet onClose={onClose}>
      <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
        <View style={styles.totalRow}>
          <Eyebrow>{label ?? t('common.amount')}</Eyebrow>
          <MaterialCommunityIcons name="cash-register" size={18} color={theme.semantic.gold} />
        </View>

        <Animated.View style={[styles.display, displayStyle]}>
          <Text style={[styles.symbol, { color: theme.colors.onSurfaceVariant, fontFamily: font.numeric.medium }]}>
            {symbol}
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.figure, { color: signColor, fontFamily: font.numeric.semibold }]}
          >
            {signChar}
            {display}
          </Text>
        </Animated.View>
        <View style={[styles.rule, { backgroundColor: theme.semantic.gold }]} />

        <View style={styles.grid}>
          {KEYS.map((k) => (
            <AnimatedPressable
              key={k}
              scaleTo={0.9}
              onPress={() => press(k)}
              style={[styles.key, { backgroundColor: theme.colors.surfaceVariant, borderRadius: radius.lg }]}
            >
              {k === '⌫' ? (
                <MaterialCommunityIcons name="backspace-outline" size={24} color={theme.colors.onSurface} />
              ) : (
                <Text style={[styles.keyText, { color: theme.colors.onSurface, fontFamily: font.numeric.medium }]}>
                  {k}
                </Text>
              )}
            </AnimatedPressable>
          ))}
        </View>

        <AnimatedPressable
          onPress={onClose}
          scaleTo={0.97}
          style={[styles.done, { backgroundColor: theme.colors.primary, borderRadius: radius.pill }]}
        >
          <Text style={[styles.doneText, { color: theme.colors.onPrimary, fontFamily: font.sans.semibold }]}>
            {t('common.done')}
          </Text>
        </AnimatedPressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  display: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, minHeight: 56 },
  symbol: { fontSize: 22, marginBottom: 8 },
  figure: { fontSize: 48, letterSpacing: -1, flexShrink: 1, fontVariant: ['tabular-nums'] },
  rule: { height: 2, borderRadius: 1, width: 64 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  key: { flexBasis: '31%', height: 58, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 26 },
  done: { height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  doneText: { fontSize: 16, letterSpacing: 0.3 },
});
