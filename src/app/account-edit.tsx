import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, SegmentedButtons, TextInput } from 'react-native-paper';

import { EditorScaffold } from '@/components/register/EditorScaffold';
import { AmountInput } from '@/components/AmountInput';
import { SelectField } from '@/components/SelectField';
import { IconBadge } from '@/components/IconBadge';
import { AppText } from '@/components/AppText';
import { t } from '@/i18n';
import { CASH_CURRENCY_CODES, currencyMeta, DEFAULT_CURRENCY } from '@/money/currencies';
import { parseAmount } from '@/ui/number';
import { ACCOUNT_TYPES, ACCOUNT_TYPE_META } from '@/ui/meta';
import { accountTypeLabel } from '@/ui/labels';
import {
  createAccount,
  deleteAccount,
  getAccount,
  setArchived,
  updateAccount,
} from '@/db/repositories/accounts';
import { bumpData } from '@/state/dataVersion';
import type { AccountType } from '@/db/schema';

export default function AccountEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [opening, setOpening] = useState('0');
  const [archived, setArchivedState] = useState(false);

  useEffect(() => {
    if (!id) return;
    getAccount(id).then((a) => {
      if (!a) return;
      setName(a.name);
      setType(a.type);
      setCurrency(a.currency);
      setOpening(String(a.opening_balance));
      setArchivedState(a.archived === 1);
    });
  }, [id]);

  const save = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.required'), t('common.name'));
      return;
    }
    const meta = ACCOUNT_TYPE_META[type];
    const input = {
      name: name.trim(),
      type,
      currency,
      opening_balance: parseAmount(opening),
      icon: meta.icon,
      color: meta.color,
    };
    if (editing && id) await updateAccount(id, input);
    else await createAccount(input);
    bumpData();
    router.back();
  };

  const onDelete = () => {
    if (!id) return;
    Alert.alert(t('common.delete'), t('accounts.editContainer'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteAccount(id);
          bumpData();
          router.back();
        },
      },
    ]);
  };

  const onToggleArchive = async () => {
    if (!id) return;
    await setArchived(id, !archived);
    setArchivedState(!archived);
    bumpData();
  };

  const meta = ACCOUNT_TYPE_META[type];

  return (
    <EditorScaffold
      title={editing ? t('accounts.editContainer') : t('accounts.newContainer')}
      onSave={save}
      onDelete={editing ? onDelete : undefined}
      footer={
        editing ? (
          <Button mode="outlined" onPress={onToggleArchive}>
            {archived ? t('accounts.unarchive') : t('accounts.archive')}
          </Button>
        ) : undefined
      }
      hero={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBadge icon={meta.icon} color={meta.color} size={48} />
          <View style={{ flex: 1 }}>
            <AppText role="title" variant="titleMedium" numberOfLines={1}>
              {name.trim() || t('accounts.newContainer')}
            </AppText>
            <AppText role="muted">
              {accountTypeLabel(type)}  ·  {currency}
            </AppText>
          </View>
        </View>
      }
    >
      <TextInput mode="outlined" label={t('common.name')} value={name} onChangeText={setName} autoFocus={!editing} />
      <SegmentedButtons
        value={type}
        onValueChange={(v) => setType(v as AccountType)}
        buttons={ACCOUNT_TYPES.map((tp) => ({ value: tp, label: accountTypeLabel(tp) }))}
      />
      <SelectField
        label={t('common.currency')}
        value={currency}
        onChange={setCurrency}
        options={CASH_CURRENCY_CODES.map((c) => ({ key: c, label: `${c} — ${currencyMeta(c).symbol}` }))}
      />
      <AmountInput label={t('accounts.openingBalance')} value={opening} onChangeText={setOpening} currency={currency} />
    </EditorScaffold>
  );
}
