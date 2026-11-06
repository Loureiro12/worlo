import { useTranslation } from '@worlo/i18n';
import {
  Avatar,
  BottomBar,
  Button,
  Chip,
  colors,
  FormError,
  Icon,
  palette,
  radius,
  Screen,
  ScreenHeader,
  Segmented,
  Text,
  TextField,
  useToast,
} from '@worlo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { DestinationField } from '@/components/DestinationField';
import {
  collab as collabData,
  createInviteLink,
  OfflineError,
  useInviteCandidates,
} from '@/data/collab';
import { useSearchPeople } from '@/data/community';
import { getCurrentUserId } from '@/data/repositories';
import { tripsData, useTrip } from '@/data/trips';
import { world } from '@/data/world';
import { avatarFor, firstName, joinNames } from '@/lib/people';
import { countryInfo, type Place } from '@/lib/places';
import { links, useCopyLink } from '@/lib/useCopyLink';
import type { Collaborator } from '@/mocks/types';
import { routes, type TripFormParams } from '@/navigation/routes';
import { useStore } from '@/store';
import {
  matchCountry,
  splitDestination,
  type TripFormError,
  tripFormError,
  yearOf,
} from './destination';
import { CollabNote, FriendSuggestions, suggestFriends, toCandidate } from './parts';

type Kind = TripFormParams['kind'];
type Mode = TripFormParams['mode'];

const TRIP_TYPES = ['solo', 'couple', 'family', 'friends', 'work'] as const;
const EXPERIENCES = ['beach', 'trail', 'museum', 'show', 'boat', 'nightlife', 'party'] as const;

type Params = { mode?: string; kind?: string; id?: string; dest?: string };

/**
 * A7 · Cadastro da viagem: onboarding (Passo 2 de 2), Nova viagem, Novo destino
 * and Editar. Destination + name are required; collaborators start pending.
 */
export function TripFormScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const copyLink = useCopyLink();
  const following = useInviteCandidates();
  const meId = getCurrentUserId();
  const params = useLocalSearchParams<Params>();
  const mode: Mode = params.mode === 'onboarding' || params.mode === 'edit' ? params.mode : 'new';
  const editing = useTrip(mode === 'edit' ? params.id : undefined);

  const [kind, setKind] = useState<Kind>(
    mode === 'edit' ? 'past' : params.kind === 'future' ? 'future' : 'past',
  );
  const [dest, setDest] = useState(
    editing
      ? editing.country
        ? `${editing.place}, ${editing.country}`
        : editing.place
      : (params.dest ?? ''),
  );
  const [picked, setPicked] = useState<Place | null>(null);
  const [name, setName] = useState(editing?.title ?? '');
  const [when, setWhen] = useState(editing?.period ?? '');
  // Who went / goes: accounts (user id) and legacy free-text names; the owner is not editable here.
  const [collab, setCollab] = useState<Collaborator[]>(
    editing?.collab.filter((c) => !c.owner) ?? [],
  );
  const names = collab.map((c) => c.name);
  const [query, setQuery] = useState('');
  const found = useSearchPeople(query);
  const [types, setTypes] = useState<string[]>([]);
  const [food, setFood] = useState('');
  const [shopping, setShopping] = useState('');
  const [experiences, setExperiences] = useState<string[]>([]);
  const [error, setError] = useState<TripFormError | null>(null);

  const and = t('common.list.and');
  const isPast = kind === 'past';
  const overline =
    mode === 'onboarding'
      ? t('tripForm.overline.onboarding')
      : mode === 'edit'
        ? t('tripForm.overline.edit')
        : isPast
          ? t('tripForm.overline.newPast')
          : t('tripForm.overline.newFuture');
  const copyKey = mode === 'edit' ? 'edit' : kind;

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  // The link points at a saved trip: a new one has to exist on the server first.
  const shareLink = async () => {
    if (!editing) {
      toast.show(t('tripForm.collab.saveFirst'), 'info');
      return;
    }
    try {
      const token = await createInviteLink('trip', editing.id);
      await copyLink(links.tripInvite(token), t('tripForm.collab.linkCopied'));
    } catch (e) {
      toast.show(
        e instanceof OfflineError ? t('common.states.offlineTitle') : t('common.states.errorTitle'),
        'info',
      );
    }
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace(routes.trips));

  const save = () => {
    const invalid = tripFormError({ dest, name });
    if (invalid) {
      setError(invalid);
      return;
    }
    const state = useStore.getState();
    // A place picked from the search knows its country; typed text is matched.
    const cid = picked?.countryId ?? matchCountry(dest, state.countryNames);
    const { place, country } =
      picked?.kind === 'city'
        ? { place: picked.name, country: picked.countryName }
        : picked?.kind === 'country'
          ? { place: picked.name, country: '' }
          : splitDestination(dest);
    const flagOfDest =
      picked?.flag ?? (cid ? (countryInfo(cid, i18n.language)?.flag ?? '📍') : '📍');
    const firstNames = (names: string[]) => joinNames(names.map(firstName), and);

    const accounts = collab.flatMap((c) => (c.userId ? [c.userId] : []));

    if (mode === 'edit' && editing) {
      const old = editing.collab.filter((c) => !c.owner);
      const added = collab.filter((c) => !old.some((o) => o.name === c.name));
      const removed = old.filter((o) => !collab.some((c) => c.name === o.name));
      const year = yearOf(when);
      tripsData.updateTrip(editing.id, {
        title: name.trim(),
        place,
        country,
        period: when.trim() || editing.period,
        year: year ?? editing.year,
        collab,
      });
      if (editing.isOwner) {
        for (const r of removed) if (r.userId) collabData.remove('trip', editing.id, r.userId);
      }
      if (editing.canEdit) collabData.invite('trip', editing.id, accounts);
      close();
      toast.show(
        added.length
          ? t('tripForm.toasts.updatedInvited', { names: firstNames(added.map((c) => c.name)) })
          : t('tripForm.toasts.updated'),
      );
      return;
    }

    if (kind === 'future') {
      // Created first (offline OK), then the invites point at it.
      const wish = world.addFuture({
        countryIso: cid ?? null,
        name: name.trim(),
        flag: flagOfDest,
        note: t('tripForm.defaults.destNote', { dest: dest.trim() }),
        tint: palette.coral100,
        collab,
      });
      collabData.invite('wish', wish.id, accounts);
      state.setTripsSegment('wish');
      router.replace(routes.trips);
      toast.show(
        collab.length
          ? t('tripForm.toasts.futureInvited', { names: firstNames(names) })
          : t('tripForm.toasts.futureSaved'),
      );
      return;
    }

    const year = yearOf(when) ?? String(new Date().getFullYear());
    const created = tripsData.addTrip({
      title: name.trim(),
      place,
      country,
      countryIso: cid ?? null,
      flag: flagOfDest,
      period: when.trim() || t('tripForm.defaults.period'),
      year,
      days: 1,
      photos: 0,
      places: 1,
      collab,
      people: '',
      total: '—',
      tint: palette.coral300,
    });
    collabData.invite('trip', created.id, accounts);
    // Light up the countries on the map (the ones already visited stay as they are).
    const light = new Set<string>(cid ? [cid] : []);
    if (mode === 'onboarding') for (const id of state.onboardingVisited) light.add(id);
    world.markManyVisited([...light], year);
    state.setTripsSegment('past');

    if (mode === 'onboarding') {
      router.replace(routes.firstMap);
      return;
    }
    router.replace(routes.trips);
    toast.show(
      collab.length
        ? t('tripForm.toasts.pastInvited', { names: firstNames(names) })
        : t('tripForm.toasts.pastSaved'),
    );
  };

  return (
    <Screen
      testID="trip-form-screen"
      gap={20}
      header={
        <ScreenHeader overline={overline} onBack={close} backLabel={t('common.actions.back')} />
      }
      bottomBar={
        <BottomBar>
          <Button
            testID="trip-form-save"
            label={t(`tripForm.save.${copyKey}`)}
            fullWidth
            flex={1}
            onPress={save}
          />
        </BottomBar>
      }
    >
      <View style={{ gap: 8 }}>
        <Text variant="h1Detail">{t(`tripForm.title.${copyKey}`)}</Text>
        <Text variant="body" tone="muted">
          {t(`tripForm.sub.${copyKey}`)}
        </Text>
      </View>
      {mode !== 'edit' ? (
        <Segmented<Kind>
          testID="trip-form-kind"
          label={t('tripForm.kind.label')}
          value={kind}
          onChange={(k) => {
            setKind(k);
            setError(null);
          }}
          options={[
            { value: 'past', label: t('tripForm.kind.past') },
            { value: 'future', label: t('tripForm.kind.future') },
          ]}
        />
      ) : null}
      <DestinationField
        testID="trip-form-dest"
        label={t('tripForm.dest')}
        placeholder={t('tripForm.destPlaceholder')}
        value={dest}
        invalid={error === 'dest'}
        onChangeText={(text) => {
          setDest(text);
          setError(null);
        }}
        onPick={setPicked}
      />
      <TextField
        testID="trip-form-name"
        label={t(`tripForm.name.${kind}`)}
        placeholder={t(`tripForm.namePlaceholder.${kind}`)}
        value={name}
        invalid={error === 'name'}
        onChangeText={(text) => {
          setName(text);
          setError(null);
        }}
      />
      {error ? (
        <View style={{ marginTop: -8 }}>
          <FormError testID="trip-form-error" message={t(`tripForm.errors.${error}`)} />
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <Text variant="label">{t(`tripForm.collab.${kind}`)}</Text>
        <CollabNote />
        {collab.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {names.map((person) => (
              <View
                key={person}
                testID={`trip-form-collab-${firstName(person)}`}
                style={{
                  height: 40,
                  paddingLeft: 4,
                  paddingRight: 6,
                  borderRadius: radius.full,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.text,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Avatar {...avatarFor(person)} size={30} />
                <Text variant="label" weight={700}>
                  {firstName(person)}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('tripForm.collab.remove', { name: person })}
                  hitSlop={8}
                  onPress={() => setCollab((c) => c.filter((x) => x.name !== person))}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: colors.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="x" size={13} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        <TextField
          testID="trip-form-search"
          label={t('trips.people.search')}
          hideLabel
          compact
          icon="magnifying-glass"
          placeholder={t('trips.people.search')}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        <FriendSuggestions
          friends={suggestFriends(
            following,
            [...collab.flatMap((c) => (c.userId ? [c.userId] : [])), ...(meId ? [meId] : [])],
            query,
            found.map(toCandidate),
          )}
          onInvite={(f) => {
            setCollab((c) => [...c, { name: f.name, status: 'pending', userId: f.id }]);
            setQuery('');
          }}
        />
        <Button
          variant="ghost"
          icon="link"
          label={t('tripForm.collab.inviteLink')}
          onPress={() => void shareLink()}
        />
      </View>

      {isPast ? (
        <View style={{ gap: 20 }}>
          <TextField
            testID="trip-form-when"
            label={t('tripForm.when')}
            placeholder={t('tripForm.whenPlaceholder')}
            value={when}
            onChangeText={setWhen}
          />
          <ChipGroup
            label={t('tripForm.tripType')}
            options={TRIP_TYPES.map((k) => ({ key: k, label: t(`tripForm.types.${k}`) }))}
            selected={types}
            onToggle={(k) => setTypes((list) => toggle(list, k))}
          />
          <TextField
            label={t('tripForm.food')}
            placeholder={t('tripForm.foodPlaceholder')}
            value={food}
            onChangeText={setFood}
          />
          <TextField
            label={t('tripForm.shopping')}
            placeholder={t('tripForm.shoppingPlaceholder')}
            value={shopping}
            onChangeText={setShopping}
          />
          <ChipGroup
            label={t('tripForm.experiences')}
            options={EXPERIENCES.map((k) => ({ key: k, label: t(`tripForm.exp.${k}`) }))}
            selected={experiences}
            onToggle={(k) => setExperiences((list) => toggle(list, k))}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: radius.r16,
              backgroundColor: colors.surface,
            }}
          >
            <Icon name="images" size={24} color={colors.link} />
            <View style={{ flex: 1 }}>
              <Text variant="label">{t('tripForm.photosTitle')}</Text>
              <Text variant="caption" tone="muted" weight={400}>
                {t('tripForm.photosText')}
              </Text>
            </View>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { key: string; label: string }[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text variant="label">{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => (
          <Chip
            key={o.key}
            label={o.label}
            selected={selected.includes(o.key)}
            onPress={() => onToggle(o.key)}
          />
        ))}
      </View>
    </View>
  );
}
