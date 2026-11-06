import { useTranslation } from '@worlo/i18n';
import {
  Button,
  Chip,
  ChipRow,
  FormError,
  Icon,
  MoneyInput,
  parseMoney,
  Sheet,
  Text,
  TextArea,
  TextField,
} from '@worlo/ui';
import Storage from 'expo-sqlite/kv-store';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import type { Stop, Suggestion } from '@/mocks/types';
import {
  ACTIVITY_GROUPS,
  ACTIVITY_ICONS,
  ACTIVITY_TIMES,
  type ActivityGroup,
  type ActivityKind,
  groupOf,
  NAMED_KINDS,
  normalizeTime,
} from './activities';

type Form = {
  kind: ActivityKind;
  title: string;
  time: string;
  duration: string;
  note: string;
  cost: string;
};

const EMPTY: Form = { kind: 'custom', title: '', time: '', duration: '', note: '', cost: '' };
const TITLE_MAX = 120;

const draftKey = (key: string) => `worlo.activity-draft.${key}`;

function readDraft(key: string): Form | null {
  try {
    const raw = Storage.getItemSync(draftKey(key));
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Form>) } : null;
  } catch {
    return null;
  }
}

/**
 * "Adicionar atividade": anything the person wants to do that day. The groups
 * (alimentação, descanso, hospedagem, passeio) and the catalog suggestions are
 * shortcuts that fill the form; nothing limits what can be typed. What is
 * typed is kept on the device as it is typed (`draft`), so closing the sheet or
 * the app does not lose it.
 */
export function ActivitySheet({
  visible,
  onClose,
  onSave,
  title,
  draft,
  suggestions = [],
  suggestionsTitle,
  testID = 'activity-sheet',
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (stop: Stop) => void;
  title: string;
  /** Where the draft is kept (e.g. itinerary + day). */
  draft: string;
  suggestions?: readonly Suggestion[];
  suggestionsTitle?: string;
  testID?: string;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<Form>(EMPTY);
  const [group, setGroup] = useState<ActivityGroup>('other');
  const [error, setError] = useState<'title' | 'time' | null>(null);

  // Opening restores what was being typed for this day.
  useEffect(() => {
    if (!visible) return;
    const saved = readDraft(draft) ?? EMPTY;
    setForm(saved);
    setGroup(groupOf(saved.kind));
    setError(null);
  }, [visible, draft]);

  const update = (patch: Partial<Form>) => {
    setForm((current) => {
      const next = { ...current, ...patch };
      try {
        Storage.setItemSync(draftKey(draft), JSON.stringify(next));
      } catch {
        // The form still works without a draft.
      }
      return next;
    });
    setError(null);
  };

  const presetTitle = (kind: ActivityKind) =>
    NAMED_KINDS.includes(kind) ? '' : t(`planning.activity.kinds.${kind}`);

  const pickKind = (kind: ActivityKind) => {
    // Keep what the person typed; only replace a title that came from a shortcut.
    const typed = form.title.trim() && form.title !== presetTitle(form.kind);
    update({
      kind,
      title: typed ? form.title : presetTitle(kind),
      // A time that came from the previous shortcut follows the new one.
      time:
        !form.time || form.time === ACTIVITY_TIMES[form.kind]
          ? (ACTIVITY_TIMES[kind] ?? '')
          : form.time,
    });
  };

  const pickGroup = (key: ActivityGroup) => {
    setGroup(key);
    const first = ACTIVITY_GROUPS.find((g) => g.key === key)?.kinds[0];
    if (first) pickKind(first);
  };

  const pickSuggestion = (sg: Suggestion) =>
    update({
      kind: 'custom',
      title: sg.title,
      note: sg.note,
      cost: sg.cost ? String(sg.cost) : '',
    });

  const save = () => {
    const name = form.title.trim();
    if (!name) return setError('title');
    const time = normalizeTime(form.time);
    if (time === null) return setError('time');
    const duration = form.kind === 'rest' ? form.duration.trim() : '';
    onSave({
      time: time || t('planning.roteiro.defaultTime'),
      icon: ACTIVITY_ICONS[form.kind],
      title: name.slice(0, TITLE_MAX),
      note: form.note.trim(),
      cost: parseMoney(form.cost),
      kind: form.kind,
      ...(duration ? { duration } : {}),
    });
    try {
      Storage.removeItemSync(draftKey(draft));
    } catch {
      // Nothing to clean.
    }
    setForm(EMPTY);
  };

  const kinds = ACTIVITY_GROUPS.find((g) => g.key === group)?.kinds ?? [];
  const named = NAMED_KINDS.includes(form.kind);

  return (
    <Sheet
      testID={testID}
      visible={visible}
      onClose={onClose}
      closeLabel={t('common.actions.close')}
      title={title}
      footer={
        <Button
          testID={`${testID}-save`}
          fullWidth
          label={t('planning.activity.save')}
          onPress={save}
        />
      }
    >
      <View style={{ gap: 14 }}>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t('planning.activity.groupsLabel')}
        >
          <ChipRow>
            {ACTIVITY_GROUPS.map((g) => (
              <Chip
                key={g.key}
                testID={`activity-group-${g.key}`}
                icon={g.icon}
                label={t(`planning.activity.groups.${g.key}`)}
                selected={group === g.key}
                onPress={() => pickGroup(g.key)}
              />
            ))}
          </ChipRow>
        </View>
        {kinds.length > 1 ? (
          <ChipRow>
            {kinds.map((kind) => (
              <Chip
                key={kind}
                testID={`activity-kind-${kind}`}
                icon={ACTIVITY_ICONS[kind]}
                label={t(`planning.activity.kinds.${kind}`)}
                selected={form.kind === kind}
                onPress={() => pickKind(kind)}
              />
            ))}
          </ChipRow>
        ) : null}

        <TextField
          testID="activity-title"
          compact
          label={
            form.kind === 'tour' ? t('planning.activity.tourName') : t('planning.activity.title')
          }
          placeholder={
            form.kind === 'tour'
              ? t('planning.activity.tourPlaceholder')
              : named
                ? t('planning.activity.titlePlaceholder')
                : undefined
          }
          value={form.title}
          maxLength={TITLE_MAX}
          invalid={error === 'title'}
          onChangeText={(title) => update({ title })}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <TextField
              testID="activity-time"
              compact
              label={t('planning.activity.time')}
              placeholder="09:00"
              keyboardType="numbers-and-punctuation"
              value={form.time}
              maxLength={5}
              invalid={error === 'time'}
              onChangeText={(time) => update({ time })}
            />
          </View>
          {form.kind === 'rest' ? (
            <View style={{ flex: 1 }}>
              <TextField
                testID="activity-duration"
                compact
                label={t('planning.activity.duration')}
                placeholder={t('planning.activity.durationPlaceholder')}
                value={form.duration}
                maxLength={30}
                onChangeText={(duration) => update({ duration })}
              />
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <MoneyInput
                testID="activity-cost"
                label={t('planning.activity.cost')}
                currency="R$"
                placeholder="0"
                value={form.cost}
                onChangeText={(cost) => update({ cost })}
              />
            </View>
          )}
        </View>
        <TextArea
          testID="activity-note"
          label={t('planning.activity.note')}
          placeholder={t('planning.activity.notePlaceholder')}
          maxLength={300}
          minHeight={72}
          value={form.note}
          onChangeText={(note) => update({ note })}
        />
        {error ? (
          <FormError testID="activity-error" message={t(`planning.activity.errors.${error}`)} />
        ) : null}

        {suggestions.length ? (
          <View style={{ gap: 8 }}>
            <Text variant="overline" tone="muted">
              {suggestionsTitle ?? t('planning.activity.suggestions')}
            </Text>
            {suggestions.map((sg, i) => (
              <Pressable
                key={sg.title}
                testID={`roteiro-sug-${i}`}
                accessibilityRole="button"
                accessibilityLabel={t('planning.activity.useSuggestion', { title: sg.title })}
                onPress={() => pickSuggestion(sg)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 8,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Icon name={sg.icon} size={20} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="body" weight={700} numberOfLines={1}>
                    {sg.title}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {sg.note}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}

/** "1 h de descanso · Levar protetor": what a stop's subtitle shows. */
export function stopSubtitle(
  stop: Pick<Stop, 'note' | 'duration'>,
  t: (key: 'planning.activity.durationShort', options: { duration: string }) => string,
): string {
  return [
    stop.duration ? t('planning.activity.durationShort', { duration: stop.duration }) : '',
    stop.note,
  ]
    .filter(Boolean)
    .join(' · ');
}
