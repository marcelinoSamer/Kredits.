import { StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { FAB, useTheme } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { BoxList } from '@/components/planning/BoxList';
import { t } from '@/i18n';
import type { AppTheme } from '@/theme';

export default function BoxesScreen() {
  const theme = useTheme<AppTheme>();
  return (
    <View style={styles.flex}>
      <Screen>
        <Stack.Screen options={{ title: t('boxes.title') }} />
        <BoxList />
      </Screen>
      <FAB
        icon="plus"
        color={theme.colors.onPrimary}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push('/box-edit')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
