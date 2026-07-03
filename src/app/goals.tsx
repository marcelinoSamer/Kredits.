import { View, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { FAB } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { GoalList } from '@/components/planning/GoalList';
import { t } from '@/i18n';

export default function GoalsScreen() {
  return (
    <View style={styles.flex}>
      <Screen>
        <Stack.Screen options={{ title: t('goals.title') }} />
        <GoalList />
      </Screen>
      <FAB icon="plus" style={styles.fab} onPress={() => router.push('/goal-edit')} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
