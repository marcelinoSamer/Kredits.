import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { List, SegmentedButtons, Switch, TextInput } from 'react-native-paper';

import { EditorScaffold } from '@/components/register/EditorScaffold';
import { AmountInput } from '@/components/AmountInput';
import { DateField } from '@/components/DateField';
import { t } from '@/i18n';
import { parseAmount, sanitizeDecimal } from '@/ui/number';
import { useSettings } from '@/state/settings';
import { createGoldLot, deleteGoldLot, getGoldLot, updateGoldLot } from '@/db/repositories/gold';
import { bumpData } from '@/state/dataVersion';

export default function GoldEditScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const editing = !!params.id;
  const display = useSettings((s) => s.displayCurrency);
  const [name, setName] = useState('');
  const [grams, setGrams] = useState('');
  const [karat, setKarat] = useState<'24' | '21' | '18'>('21');
  const [price, setPrice] = useState('');
  const [making, setMaking] = useState('0');
  const [boughtAt, setBoughtAt] = useState(Date.now());
  const [sold, setSold] = useState(false);
  const [soldAt, setSoldAt] = useState(Date.now());
  const [soldPrice, setSoldPrice] = useState('');

  useEffect(() => {
    if (!params.id) return;
    getGoldLot(params.id).then((l) => {
      if (!l) return;
      setName(l.name);
      setGrams(String(l.grams));
      setKarat(String(l.karat) as never);
      setPrice(String(l.price_per_gram));
      setMaking(String(l.making_charge));
      setBoughtAt(l.bought_at);
      setSold(l.sold_at != null);
      if (l.sold_at) setSoldAt(l.sold_at);
      if (l.sold_price_per_gram) setSoldPrice(String(l.sold_price_per_gram));
    });
  }, [params.id]);

  const save = async () => {
    const g = parseAmount(grams);
    const p = parseAmount(price);
    if (g <= 0 || p <= 0) {
      Alert.alert(t('common.required'), t('gold.gramsAndPrice'));
      return;
    }
    const input = {
      name: name.trim() || t('gold.defaultName', { k: karat }),
      grams: g,
      karat: Number(karat),
      price_per_gram: p,
      making_charge: parseAmount(making),
      currency: display,
      bought_at: boughtAt,
      sold_at: sold ? soldAt : null,
      sold_price_per_gram: sold ? parseAmount(soldPrice) || null : null,
    };
    if (editing && params.id) await updateGoldLot(params.id, input);
    else await createGoldLot(input);
    bumpData();
    router.back();
  };

  const remove = () =>
    Alert.alert(t('common.delete'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => { await deleteGoldLot(params.id!); bumpData(); router.back(); } },
    ]);

  return (
    <EditorScaffold
      title={editing ? t('gold.editLot') : t('gold.add')}
      subtitle={t('gold.subtitle')}
      onSave={save}
      onDelete={editing ? remove : undefined}
      hero={
        <>
          <SegmentedButtons value={karat} onValueChange={(v) => setKarat(v as never)} buttons={[{ value: '24', label: '24k' }, { value: '21', label: '21k' }, { value: '18', label: '18k' }]} />
          <TextInput mode="outlined" label={t('gold.grams')} keyboardType="decimal-pad" value={grams} onChangeText={(v) => setGrams(sanitizeDecimal(v))} right={<TextInput.Affix text="g" />} />
        </>
      }
    >
      <TextInput mode="outlined" label={`${t('gold.name')} (${t('common.optional')})`} value={name} onChangeText={setName} />
      <AmountInput label={t('gold.pricePerGram')} value={price} onChangeText={setPrice} currency={display} />
      <AmountInput label={t('gold.makingCharge')} value={making} onChangeText={setMaking} currency={display} />
      <DateField label={t('gold.boughtOn')} value={boughtAt} onChange={setBoughtAt} />
      <List.Item title={t('gold.markSold')} right={() => <Switch value={sold} onValueChange={setSold} />} />
      {sold && (
        <>
          <DateField label={t('gold.soldOn')} value={soldAt} onChange={setSoldAt} />
          <AmountInput label={t('gold.soldPricePerGram')} value={soldPrice} onChangeText={setSoldPrice} currency={display} />
        </>
      )}
    </EditorScaffold>
  );
}
