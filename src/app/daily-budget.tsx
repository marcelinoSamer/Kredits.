// Daily budget editor: one allowance per day, in the display currency,
// separate from Pockets and from monthly category budgets.

import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { router } from 'expo-router';
import { Button, HelperText, List, Switch } from 'react-native-paper';
import { SelectField, type SelectOption } from '@/components/SelectField';
import { listAccountsWithBalances, type AccountWithBalance } from '@/db/repositories/accounts';
import { getSetting } from '@/db/repositories/settings';
import { nextPayday } from '@/money/recurring';

import { EditorScaffold } from '@/components/register/EditorScaffold';
import { AmountInput } from '@/components/AmountInput';
import { t } from '@/i18n';
import { parseAmount } from '@/ui/number';
import { dayKey, formatDate } from '@/ui/date';
import { useSettings } from '@/state/settings';
import { loadDailyBudget, saveDailyBudget } from '@/state/dailyBudget';
import { bumpData } from '@/state/dataVersion';

export default function DailyBudgetScreen() {
  const display = useSettings((s) => s.displayCurrency);
  const [amount, setAmount] = useState('');
  const [rollover, setRollover] = useState(true);
  const [startDay, setStartDay] = useState(dayKey(Date.now()));
  const [existing, setExisting] = useState(false);
  const [pockets, setPockets] = useState<AccountWithBalance[]>([]);
  const [payday, setPayday] = useState(1);

  useEffect(() => {
    listAccountsWithBalances().then((a) => setPockets(a.filter((x) => x.type !== 'credit' && x.type !== 'box' && x.currency === display)));
    getSetting('payday_day').then((v) => setPayday(parseInt(v ?? '1', 10) || 1));
  }, [display]);

  // Feature: pair with the payday split — fill the allowance from a Pocket's balance spread until payday.
  const fillFrom = (id: string) => {
    const p = pockets.find((x) => x.id === id);
    if (!p) return;
    const days = Math.max(1, Math.ceil((nextPayday(payday, Date.now()) - Date.now()) / 86_400_000));
    setAmount(String(Math.floor(p.balance / days)));
  };
  const pocketOptions: SelectOption[] = pockets.map((p) => ({ key: p.id, label: `${p.name} (${Math.round(p.balance)} ${p.currency})` }));

  useEffect(() => {
    loadDailyBudget().then((cfg) => {
      if (!cfg) return;
      setExisting(true);
      setAmount(String(cfg.amount));
      setRollover(cfg.rollover);
      setStartDay(cfg.startDay);
    });
  }, []);

  const save = async () => {
    const amt = parseAmount(amount);
    if (amt <= 0) {
      Alert.alert(t('common.required'), t('common.amount'));
      return;
    }
    await saveDailyBudget({ amount: amt, rollover, startDay });
    bumpData();
    router.back();
  };

  const remove = () => {
    Alert.alert(t('daily.remove'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await saveDailyBudget(null);
          bumpData();
          router.back();
        },
      },
    ]);
  };

  return (
    <EditorScaffold
      title={t('daily.title')}
      subtitle={t('daily.subtitle')}
      onSave={save}
      onDelete={existing ? remove : undefined}
      deleteLabel={t('daily.remove')}
      hero={<AmountInput value={amount} onChangeText={setAmount} currency={display} autoFocus={!existing} />}
    >
      {pockets.length > 0 && (
        <SelectField label={t('daily.fillFrom')} value={null} onChange={fillFrom} options={pocketOptions} placeholder={t('daily.fillHint')} />
      )}
      <List.Item
        title={t('daily.rollover')}
        description={t('daily.rolloverDesc')}
        right={() => <Switch value={rollover} onValueChange={setRollover} />}
      />
      <View style={{ gap: 4 }}>
        <HelperText type="info" visible>
          {t('daily.since', { date: formatDate(startDay) })}
        </HelperText>
        <Button mode="outlined" icon="restart" onPress={() => setStartDay(dayKey(Date.now()))}>
          {t('daily.resetToday')}
        </Button>
      </View>
    </EditorScaffold>
  );
}
