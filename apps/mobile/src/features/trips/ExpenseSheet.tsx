import { useTranslation } from '@worlo/i18n';
import {
  Button,
  Chip,
  colors,
  FormError,
  Icon,
  MoneyInput,
  parseMoney,
  radius,
  Sheet,
  Text,
  TextField,
  useToast,
} from '@worlo/ui';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { tripsData } from '@/data/trips';
import { firstName, joinNames } from '@/lib/people';
import type { Trip } from '@/mocks/types';
import { EXPENSE_CATEGORIES, type ExpenseCategoryKey, formatAmount, splitShare } from './money';

type Draft = {
  value: string;
  name: string;
  cat: ExpenseCategoryKey;
  split: string[];
  receipt: boolean;
};

const blank: Draft = { value: '', name: '', cat: 'food', split: [], receipt: false };

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
  const [error, setError] = useState<'value' | 'name' | null>(null);

  const collaborators = trip.collab.filter((c) => c.status === 'ok').map((c) => c.name);
  const amount = parseMoney(draft.value);
  const each = splitShare(amount, draft.split.length);
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
    const category = EXPENSE_CATEGORIES.find((c) => c.key === draft.cat) ?? EXPENSE_CATEGORIES[1];
    const label = t(`trips.money.categories.${category.key}`);
    const names = joinNames(draft.split.map(firstName), and);
    tripsData.addExpense(trip.id, {
      icon: category.icon,
      name: draft.name.trim(),
      meta: draft.split.length
        ? t('trips.expense.metaSplit', { category: label, names })
        : t('trips.expense.meta', { category: label }),
      val: formatAmount(amount, currency),
      receipt: draft.receipt,
      amount,
      cat: category.name,
      split: draft.split,
    });
    toast.show(
      draft.split.length
        ? t('trips.expense.savedSplit', {
            count: draft.split.length,
            names,
            value: formatAmount(each, currency),
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
      {collaborators.length ? (
        <View style={{ gap: 8 }}>
          <Text variant="label">{t('trips.expense.splitWith')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {collaborators.map((name) => {
              const on = draft.split.includes(name);
              return (
                <Chip
                  key={name}
                  testID={`expense-split-${firstName(name)}`}
                  label={firstName(name)}
                  selected={on}
                  onPress={() =>
                    update({
                      split: on ? draft.split.filter((n) => n !== name) : [...draft.split, name],
                    })
                  }
                />
              );
            })}
          </View>
          {draft.split.length && amount > 0 ? (
            <Text testID="expense-split-text" variant="caption" weight={700} tone="success">
              {t('trips.expense.splitText', {
                value: formatAmount(each, currency),
                count: draft.split.length + 1,
              })}
            </Text>
          ) : null}
        </View>
      ) : null}
      <Pressable
        testID="expense-receipt"
        accessibilityRole="switch"
        accessibilityState={{ checked: draft.receipt }}
        accessibilityLabel={t('trips.expense.receiptAttach')}
        onPress={() => update({ receipt: !draft.receipt })}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: radius.r16,
          borderWidth: 1,
          borderStyle: draft.receipt ? 'solid' : 'dashed',
          borderColor: draft.receipt ? colors.success : colors.border,
        }}
      >
        <Icon
          name={draft.receipt ? 'receipt' : 'camera'}
          weight={draft.receipt ? 'fill' : 'regular'}
          size={22}
          color={draft.receipt ? colors.success : colors.textMuted}
        />
        <Text variant="body" weight={600} style={{ flex: 1 }}>
          {draft.receipt ? t('trips.expense.receiptAttached') : t('trips.expense.receiptAttach')}
        </Text>
      </Pressable>
      {error ? (
        <FormError
          testID="expense-error"
          message={
            error === 'value' ? t('trips.expense.errorAmount') : t('trips.expense.errorName')
          }
        />
      ) : null}
    </Sheet>
  );
}
