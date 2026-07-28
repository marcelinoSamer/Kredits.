import { Stack } from 'expo-router';

import { Screen } from '@/components/Screen';
import { PrivacyPolicy } from '@/components/PrivacyPolicy';
import { t } from '@/i18n';

export default function PrivacyScreen() {
  return (
    <Screen>
      <Stack.Screen options={{ title: t('privacy.title') }} />
      <PrivacyPolicy />
    </Screen>
  );
}
