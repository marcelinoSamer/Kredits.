import { View } from 'react-native';
import { useTheme } from 'react-native-paper';

import { AppText } from './AppText';
import { Eyebrow } from './Eyebrow';
import { getLocale, t } from '@/i18n';
import { PRIVACY_POLICY, POLICY_LAST_UPDATED } from '@/legal/privacy';
import type { AppTheme } from '@/theme';

/**
 * Renders the bundled privacy policy for the current locale. Presentational and
 * scroll-agnostic — used both by the /privacy route (Settings) and by the
 * in-walkthrough overlay, so it lives in a shared component.
 */
export function PrivacyPolicy() {
  const theme = useTheme<AppTheme>();
  const { spacing } = theme.tokens;
  const content = PRIVACY_POLICY[getLocale()] ?? PRIVACY_POLICY.en;

  return (
    <View style={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.sm }}>
        <Eyebrow color={theme.colors.onSurfaceVariant}>
          {t('privacy.updated', { date: POLICY_LAST_UPDATED })}
        </Eyebrow>
        <AppText role="body" variant="bodyLarge">
          {content.intro}
        </AppText>
      </View>

      {content.sections.map((section) => (
        <View key={section.heading} style={{ gap: spacing.xs }}>
          <AppText role="title" variant="titleMedium">
            {section.heading}
          </AppText>
          <AppText role="muted" variant="bodyMedium" style={{ lineHeight: 22 }}>
            {section.body}
          </AppText>
        </View>
      ))}
    </View>
  );
}
