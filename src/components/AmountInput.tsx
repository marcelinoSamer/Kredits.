import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { TextInput } from 'react-native-paper';

import { RegisterKeypad } from '@/components/register/RegisterKeypad';
import { t } from '@/i18n';
import { currencyMeta, type CurrencyCode } from '@/money/currencies';

interface Props {
  label?: string;
  value: string;
  onChangeText: (s: string) => void;
  currency?: CurrencyCode;
  autoFocus?: boolean;
  /** Tints the keypad total green/red and prefixes a sign. */
  sign?: 'expense' | 'income';
}

/**
 * A money field. Tapping it opens the cash-register keypad (not the OS keyboard),
 * so every amount in the app is entered on the register.
 */
export function AmountInput({ label, value, onChangeText, currency, autoFocus, sign }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (autoFocus) setOpen(true);
  }, [autoFocus]);

  return (
    <>
      <Pressable onPress={() => setOpen(true)}>
        <View pointerEvents="none">
          <TextInput
            mode="outlined"
            label={label ?? t('common.amount')}
            value={value}
            editable={false}
            left={currency ? <TextInput.Affix text={currencyMeta(currency).symbol} /> : undefined}
            right={<TextInput.Icon icon="dialpad" />}
          />
        </View>
      </Pressable>

      <Modal
        transparent
        visible={open}
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <RegisterKeypad
          value={value}
          onChange={onChangeText}
          currency={currency}
          sign={sign}
          label={label}
          onClose={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
