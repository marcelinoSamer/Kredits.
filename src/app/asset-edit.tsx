import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { HelperText, TextInput } from 'react-native-paper';

import { EditorScaffold } from '@/components/register/EditorScaffold';
import { AmountInput } from '@/components/AmountInput';
import { SelectField } from '@/components/SelectField';
import { DateField } from '@/components/DateField';
import { t } from '@/i18n';
import { CASH_CURRENCY_CODES, currencyMeta, DEFAULT_CURRENCY } from '@/money/currencies';
import { formatMoney } from '@/money/format';
import { computeCert } from '@/money/cert';
import { parseAmount, sanitizeDecimal } from '@/ui/number';
import { ASSET_TYPES } from '@/ui/meta';
import { assetTypeLabel } from '@/ui/labels';
import { createAsset, deleteAsset, getAsset, updateAsset } from '@/db/repositories/assets';
import { bumpData } from '@/state/dataVersion';
import type { AssetType } from '@/db/schema';

const YEAR = 365 * 86_400_000;

export default function AssetEditScreen() {
  const { id, type: typeParam } = useLocalSearchParams<{ id?: string; type?: string }>();
  const editing = !!id;

  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>(
    ASSET_TYPES.includes(typeParam as AssetType) ? (typeParam as AssetType) : 'gold',
  );
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [valuedAt, setValuedAt] = useState(Date.now());
  const [note, setNote] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [startsAt, setStartsAt] = useState(Date.now());
  const [maturesAt, setMaturesAt] = useState(Date.now() + YEAR);

  const isCert = type === 'bank_cert';

  useEffect(() => {
    if (!id) return;
    getAsset(id).then((a) => {
      if (!a) return;
      setName(a.name);
      setType(a.type);
      setQuantity(String(a.quantity));
      setUnit(a.unit ?? '');
      setValue(String(a.value));
      setCurrency(a.currency);
      setValuedAt(a.valued_at);
      setNote(a.note ?? '');
      setInterestRate(a.interest_rate != null ? String(a.interest_rate) : '');
      setStartsAt(a.starts_at ?? a.valued_at);
      setMaturesAt(a.matures_at ?? a.valued_at + YEAR);
    });
  }, [id]);

  const save = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.required'), t('common.name'));
      return;
    }
    const input = {
      name: name.trim(),
      type,
      quantity: isCert ? 1 : parseAmount(quantity) || 1,
      unit: isCert ? null : unit.trim() || null,
      value: parseAmount(value),
      currency,
      valued_at: isCert ? startsAt : valuedAt,
      note: note.trim() || null,
      interest_rate: isCert ? parseAmount(interestRate) || 0 : null,
      starts_at: isCert ? startsAt : null,
      matures_at: isCert ? maturesAt : null,
    };
    if (editing && id) await updateAsset(id, input);
    else await createAsset(input);
    bumpData();
    router.back();
  };

  const onDelete = () => {
    if (!id) return;
    Alert.alert(t('common.delete'), name, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteAsset(id);
          bumpData();
          router.back();
        },
      },
    ]);
  };

  // Live projection for the certificate editor.
  const cert = isCert
    ? computeCert({
        principal: parseAmount(value),
        ratePct: parseAmount(interestRate) || 0,
        startsAt,
        maturesAt,
        now: Date.now(),
      })
    : null;

  return (
    <EditorScaffold
      title={editing ? t('asset.editAsset') : t('asset.newAsset')}
      subtitle={assetTypeLabel(type)}
      onSave={save}
      onDelete={editing ? onDelete : undefined}
      hero={
        <AmountInput
          label={isCert ? t('cert.principal') : t('asset.value')}
          value={value}
          onChangeText={setValue}
          currency={currency}
        />
      }
    >
      <TextInput mode="outlined" label={t('common.name')} value={name} onChangeText={setName} autoFocus={!editing} />
      <SelectField
        label={t('common.type')}
        value={type}
        onChange={(k) => setType(k as AssetType)}
        options={ASSET_TYPES.map((tp) => ({ key: tp, label: assetTypeLabel(tp) }))}
      />
      <SelectField
        label={t('common.currency')}
        value={currency}
        onChange={setCurrency}
        options={CASH_CURRENCY_CODES.map((c) => ({ key: c, label: `${c} — ${currencyMeta(c).symbol}` }))}
      />

      {isCert ? (
        <>
          <TextInput
            mode="outlined"
            label={t('cert.interestRate')}
            value={interestRate}
            keyboardType="decimal-pad"
            onChangeText={(x) => setInterestRate(sanitizeDecimal(x))}
          />
          <DateField label={t('cert.startsAt')} value={startsAt} onChange={setStartsAt} />
          <DateField label={t('cert.maturesAt')} value={maturesAt} onChange={setMaturesAt} />
          {cert && parseAmount(value) > 0 && (
            <HelperText type="info" visible>
              {t('cert.maturityValue')}: {formatMoney(cert.maturityValue, currency)}
              {cert.projectedInterest > 0
                ? `  ·  +${formatMoney(cert.projectedInterest, currency)}`
                : ''}
            </HelperText>
          )}
        </>
      ) : (
        <>
          <TextInput
            mode="outlined"
            label={t('asset.quantity')}
            value={quantity}
            keyboardType="decimal-pad"
            onChangeText={(x) => setQuantity(sanitizeDecimal(x))}
          />
          <TextInput mode="outlined" label={`${t('asset.unit')} (${t('common.optional')})`} value={unit} onChangeText={setUnit} />
          <DateField label={t('asset.valuedAt')} value={valuedAt} onChange={setValuedAt} />
        </>
      )}

      <TextInput
        mode="outlined"
        label={`${t('common.note')} (${t('common.optional')})`}
        value={note}
        onChangeText={setNote}
        multiline
      />
    </EditorScaffold>
  );
}
