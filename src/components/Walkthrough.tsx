// First-run tutorial. Shown exactly once per install (persisted flag), as a
// full-screen overlay before the tabs mount. Five pages: what Kredits is, how
// money is organised, how to get around (a live replica of the dock), the daily
// rhythm, and a final page that hands off into creating the first Pocket.

import { useCallback, useMemo, useState } from 'react';
import { I18nManager, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AppText } from './AppText';
import { Eyebrow } from './Eyebrow';
import { PrivacyPolicy } from './PrivacyPolicy';
import { MoneyText } from './MoneyText';
import { DrawnBar } from './anim/DrawnBar';
import { t } from '@/i18n';
import type { AppTheme } from '@/theme';

/** Dev-only replay. Keep false so the tutorial is truly first-run only. */
export const REPLAY_WALKTHROUGH_IN_DEV = false;
export const FORCE_WALKTHROUGH = __DEV__ && REPLAY_WALKTHROUGH_IN_DEV;

type Stage = 'brand' | 'flow' | 'dock' | 'rhythm' | 'start';

interface Page {
  stage: Stage;
  title: string;
  body: string;
}

interface Props {
  /** Called with `createPocket` when the user chose the hand-off action. */
  onDone: (next?: 'createPocket' | 'demo') => void;
}

export function Walkthrough({ onDone }: Props) {
  const theme = useTheme<AppTheme>();
  const { spacing } = theme.tokens;
  const [index, setIndex] = useState(0);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const pages: Page[] = useMemo(
    () => (['brand', 'flow', 'dock', 'rhythm', 'start'] as Stage[]).map((stage) => ({
      stage,
      title: t(`walkthrough.${stage}.title`),
      body: t(`walkthrough.${stage}.body`),
    })),
    [],
  );

  const last = index === pages.length - 1;
  const page = pages[index];
  const next = useCallback(() => {
    if (last) onDone('createPocket');
    else setIndex((i) => i + 1);
  }, [last, onDone]);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const arrow = I18nManager.isRTL ? 'arrow-left' : 'arrow-right';

  return (
    <>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <View style={styles.topBar}>
          <Text style={[styles.mark, { fontFamily: theme.tokens.font.serif.semibold, color: theme.colors.onSurface }]}>
            K<Text style={{ color: theme.semantic.gold }}>.</Text>
          </Text>
          {!last ? (
            <Pressable onPress={() => onDone()} hitSlop={12}>
              <AppText role="muted" variant="labelLarge">{t('walkthrough.skip')}</AppText>
            </Pressable>
          ) : null}
        </View>

        <Animated.View key={index} entering={FadeIn.duration(240)} style={styles.stage}>
          <Animated.View entering={FadeInDown.duration(420).delay(40)} style={styles.stageArt}>
            <Stage stage={page.stage} theme={theme} />
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(420).delay(160)}>
            <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>{page.title}</Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(420).delay(220)}>
            <AppText role="muted" variant="bodyLarge" style={styles.body}>{page.body}</AppText>
          </Animated.View>
        </Animated.View>

        <View style={[styles.footer, { gap: spacing.lg }]}>
          <View style={styles.dots}>
            {pages.map((_, i) => (
              <Pressable key={i} onPress={() => setIndex(i)} hitSlop={10}>
                <View style={[styles.dot, i === index ? { width: 22, backgroundColor: theme.semantic.gold } : { width: 8, backgroundColor: theme.colors.outline }]} />
              </Pressable>
            ))}
          </View>
          <View style={styles.navRow}>
            {index > 0 ? (
              <Button mode="text" onPress={back} textColor={theme.colors.onSurfaceVariant}>{t('walkthrough.back')}</Button>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <Button mode="contained" onPress={next} icon={last ? 'plus' : arrow} contentStyle={styles.ctaContent} style={styles.cta}>
              {last ? t('walkthrough.createPocket') : t('walkthrough.next')}
            </Button>
          </View>
          {last ? (
            <View style={{ gap: 10, alignItems: 'center' }}>
              <Button mode="outlined" icon="flask-outline" onPress={() => onDone('demo')} style={styles.cta}>
                {t('walkthrough.demo')}
              </Button>
              <Pressable onPress={() => onDone()} hitSlop={8} style={styles.centerLink}>
                <AppText role="muted" variant="labelMedium">{t('walkthrough.lookAround')}</AppText>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setShowPrivacy(true)} hitSlop={8} style={styles.centerLink}>
              <AppText role="muted" variant="labelMedium">{t('walkthrough.privacy')}</AppText>
            </Pressable>
          )}
        </View>
      </SafeAreaView>

      {showPrivacy && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background }]}>
          <SafeAreaView style={styles.privacyOverlay}>
            <View style={styles.topBar}>
              <Eyebrow color={theme.colors.onSurfaceVariant}>{t('privacy.title')}</Eyebrow>
              <Pressable onPress={() => setShowPrivacy(false)} hitSlop={12}>
                <AppText role="muted" variant="labelLarge">{t('privacy.close')}</AppText>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.privacyContent} showsVerticalScrollIndicator={false}>
              <PrivacyPolicy />
            </ScrollView>
          </SafeAreaView>
        </View>
      )}
    </>
  );
}

/** Each page's illustration is a live miniature of the real interface, not an icon. */
function Stage({ stage, theme }: { stage: Stage; theme: AppTheme }) {
  const { radius, spacing } = theme.tokens;
  const panel = { backgroundColor: theme.colors.surface, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.outlineVariant };

  if (stage === 'brand') {
    return (
      <View style={[styles.brandSeal, { backgroundColor: theme.semantic.goldDim, borderColor: theme.semantic.gold }]}>
        <MaterialCommunityIcons name="shield-lock-outline" size={40} color={theme.semantic.gold} />
        <AppText role="muted" variant="labelMedium">{t('more.offlineBadge')}</AppText>
      </View>
    );
  }

  if (stage === 'flow') {
    // Pocket -> Receipt -> Net worth, the whole model in one line.
    const Node = ({ icon, label, gold }: { icon: string; label: string; gold?: boolean }) => (
      <View style={styles.flowNode}>
        <View style={[styles.flowIcon, { backgroundColor: gold ? theme.semantic.goldDim : theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons name={icon as never} size={22} color={gold ? theme.semantic.gold : theme.colors.primary} />
        </View>
        <AppText variant="labelMedium" style={{ textAlign: 'center' }}>{label}</AppText>
      </View>
    );
    return (
      <View style={[panel, { padding: spacing.lg, width: '100%', gap: spacing.md }]}>
        <View style={styles.flowRow}>
          <Node icon="wallet-outline" label={t('walkthrough.flow.pocket')} />
          <MaterialCommunityIcons name={I18nManager.isRTL ? 'arrow-left' : 'arrow-right'} size={18} color={theme.colors.outline} />
          <Node icon="receipt-text-outline" label={t('walkthrough.flow.receipt')} />
          <MaterialCommunityIcons name={I18nManager.isRTL ? 'arrow-left' : 'arrow-right'} size={18} color={theme.colors.outline} />
          <Node icon="gold" label={t('walkthrough.flow.networth')} gold />
        </View>
        <MoneyText value={48250} currency="EGP" tone="gold" variant="titleLarge" animate fromZero />
        <DrawnBar progress={0.62} color={theme.semantic.gold} trackColor={theme.semantic.goldDim} height={3} />
      </View>
    );
  }

  if (stage === 'dock') {
    // A replica of the real dock, each stop explained.
    const stops = [
      { icon: 'view-dashboard-outline', label: t('tabs.dashboard'), hint: t('walkthrough.dock.home') },
      { icon: 'receipt-text-outline', label: t('tabs.transactions'), hint: t('walkthrough.dock.receipts') },
      { icon: 'plus', label: '', hint: t('walkthrough.dock.add'), coin: true },
      { icon: 'flag-checkered', label: t('tabs.longGame'), hint: t('walkthrough.dock.plan') },
      { icon: 'treasure-chest', label: t('tabs.accounts'), hint: t('walkthrough.dock.pockets') },
    ];
    return (
      <View style={{ width: '100%', gap: spacing.md }}>
        <View style={[panel, styles.dock, { borderRadius: 26 }]}>
          {stops.map((s) => (
            <View key={s.icon} style={styles.dockStop}>
              {s.coin ? (
                <View style={[styles.coin, { backgroundColor: theme.semantic.gold }]}>
                  <MaterialCommunityIcons name="plus" size={22} color="#1A1205" />
                </View>
              ) : (
                <>
                  <MaterialCommunityIcons name={s.icon as never} size={20} color={theme.colors.onSurfaceVariant} />
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{s.label}</Text>
                </>
              )}
            </View>
          ))}
        </View>
        <View style={{ gap: 6 }}>
          {stops.map((s) => (
            <View key={s.hint} style={styles.hintRow}>
              <MaterialCommunityIcons name={s.icon as never} size={16} color={s.coin ? theme.semantic.gold : theme.colors.primary} />
              <AppText variant="bodyMedium" style={{ flex: 1 }}>{s.hint}</AppText>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (stage === 'rhythm') {
    const rows = [
      { icon: 'calendar-today', text: t('walkthrough.rhythm.daily') },
      { icon: 'fire', text: t('walkthrough.rhythm.streak'), gold: true },
      { icon: 'ferris-wheel', text: t('walkthrough.rhythm.spin'), gold: true },
      { icon: 'book-lock-outline', text: t('walkthrough.rhythm.close') },
    ];
    return (
      <View style={[panel, { padding: spacing.lg, width: '100%', gap: spacing.md }]}>
        {rows.map((r) => (
          <View key={r.icon} style={styles.hintRow}>
            <View style={[styles.flowIcon, { width: 34, height: 34, backgroundColor: r.gold ? theme.semantic.goldDim : theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons name={r.icon as never} size={18} color={r.gold ? theme.semantic.gold : theme.colors.primary} />
            </View>
            <AppText variant="bodyMedium" style={{ flex: 1 }}>{r.text}</AppText>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.brandSeal, { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary }]}>
      <MaterialCommunityIcons name="wallet-plus-outline" size={40} color={theme.colors.primary} />
      <AppText role="muted" variant="labelMedium">{t('walkthrough.start.hint')}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, minHeight: 40 },
  mark: { fontSize: 30, lineHeight: 34, letterSpacing: -0.5 },
  stage: { flex: 1, justifyContent: 'center', gap: 14, paddingBottom: 8 },
  stageArt: { alignItems: 'center', marginBottom: 10 },
  title: { letterSpacing: -0.3 },
  body: { maxWidth: 360 },
  brandSeal: { width: 150, height: 150, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12 },
  flowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flowNode: { alignItems: 'center', gap: 6, width: 84 },
  flowIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', height: 64, paddingHorizontal: 6 },
  dockStop: { alignItems: 'center', justifyContent: 'center', gap: 3, minWidth: 52 },
  coin: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: -18 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footer: { paddingBottom: 8 },
  dots: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  dot: { height: 8, borderRadius: 999 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cta: { borderRadius: 999 },
  ctaContent: { flexDirection: 'row-reverse', height: 50, paddingHorizontal: 22 },
  centerLink: { alignSelf: 'center', paddingVertical: 2 },
  privacyOverlay: { flex: 1, paddingHorizontal: 24 },
  privacyContent: { paddingTop: 8, paddingBottom: 32 },
});
