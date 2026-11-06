import { useTranslation } from '@worlo/i18n';
import {
  Button,
  Chip,
  FormError,
  MoneyInput,
  parseMoney,
  Sheet,
  Text,
  TextField,
  useToast,
} from '@worlo/ui';
import { useState } from 'react';
import { View } from 'react-native';
import { getCurrentUserId } from '@/data/repositories';
import { tripParties, tripsData } from '@/data/trips';
import { firstName, joinNames } from '@/lib/people';
import type { Trip } from '@/mocks/types';
import { EXPENSE_CATEGORIES, type ExpenseCategoryKey, formatAmount } from './money';

type Draft = {
  value: string;
  name: string;
  cat: ExpenseCategoryKey;
  /** Who paid (party key); null = me. */
  paidBy: string | null;
  /** Who took part (party keys); null = everyone. */
  participants: string[] | null;
};

const blank: Draft = { value: '', name: '', cat: 'food', paidBy: null, participants: null };

/**
 * Sheet "Novo gasto" (F5): amount, description, category, split with accepted
 * collaborators and receipt. Saved in SQLite; totals are derived from it.
 */
export function ExpenseSheet({
  trip,
  currency,
  visible,
  onClose,
  onSaved,
}: {
  trip: Trip;
  currency: string;
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(blank);
  const [error, setError] = useState<'value' | 'name' | 'participants' | null>(null);

  // Divisão: anyone on the trip can have paid, and any of them can take part.
  const parties = tripParties(trip.collab, getCurrentUserId(), t('trips.split.you'));
  const shared = parties.length > 1;
  const payer = draft.paidBy ?? parties[0]?.key ?? '';
  const participants = draft.participants ?? parties.map((p) => p.key);
  const amount = parseMoney(draft.value);
  const each = participants.length ? amount / participants.length : amount;
  const nameOf = (key: string) => parties.find((p) => p.key === key)?.name ?? '';
  const and = t('common.list.and');

  const update = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError(null);
  };

  const close = () => {
    setDraft(blank);
    setError(null);
    onClose();
  };

  const save = () => {
    if (!(amount > 0)) return setError('value');
    if (!draft.name.trim()) return setError('name');
    if (shared && participants.length === 0) return setError('participants');
    const category = EXPENSE_CATEGORIES.find((c) => c.key === draft.cat) ?? EXPENSE_CATEGORIES[1];
    const label = t(`trips.money.categories.${category.key}`);
    tripsData.addExpense(trip.id, {
      icon: category.icon,
      name: draft.name.trim(),
      meta: shared
        ? t('trips.split.meta', {
            category: label,
            payer: firstName(nameOf(payer)),
            count: participants.length,
          })
        : t('trips.expense.meta', { category: label }),
      val: formatAmount(amount, currency),
      receipt: false,
      amount,
      cat: category.name,
      split: shared ? participants : [],
      paidBy: shared ? payer : null,
    });
    toast.show(
      shared
        ? t('trips.split.saved', {
            value: formatAmount(each, currency),
            names: joinNames(
              participants.map((k) => firstName(nameOf(k))),
              and,
            ),
          })
        : t('trips.expense.saved'),
    );
    close();
    onSaved?.();
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={t('trips.expense.title')}
      subtitle={trip.title}
      testID="expense-sheet"
      closeLabel={t('common.actions.close')}
      footer={
        <Button testID="expense-save" label={t('trips.expense.save')} fullWidth onPress={save} />
      }
    >
      <MoneyInput
        testID="expense-amount"
        label={t('trips.expense.amount')}
        currency={currency}
        value={draft.value}
        onChangeText={(value) => update({ value })}
        invalid={error === 'value'}
        aria-invalid={error === 'value'}
      />
      <TextField
        testID="expense-name"
        compact
        label={t('trips.expense.description')}
        placeholder={t('trips.expense.descriptionPlaceholder')}
        value={draft.name}
        onChangeText={(name) => update({ name })}
        invalid={error === 'name'}
      />
      <View style={{ gap: 8 }}>
        <Text variant="label">{t('trips.expense.category')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {EXPENSE_CATEGORIES.map((c) => (
            <Chip
              key={c.key}
              testID={`expense-cat-${c.key}`}
              icon={c.icon}
              label={t(`trips.money.categories.${c.key}`)}
              selected={draft.cat === c.key}
              onPress={() => update({ cat: c.key })}
            />
          ))}
        </View>
      </View>
      {shared ? (
        <>
          <View style={{ gap: 8 }}>
            <Text variant="label">{t('trips.split.paidBy')}</Text>
            <View
              accessibilityRole="radiogroup"
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
            >
              {parties.map((p) => (
                <Chip
                  key={p.key}
                  testID={`expense-payer-${firstName(p.name)}`}
                  label={firstName(p.name)}
                  selected={payer === p.key}
                  onPress={() => update({ paidBy: p.key })}
                />
              ))}
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <Text variant="label">{t('trips.split.participants')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {parties.map((p) => {
                const on = participants.includes(p.key);
                return (
                  <Chip
                    key={p.key}
                    testID={`expense-split-${firstName(p.name)}`}
                    label={firstName(p.name)}
                    selected={on}
                    onPress={() =>
                      update({
                        participants: on
                          ? participants.filter((k) => k !== p.key)
                          : [...participants, p.key],
                      })
                    }
                  />
                );
              })}
            </View>
            {participants.length && amount > 0 ? (
              <Text testID="expense-split-text" variant="caption" weight={700} tone="success">
                {t('trips.expense.splitText', {
                  value: formatAmount(each, currency),
                  count: participants.length,
                })}
              </Text>
            ) : null}
          </View>
        </>
      ) : null}
      {error ? (
        <FormError
          testID="expense-error"
          message={
            error === 'value'
              ? t('trips.expense.errorAmount')
              : error === 'name'
                ? t('trips.expense.errorName')
                : t('trips.split.errorParticipants')
          }
        />
      ) : null}
    </Sheet>
  );
}
