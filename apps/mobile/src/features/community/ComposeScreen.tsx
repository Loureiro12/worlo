import { useTranslation } from '@worlo/i18n';
import {
  BottomBar,
  Button,
  Chip,
  ChipRow,
  colors,
  FormError,
  Icon,
  type IconName,
  makeStyles,
  Photo,
  Screen,
  ScreenHeader,
  Segmented,
  StarRating,
  Text,
  TextArea,
  TextField,
  useToast,
} from '@worlo/ui';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { usePublishPost, type Visibility } from '@/data/community';
import { useTrips } from '@/data/trips';
import { demoKey } from '@/mocks/demo';
import type { PostType } from '@/mocks/types';
import { routes } from '@/navigation/routes';
import {
  type PlaceKind,
  type PlaceOption,
  POST_TYPES,
  searchPlaces,
  TYPE_KEYS,
  useGoBack,
} from './model';

const MAX_TEXT = 500;
const MAX_PHOTOS = 4;
const MIN_TEXT = 10;

const TYPE_ICONS: Record<PostType, IconName> = {
  Dica: 'lightbulb',
  Avaliação: 'star',
  Roteiro: 'map-trifold',
  Pergunta: 'question',
};

const KIND_ICONS: Record<PlaceKind, IconName> = {
  country: 'flag',
  city: 'buildings',
  place: 'map-pin',
  tour: 'ticket',
};

type Missing = 'place' | 'rating' | 'text' | null;

type PickedPhoto = { uri: string; mimeType: string | null };

/** 04_INTERACTIONS → Publicar: lugar → nota (avaliação) → texto ≥ 10. */
export function firstMissing(form: {
  place: PlaceOption | null;
  type: PostType;
  rating: number;
  text: string;
}): Missing {
  if (!form.place) return 'place';
  if (form.type === 'Avaliação' && !form.rating) return 'rating';
  if (form.text.trim().length < MIN_TEXT) return 'text';
  return null;
}

const useStyles = makeStyles((t) => ({
  typeButton: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: t.radius.r16,
    borderWidth: 1,
  },
  selectedPlace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: t.radius.r12,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.text,
  },
  suggestions: { borderRadius: t.radius.r12, overflow: 'hidden' },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 44,
    backgroundColor: t.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.background,
  },
  thumbRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: t.colors.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: {
    width: 76,
    height: 76,
    borderRadius: t.radius.r12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: t.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
}));

/** I2 · Publicar (fullscreen). Params: type?, place?. */
export function ComposeScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const close = useGoBack();
  const params = useLocalSearchParams<{ type?: string; place?: string }>();
  const trips = useTrips();
  const publish = usePublishPost();

  const initialType = POST_TYPES.find((x) => x === params.type) ?? 'Dica';
  const [type, setType] = useState<PostType>(initialType);
  const [place, setPlace] = useState<PlaceOption | null>(
    params.place ? { title: params.place, kind: 'city' } : null,
  );
  const [query, setQuery] = useState('');
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [tripId, setTripId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [showError, setShowError] = useState(false);
  const [sending, setSending] = useState(false);

  const missing = firstMissing({ place, type, rating, text });
  const error = showError ? missing : null;
  const typeKey = TYPE_KEYS[type];
  /** Any edit clears the error (validated again on submit). */
  const edit =
    <A extends unknown[]>(fn: (...args: A) => void) =>
    (...args: A) => {
      setShowError(false);
      fn(...args);
    };

  /** System photo picker (no permission prompt needed); uploaded on publish. */
  const addPhoto = async () => {
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: room > 1,
        selectionLimit: room,
        quality: 0.8,
      });
      if (result.canceled) return;
      const picked = result.assets.map((a) => ({ uri: a.uri, mimeType: a.mimeType ?? null }));
      setPhotos((p) => [...p, ...picked].slice(0, MAX_PHOTOS));
    } catch {
      toast.show(t('community.errors.photoPermission'), 'info');
    }
  };

  const submit = async () => {
    if (missing || !place) {
      setShowError(true);
      return;
    }
    if (sending) return;
    setSending(true);
    const id = await publish({
      type,
      place: place.title,
      text,
      rating,
      photos,
      tripId,
      visibility,
    });
    setSending(false);
    if (!id) return;
    toast.show(t('community.compose.published'));
    router.replace(routes.post(id));
  };

  const suggestions = searchPlaces(query);

  return (
    <Screen
      testID="compose-screen"
      gap={20}
      header={
        <ScreenHeader
          overline={t('community.compose.overline')}
          onBack={close}
          backIcon="x"
          backLabel={t('common.actions.close')}
        />
      }
      bottomBar={
        <BottomBar>
          <Button
            testID="compose-submit"
            fullWidth
            flex={1}
            label={
              type === 'Pergunta'
                ? t('community.compose.ctaAsk')
                : t('community.compose.ctaPublish')
            }
            loading={sending}
            onPress={() => void submit()}
          />
        </BottomBar>
      }
    >
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('community.compose.typeLabel')}
        style={{ flexDirection: 'row', gap: 6 }}
      >
        {POST_TYPES.map((x) => {
          const on = x === type;
          const fg = on ? colors.onSelected : colors.text;
          return (
            <Pressable
              key={x}
              testID={`compose-type-${TYPE_KEYS[x]}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={t(`community.types.${TYPE_KEYS[x]}`)}
              onPress={edit(() => setType(x))}
              style={[
                styles.typeButton,
                {
                  backgroundColor: on ? colors.selected : colors.surface,
                  borderColor: on ? colors.selected : colors.border,
                },
              ]}
            >
              <Icon name={TYPE_ICONS[x]} size={22} color={fg} />
              <Text variant="caption" weight={700} style={{ fontSize: 12, color: fg }}>
                {t(`community.types.${TYPE_KEYS[x]}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {place ? (
        <View style={{ gap: 8 }}>
          <Text variant="label">{t('community.compose.where')}</Text>
          <View style={styles.selectedPlace} testID="compose-place-selected">
            <Icon name="map-pin" size={20} weight="fill" color={colors.primary} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="body" weight={700} numberOfLines={1}>
                {place.title}
              </Text>
              <Text variant="caption" tone="muted" style={{ fontSize: 12 }}>
                {t(`community.compose.kinds.${place.kind}`)}
              </Text>
            </View>
            <Pressable
              testID="compose-place-change"
              accessibilityRole="button"
              accessibilityLabel={t('community.compose.changeA11y')}
              hitSlop={10}
              onPress={edit(() => setPlace(null))}
            >
              <Text variant="caption" weight={700} tone="link">
                {t('community.compose.change')}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={{ gap: 6 }}>
          <TextField
            testID="compose-place"
            label={t('community.compose.where')}
            icon="map-pin"
            compact
            placeholder={t('community.compose.wherePlaceholder')}
            value={query}
            onChangeText={edit(setQuery)}
            invalid={error === 'place'}
          />
          <View style={styles.suggestions}>
            {suggestions.map((s) => (
              <Pressable
                key={`${s.kind}-${s.title}`}
                testID={`compose-place-option-${s.title}`}
                accessibilityRole="button"
                accessibilityLabel={`${s.title}, ${t(`community.compose.kinds.${s.kind}`)}`}
                onPress={edit(() => {
                  setPlace(s);
                  setQuery('');
                })}
                style={({ pressed }) => [
                  styles.suggestion,
                  pressed ? { backgroundColor: colors.background } : null,
                ]}
              >
                <Icon name={KIND_ICONS[s.kind]} size={18} color={colors.textMuted} />
                <Text variant="label" style={{ flex: 1 }} numberOfLines={1}>
                  {s.title}
                </Text>
                <Text variant="caption" tone="muted" style={{ fontSize: 12 }}>
                  {t(`community.compose.kinds.${s.kind}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {type === 'Avaliação' ? (
        <View style={{ gap: 8 }}>
          <Text variant="label">{t('community.compose.rating')}</Text>
          <StarRating
            testID="compose-rating"
            value={rating}
            onChange={edit(setRating)}
            starLabel={(n) => t('community.compose.star', { count: n })}
          />
        </View>
      ) : null}

      <TextArea
        testID="compose-text"
        label={t(`community.compose.textLabel.${typeKey}`)}
        placeholder={t(`community.compose.placeholder.${typeKey}`)}
        maxLength={MAX_TEXT}
        value={text}
        onChangeText={edit(setText)}
        invalid={error === 'text'}
      />

      <View style={{ gap: 8 }}>
        <Text variant="label">{t('community.compose.photos')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {photos.map(({ uri }, i) => (
            <Photo key={uri} uri={uri} tint={colors.border} width={76} height={76} radius={12}>
              <Pressable
                testID={`compose-photo-remove-${i}`}
                accessibilityRole="button"
                accessibilityLabel={t('community.compose.removePhoto')}
                hitSlop={8}
                onPress={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                style={styles.thumbRemove}
              >
                <Icon name="x" size={12} color={colors.onSelected} />
              </Pressable>
            </Photo>
          ))}
          {photos.length < MAX_PHOTOS ? (
            <Pressable
              testID="compose-photo-add"
              accessibilityRole="button"
              accessibilityLabel={`${t('community.compose.addPhoto')}, ${t('community.compose.photoCount', { n: photos.length })}`}
              onPress={() => void addPhoto()}
              style={styles.addPhoto}
            >
              <Icon name="camera-plus" size={22} color={colors.textSupport} />
              <Text variant="micro" tone="support">
                {t('community.compose.photoCount', { n: photos.length })}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text variant="label">
          {`${t('community.compose.trip')} `}
          <Text variant="label" weight={500} tone="muted">
            {t('community.compose.optional')}
          </Text>
        </Text>
        <ChipRow>
          <Chip
            label={t('community.compose.noTrip')}
            selected={tripId === null}
            onPress={() => setTripId(null)}
          />
          {trips.map((trip) => (
            <Chip
              key={trip.id}
              testID={`compose-trip-${demoKey(trip.id, 'trip')}`}
              label={trip.title}
              selected={tripId === trip.id}
              onPress={() => setTripId(trip.id)}
            />
          ))}
        </ChipRow>
      </View>

      <View style={{ gap: 8 }}>
        <Text variant="label">{t('community.compose.visibility')}</Text>
        <Segmented
          testID="compose-visibility"
          label={t('community.compose.visibility')}
          value={visibility}
          onChange={setVisibility}
          options={[
            { value: 'public', label: t('community.compose.public') },
            { value: 'friends', label: t('community.compose.friends') },
          ]}
        />
        <Text variant="caption" tone="muted" style={{ fontSize: 12, lineHeight: 17 }}>
          {t('community.compose.visibilityNote')}
        </Text>
      </View>

      {error ? (
        <FormError testID="compose-error" message={t(`community.compose.errors.${error}`)} />
      ) : null}
    </Screen>
  );
}
