import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { List, SegmentedButtons, Switch, TextInput } from 'react-native-paper';

import { EditorScaffold } from '@/components/register/EditorScaffold';
import { AmountInput } from '@/components/AmountInput';
import { SelectField, type SelectOption } from '@/components/SelectField';
import { DateField } from '@/components/DateField';
import { t } from '@/i18n';
import { parseAmount } from '@/ui/number';
import { categoryLabel } from '@/ui/labels';
import { listAccounts } from '@/db/repositories/accounts';
import { listCategories } from '@/db/repositories/categories';
import { createRecurring, deleteRecurring, getRecurring, updateRecurring } from '@/db/repositories/recurring';
import { bumpData } from '@/state/dataVersion';
import type { Account, Category, Frequency, TxKind } from '@/db/schema';

export default function RecurringEditScreen() {
  const params = useLocalSearchParams<{ id?: string; merchant?: string; amount?: string; frequency?: Frequency }>();
  const editing = !!params.id;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [kind, setKind] = useState<TxKind>('expense');
  const [amount, setAmount] = useState(params.amount ?? '');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [merchant, setMerchant] = useState(params.merchant ?? '');
  const [frequency, setFrequency] = useState<Frequency>(params.frequency ?? 'monthly');
  const [nextDue, setNextDue] = useState(Date.now());
  const [autoPost, setAutoPost] = useState(true);
  const [remind, setRemind] = useState(true);

  useEffect(() => {
    Promise.all([listAccounts(false), listCategories()]).then(([a, c]) => {
      setAccounts(a);
      setCategories(c);
      if (!params.id) setAccountId((prev) => prev ?? a[0]?.id ?? null);
    });
  }, [params.id]);

  useEffect(() => {
    if (!params.id) return;
    getRecurring(params.id).then((r) => {
      if (!r) return;
      setKind(r.kind);
      setAmount(String(r.amount));
      setAccountId(r.account_id);
      setCategoryId(r.category_id);
      setMerchant(r.merchant ?? '');
      setFrequency(r.frequency);
      setNextDue(r.next_due);
      setAutoPost(!!r.auto_post);
      setRemind(!!r.remind);
    });
  }, [params.id]);

  const account = accounts.find((a) => a.id === accountId) ?? null;
  const accountOptions: SelectOption[] = accounts.filter((a) => a.type !== 'box').map((a) => ({ key: a.id, label: `${a.name} (${a.currency})` }));
  const categoryOptions: SelectOption[] = useMemo(
    () => [{ key: '', label: t('common.none') }, ...categories.filter((c) => c.kind === kind).map((c) => ({ key: c.id, label: categoryLabel(c) }))],
    [categories, kind],
  );

  const save = async () => {
    const amt = parseAmount(amount);
    if (!account) return;
    if (amt <= 0) {
      Alert.alert(t('common.required'), t('common.amount'));
      return;
    }
    const input = {
      account_id: account.id,
      kind,
      amount: amt,
      currency: account.currency,
      category_id: categoryId,
      merchant: merchant.trim() || null,
      frequency,
      next_due: nextDue,
      auto_post: autoPost,
      remind,
    };
    if (editing && params.id) await updateRecurring(params.id, input);
    else await createRecurring(input);
    bumpData();
    router.back();
  };

  const remove = () =>
    Alert.alert(t('common.delete'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => { await deleteRecurring(params.id!); bumpData(); router.back(); } },
    ]);

  return (
    <EditorScaffold
      title={editing ? t('bills.editRule') : t('bills.add')}
      subtitle={t(`bills.freq.${frequency}`)}
      onSave={save}
      onDelete={editing ? remove : undefined}
      saveDisabled={accounts.length === 0}
      hero={
        <>
          <SegmentedButtons
            value={kind}
            onValueChange={(v) => setKind(v as TxKind)}
            buttons={[{ value: 'expense', label: t('bills.bill'), icon: 'arrow-up' }, { value: 'income', label: t('tx.income'), icon: 'arrow-down' }]}
          />
          <AmountInput value={amount} onChangeText={setAmount} currency={account?.currency} sign={kind} autoFocus={!editing} />
        </>
      }
    >
      <TextInput mode="outlined" label={t('bills.name')} value={merchant} onChangeText={setMerchant} />
      <SelectField label={t('tx.account')} value={accountId} onChange={setAccountId} options={accountOptions} />
      <SelectField label={t('common.category')} value={categoryId ?? ''} onChange={(k) => setCategoryId(k || null)} options={categoryOptions} />
      <SegmentedButtons
        value={frequency}
        onValueChange={(v) => setFrequency(v as Frequency)}
        buttons={[
          { value: 'weekly', label: t('bills.freq.weekly') },
          { value: 'monthly', label: t('bills.freq.monthly') },
          { value: 'yearly', label: t('bills.freq.yearly') },
        ]}
      />
      <DateField label={t('bills.nextDue')} value={nextDue} onChange={setNextDue} />
      <List.Item title={t('bills.autoPost')} description={t('bills.autoPostDesc')} right={() => <Switch value={autoPost} onValueChange={setAutoPost} />} />
      <List.Item title={t('bills.remind')} description={t('bills.remindDesc')} right={() => <Switch value={remind} onValueChange={setRemind} />} />
    </EditorScaffold>
  );
}
