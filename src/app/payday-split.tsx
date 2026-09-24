// Payday split: move a salary into Pockets by percentages in one tap. Rules
// are remembered (settings table). Each part becomes a normal transfer, so
// balances and history stay consistent with manual transfers.

import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Button, HelperText, IconButton, TextInput, useTheme } from 'react-native-paper';

import { EditorScaffold } from '@/components/register/EditorScaffold';
import { AmountInput } from '@/components/AmountInput';
import { SelectField, type SelectOption } from '@/components/SelectField';
import { MoneyText } from '@/components/MoneyText';
import { AppText } from '@/components/AppText';
import { Eyebrow } from '@/components/Eyebrow';
import { t } from '@/i18n';
import { parseAmount, sanitizeDecimal } from '@/ui/number';
import { listAccounts } from '@/db/repositories/accounts';
import { createTransfer } from '@/db/repositories/transfers';
import { getSetting, setSetting } from '@/db/repositories/settings';
import { listRates } from '@/db/repositories/fxRates';
import { buildRateLookup, convert } from '@/money/fx';
import { currencyDecimals } from '@/money/currencies';
import { remainder, rulesValid, splitAmounts, totalPercent, type SplitRule } from '@/rewards/split';
import { bumpData } from '@/state/dataVersion';
import type { Account } from '@/db/schema';
import type { AppTheme } from '@/theme';

const RULES_KEY = 'payday_split_rules';
const SOURCE_KEY = 'payday_split_source';

export default function PaydaySplitScreen() {
  const theme = useTheme<AppTheme>();
  const { spacing } = theme.tokens;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [rules, setRules] = useState<SplitRule[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [accs, rawRules, rawSource] = await Promise.all([listAccounts(false), getSetting(RULES_KEY), getSetting(SOURCE_KEY)]);
      setAccounts(accs);
      try {
        const parsed = rawRules ? (JSON.parse(rawRules) as SplitRule[]) : [];
        setRules(parsed.filter((r) => accs.some((a) => a.id === r.accountId)));
      } catch {
        setRules([]);
      }
      setSourceId(rawSource && accs.some((a) => a.id === rawSource) ? rawSource : accs[0]?.id ?? null);
    })();
  }, []);

  const source = accounts.find((a) => a.id === sourceId) ?? null;
  const currency = source?.currency ?? 'EGP';
  const options: SelectOption[] = accounts.map((a) => ({ key: a.id, label: `${a.name} (${a.currency})` }));
  const total = parseAmount(amount);
  const parts = splitAmounts(total, rules, currencyDecimals(currency));
  const left = remainder(total, parts, currencyDecimals(currency));
  const valid = rulesValid(rules);

  const updateRule = (i: number, patch: Partial<SplitRule>) =>
    setRules((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const apply = async () => {
    if (!source) return;
    if (total <= 0) {
      Alert.alert(t('common.required'), t('common.amount'));
      return;
    }
    if (!valid) {
      Alert.alert(t('split.title'), t('split.invalid'));
      return;
    }
    setBusy(true);
    try {
      const lookup = buildRateLookup(await listRates());
      const now = Date.now();
      for (const p of parts) {
        const target = accounts.find((a) => a.id === p.accountId)!;
        const r = convert(p.amount, source.currency, target.currency, lookup, source.currency);
        if (r.value == null || r.rate == null) {
          Alert.alert(t('split.title'), t('dashboard.missingRates'));
          return;
        }
        await createTransfer({
          from_account_id: source.id,
          to_account_id: target.id,
          from_amount: p.amount,
          to_amount: r.value,
          rate: r.rate,
          occurred_at: now,
          note: t('split.title'),
        });
      }
      await setSetting(RULES_KEY, JSON.stringify(rules));
      await setSetting(SOURCE_KEY, source.id);
      bumpData();
      router.back();
    } finally {
      setBusy(false);
    }
  };

  return (
    <EditorScaffold
      title={t('split.title')}
      subtitle={t('split.subtitle')}
      onSave={apply}
      saveDisabled={busy || accounts.length < 2}
      hero={<AmountInput value={amount} onChangeText={setAmount} currency={currency} sign="income" />}
    >
      <SelectField label={t('split.source')} value={sourceId} onChange={setSourceId} options={options} />

      <Eyebrow>{t('split.rules')}</Eyebrow>
      {rules.map((r, i) => (
        <View key={i} style={[styles.rule, { gap: spacing.sm }]}>
          <View style={{ flex: 1 }}>
            <SelectField
              label={t('tx.account')}
              value={r.accountId}
              onChange={(k) => updateRule(i, { accountId: k })}
              options={options.filter((o) => o.key !== sourceId)}
            />
          </View>
          <TextInput
            mode="outlined"
            label="%"
            keyboardType="decimal-pad"
            value={r.percent ? String(r.percent) : ''}
            onChangeText={(v) => updateRule(i, { percent: parseAmount(sanitizeDecimal(v)) })}
            style={styles.pct}
          />
          <IconButton icon="close" onPress={() => setRules((rs) => rs.filter((_, j) => j !== i))} />
        </View>
      ))}
      <Button
        mode="outlined"
        icon="plus"
        onPress={() => {
          const free = accounts.find((a) => a.id !== sourceId && !rules.some((r) => r.accountId === a.id));
          if (free) setRules((rs) => [...rs, { accountId: free.id, percent: 10 }]);
        }}
      >
        {t('split.addRule')}
      </Button>
      <HelperText type={valid || rules.length === 0 ? 'info' : 'error'} visible>
        {t('split.totalPercent', { n: Math.round(totalPercent(rules) * 100) / 100 })}
      </HelperText>

      {total > 0 && parts.length > 0 && (
        <View style={{ gap: spacing.xs }}>
          <Eyebrow>{t('split.preview')}</Eyebrow>
          {parts.map((p) => (
            <View key={p.accountId} style={styles.row}>
              <AppText>{accounts.find((a) => a.id === p.accountId)?.name ?? ''}</AppText>
              <MoneyText value={p.amount} currency={currency} />
            </View>
          ))}
          <View style={styles.row}>
            <AppText role="muted">{t('split.staysIn', { name: source?.name ?? '' })}</AppText>
            <MoneyText value={left} currency={currency} muted />
          </View>
        </View>
      )}
    </EditorScaffold>
  );
}

const styles = StyleSheet.create({
  rule: { flexDirection: 'row', alignItems: 'center' },
  pct: { width: 84 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
