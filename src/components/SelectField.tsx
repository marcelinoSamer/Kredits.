import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Portal, TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { BottomSheet } from '@/components/anim/BottomSheet';
import { AppText } from '@/components/AppText';
import { Divider } from '@/components/Divider';
import type { AppTheme } from '@/theme';

export interface SelectOption {
  key: string;
  label: string;
  description?: string;
}

interface Props {
  label: string;
  value: string | null;
  options: SelectOption[];
  onChange: (key: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/** A read-only TextInput that opens a vault-ledger bottom sheet with a single-choice list. */
export function SelectField({ label, value, options, onChange, placeholder, disabled }: Props) {
  const theme = useTheme<AppTheme>();
  const { spacing } = theme.tokens;
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.key === value);

  return (
    <>
      <TextInput
        mode="outlined"
        label={label}
        value={selected?.label ?? ''}
        placeholder={placeholder}
        editable={false}
        right={<TextInput.Icon icon="chevron-down" onPress={() => !disabled && setOpen(true)} />}
        onPressIn={() => !disabled && setOpen(true)}
        showSoftInputOnFocus={false}
      />
      {open && (
        <Portal>
          <BottomSheet onClose={() => setOpen(false)}>
            <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.sm }}>
              <AppText
                role="title"
                variant="titleLarge"
                style={{ fontFamily: theme.tokens.font.serif.semibold }}
              >
                {label}
              </AppText>
            </View>
            <ScrollView
              style={styles.list}
              contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.lg }}
            >
              {options.map((o, i) => {
                const active = o.key === value;
                return (
                  <View key={o.key}>
                    {i > 0 && <Divider />}
                    <Pressable
                      onPress={() => {
                        onChange(o.key);
                        setOpen(false);
                      }}
                      style={({ pressed }) => [
                        styles.row,
                        { paddingVertical: spacing.md, gap: spacing.md },
                        pressed && { opacity: 0.6 },
                      ]}
                    >
                      <View style={styles.rowBody}>
                        <AppText role={active ? 'title' : 'body'}>{o.label}</AppText>
                        {o.description && (
                          <AppText role="muted" variant="bodySmall">
                            {o.description}
                          </AppText>
                        )}
                      </View>
                      {active && (
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={20}
                          color={theme.colors.primary}
                        />
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          </BottomSheet>
        </Portal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 420 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBody: { flex: 1, gap: 2 },
});
