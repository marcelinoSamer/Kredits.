import { useCallback, useMemo, useState } from 'react';
import { I18nManager, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AppText } from './AppText';
import { Eyebrow } from './Eyebrow';
import { PrivacyPolicy } from './PrivacyPolicy';
import { t } from '@/i18n';
import type { AppTheme } from '@/theme';

/**
 * DEV replay flag. When true *and* running a development build (`__DEV__`), the
 * first-launch walkthrough is shown on every app open regardless of whether it
 * has already been completed. Never fires in release builds. Flip to false to
 * test the real once-only first-launch behaviour.
 */
export const REPLAY_WALKTHROUGH_IN_DEV = true;

/** Resolved: force the walkthrough every launch (dev only). */
export const FORCE_WALKTHROUGH = __DEV__ && REPLAY_WALKTHROUGH_IN_DEV;

interface Bullet {
  icon: string;
  label: string;
  /** Gold accent — reserved for value (net worth). */
  gold?: boolean;
}

interface Slide {
  /** `brand` renders the "K." mark; `feature` renders an emerald glyph. */
  kind: 'brand' | 'feature';
  icon?: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets?: Bullet[];
}

interface Props {
  onDone: () => void;
}

/**
 * First-launch walkthrough — 3 pages, "Vault Ledger" styled. Rendered as a
 * full-screen overlay by the root layout before the tabs mount (like the lock
 * screen), so it needs no route of its own. Index-paged with tappable dots and
 * Next/Back, which keeps behaviour identical under LTR and RTL.
 */
export function Walkthrough({ onDone }: Props) {
  const theme = useTheme<AppTheme>();
  const { spacing } = theme.tokens;
  const [index, setIndex] = useState(0);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const slides: Slide[] = useMemo(
    () => [
      {
        kind: 'brand',
        eyebrow: t('walkthrough.p1.eyebrow'),
        title: t('walkthrough.p1.title'),
        body: t('walkthrough.p1.body'),
      },
      {
        kind: 'feature',
        icon: 'wallet-outline',
        eyebrow: t('walkthrough.p2.eyebrow'),
        title: t('walkthrough.p2.title'),
        body: t('walkthrough.p2.body'),
        bullets: [
          { icon: 'swap-horizontal', label: t('walkthrough.p2.b1') },
          { icon: 'gold', label: t('walkthrough.p2.b2') },
          { icon: 'chart-donut', label: t('walkthrough.p2.b3'), gold: true },
        ],
      },
      {
        kind: 'feature',
        icon: 'flag-variant-outline',
        eyebrow: t('walkthrough.p3.eyebrow'),
        title: t('walkthrough.p3.title'),
        body: t('walkthrough.p3.body'),
        bullets: [
          { icon: 'bell-ring-outline', label: t('walkthrough.p3.b1') },
          { icon: 'target', label: t('walkthrough.p3.b2') },
          { icon: 'message-text-outline', label: t('walkthrough.p3.b3') },
        ],
      },
    ],
    [],
  );

  const last = index === slides.length - 1;
  const slide = slides[index];

  const next = useCallback(() => {
    if (last) onDone();
    else setIndex((i) => i + 1);
  }, [last, onDone]);

  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  const nextIcon = last ? 'arrow-right-thin' : I18nManager.isRTL ? 'arrow-left' : 'arrow-right';

  return (
    <>
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {/* Top bar: brand tick + Skip */}
      <View style={styles.topBar}>
        <Eyebrow color={theme.colors.onSurfaceVariant}>KARD</Eyebrow>
        {!last ? (
          <Pressable onPress={onDone} hitSlop={12}>
            <AppText role="muted" variant="labelLarge">
              {t('walkthrough.skip')}
            </AppText>
          </Pressable>
        ) : (
          <View style={{ height: 20 }} />
        )}
      </View>

      {/* Slide body — re-mounts per page so the stagger replays. */}
      <Animated.View key={index} entering={FadeIn.duration(280)} style={styles.stage}>
        <Animated.View entering={FadeInDown.duration(420).delay(40)}>
          <Emblem slide={slide} theme={theme} />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(420).delay(120)}>
          <Eyebrow color={theme.colors.primary} style={styles.eyebrow}>
            {slide.eyebrow}
          </Eyebrow>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(420).delay(180)}>
          <Text variant="displaySmall" style={[styles.title, { color: theme.colors.onSurface }]}>
            {slide.title}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(420).delay(240)}>
          <AppText role="muted" variant="bodyLarge" style={styles.body}>
            {slide.body}
          </AppText>
        </Animated.View>

        {slide.bullets ? (
          <View style={[styles.bullets, { marginTop: spacing.xl, gap: spacing.md }]}>
            {slide.bullets.map((b, i) => (
              <Animated.View
                key={b.icon}
                entering={FadeInDown.duration(420).delay(320 + i * 70)}
                style={styles.bulletRow}
              >
                <View
                  style={[
                    styles.bulletDot,
                    {
                      backgroundColor: b.gold ? theme.semantic.goldDim : theme.colors.primaryContainer,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={b.icon as never}
                    size={16}
                    color={b.gold ? theme.semantic.gold : theme.colors.primary}
                  />
                </View>
                <AppText variant="bodyMedium" style={styles.bulletText}>
                  {b.label}
                </AppText>
              </Animated.View>
            ))}
          </View>
        ) : null}
      </Animated.View>

      {/* Footer: dots + nav */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <Pressable key={i} onPress={() => setIndex(i)} hitSlop={10}>
              <View
                style={[
                  styles.dot,
                  i === index
                    ? { width: 22, backgroundColor: theme.colors.primary }
                    : { width: 8, backgroundColor: theme.colors.outline },
                ]}
              />
            </Pressable>
          ))}
        </View>

        <View style={styles.navRow}>
          {index > 0 ? (
            <Button mode="text" onPress={back} textColor={theme.colors.onSurfaceVariant}>
              {t('walkthrough.back')}
            </Button>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <Button
            mode="contained"
            onPress={next}
            icon={nextIcon}
            contentStyle={styles.ctaContent}
            style={styles.cta}
          >
            {last ? t('walkthrough.start') : t('walkthrough.next')}
          </Button>
        </View>

        <Pressable onPress={() => setShowPrivacy(true)} hitSlop={8} style={styles.privacyLink}>
          <AppText role="muted" variant="labelMedium">
            {t('walkthrough.privacy')}
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>

    {showPrivacy && (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background }]}>
        <SafeAreaView style={styles.privacyOverlay}>
          <View style={styles.topBar}>
            <Eyebrow color={theme.colors.onSurfaceVariant}>{t('privacy.title')}</Eyebrow>
            <Pressable onPress={() => setShowPrivacy(false)} hitSlop={12}>
              <AppText role="muted" variant="labelLarge">
                {t('privacy.close')}
              </AppText>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.privacyContent}
            showsVerticalScrollIndicator={false}
          >
            <PrivacyPolicy />
          </ScrollView>
        </SafeAreaView>
      </View>
    )}
    </>
  );
}

/** The page emblem: a "K." seal on the brand slide, an emerald glyph elsewhere. */
function Emblem({ slide, theme }: { slide: Slide; theme: AppTheme }) {
  const { radius } = theme.tokens;
  if (slide.kind === 'brand') {
    return (
      <View
        style={[
          styles.emblem,
          {
            backgroundColor: theme.semantic.goldDim,
            borderColor: theme.semantic.gold,
            borderRadius: radius.pill,
          },
        ]}
      >
        <Text
          style={[styles.kMark, { fontFamily: theme.tokens.font.serif.semibold, color: theme.colors.onSurface }]}
        >
          K<Text style={{ color: theme.semantic.gold }}>.</Text>
        </Text>
      </View>
    );
  }
  return (
    <View
      style={[
        styles.emblem,
        {
          backgroundColor: theme.colors.primaryContainer,
          borderColor: theme.colors.primary,
          borderRadius: radius.pill,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={(slide.icon ?? 'circle') as never}
        size={46}
        color={theme.colors.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 28 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    minHeight: 32,
  },
  stage: { flex: 1, justifyContent: 'center', paddingBottom: 12 },
  emblem: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 28,
  },
  kMark: { fontSize: 52, lineHeight: 58, letterSpacing: -1 },
  eyebrow: { marginBottom: 12 },
  title: { letterSpacing: -0.4, marginBottom: 14 },
  body: { maxWidth: 340 },
  bullets: {},
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bulletDot: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletText: { flex: 1 },
  footer: { paddingBottom: 8, gap: 16 },
  privacyLink: { alignSelf: 'center', paddingVertical: 2 },
  privacyOverlay: { flex: 1, paddingHorizontal: 28 },
  privacyContent: { paddingTop: 8, paddingBottom: 32 },
  dots: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  dot: { height: 8, borderRadius: 999 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cta: { borderRadius: 999 },
  ctaContent: { flexDirection: 'row-reverse', height: 50, paddingHorizontal: 22 },
});
