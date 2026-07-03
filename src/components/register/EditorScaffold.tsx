import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { Text, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { AnimatedPressable } from '@/components/anim/AnimatedPressable';
import { Seal } from './Seal';
import { Perforation } from './Perforation';
import { t } from '@/i18n';
import type { AppTheme } from '@/theme';

interface Props {
  title: string;
  subtitle?: string;
  /** The dominant datum for this receipt (amount keypad, live preview, etc.). */
  hero?: ReactNode;
  /** The remaining fields. */
  children: ReactNode;
  onSave: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
  onDelete?: () => void;
  deleteLabel?: string;
  /** Extra footer controls (e.g. Archive). */
  footer?: ReactNode;
}

/** The receipt/register slip that all editor screens share. */
export function EditorScaffold({
  title,
  subtitle,
  hero,
  children,
  onSave,
  saveLabel,
  saveDisabled,
  onDelete,
  deleteLabel,
  footer,
}: Props) {
  const theme = useTheme<AppTheme>();
  const { spacing, radius, font } = theme.tokens;

  return (
    <Screen contentStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Stack.Screen options={{ title, presentation: 'modal' }} />

      <View style={[styles.slip, { backgroundColor: theme.colors.surface, borderRadius: radius.lg }, theme.tokens.shadow.card]}>
        <LinearGradient
          colors={[theme.semantic.goldDim, 'transparent'] as const}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <View style={styles.head}>
            <View style={styles.headText}>
              <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
                {title}
              </Text>
              {subtitle ? (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <Seal />
          </View>
          {hero}
        </View>

        <Perforation />

        <View style={{ padding: spacing.lg, gap: spacing.md }}>{children}</View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <AnimatedPressable
          onPress={saveDisabled ? undefined : onSave}
          disabled={saveDisabled}
          scaleTo={0.97}
          style={[
            styles.stamp,
            { backgroundColor: saveDisabled ? theme.colors.surfaceDisabled : theme.colors.primary, borderRadius: radius.pill },
          ]}
        >
          <MaterialCommunityIcons
            name="check-decagram"
            size={20}
            color={saveDisabled ? theme.colors.onSurfaceVariant : theme.colors.onPrimary}
          />
          <Text
            style={[
              styles.stampText,
              { color: saveDisabled ? theme.colors.onSurfaceVariant : theme.colors.onPrimary, fontFamily: font.sans.semibold },
            ]}
          >
            {saveLabel ?? t('common.save')}
          </Text>
        </AnimatedPressable>

        {onDelete ? (
          <AnimatedPressable onPress={onDelete} scaleTo={0.98} style={styles.void}>
            <MaterialCommunityIcons name="close-circle-outline" size={16} color={theme.semantic.negative} />
            <Text style={{ color: theme.semantic.negative, fontFamily: font.sans.medium }}>
              {deleteLabel ?? t('common.delete')}
            </Text>
          </AnimatedPressable>
        ) : null}

        {footer}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  slip: { overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headText: { flex: 1, gap: 2 },
  stamp: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  stampText: { fontSize: 16, letterSpacing: 0.3 },
  void: { height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
