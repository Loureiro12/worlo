import { useTranslation } from '@worlo/i18n';
import {
  Avatar,
  AvatarStack,
  Button,
  colors,
  EmptyState,
  Globe,
  Icon,
  initialsOf,
  makeStyles,
  Photo,
  Screen,
  ScreenHeader,
  Segmented,
  Text,
  useToast,
} from '@worlo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { DemoGate } from '@/components/DemoGate';
import { img } from '@/lib/images';
import { firstName, joinNames } from '@/lib/people';
import { CITIES, FRIENDS, POSTS, TRAVELERS } from '@/mocks/data.generated';
import type { Trip } from '@/mocks/types';
import { routes } from '@/navigation/routes';
import { useStore } from '@/store';
import { ConfirmLine, FollowPill } from './components';
import { personAvatar, TYPE_KEYS, useGoBack } from './model';

type Tab = 'trips' | 'tips';

type TripCard = {
  key: string;
  title: string;
  flag: string;
  meta: string;
  uri: string;
  /** Names of the other people on a shared trip ('me' = the user). */
  with: string[];
  tripId?: string;
};

const useStyles = makeStyles((t) => ({
  meStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: t.radius.r16,
    backgroundColor: t.colors.backgroundDark,
  },
  globeCard: {
    height: 200,
    borderRadius: t.radius.r24,
    backgroundColor: t.colors.backgroundDark,
    overflow: 'hidden',
  },
  globeText: {
    position: 'absolute',
    left: 18,
    top: 18,
    bottom: 18,
    justifyContent: 'space-between',
  },
  messageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tip: { padding: 16, borderRadius: t.radius.r16, backgroundColor: t.colors.surface, gap: 8 },
}));

/** G2 · Perfil público. `id` = TRAVELERS key or 'me' ("Ver como outros veem"). */
export function TravelerScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const back = useGoBack();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const isMe = id === 'me';
  const me = useStore((s) => s.me);
  const visitedMap = useStore((s) => s.visitedMap);
  const privacy = useStore((s) => s.privacy);
  const trips = useStore((s) => s.trips);
  const myPosts = useStore((s) => s.myPosts);
  const followed = useStore((s) => Boolean(s.following[id]));
  const toggleFollow = useStore((s) => s.toggleFollow);
  const [tab, setTab] = useState<Tab>('trips');

  const known = TRAVELERS[id];
  const friend = FRIENDS.find((f) => f.name === id);
  const name = isMe ? me.name : id;
  const first = firstName(name);
  const profile = isMe
    ? {
        ini: initialsOf(me.name),
        handle: `@${me.user}`,
        city: me.city,
        bio: me.bio,
        countries: Object.keys(visitedMap),
        cities: CITIES.length - 1,
      }
    : {
        ini: known?.ini ?? friend?.ini ?? initialsOf(id),
        handle: known?.handle ?? friend?.handle ?? '',
        city: known?.city ?? '',
        bio: known?.bio ?? '',
        countries: known?.countries ?? [],
        cities: known?.cities ?? 0,
      };

  const okNames = (trip: Trip) => trip.collab.filter((c) => c.status === 'ok').map((c) => c.name);
  const tripCard = (trip: Trip, others: string[]): TripCard => ({
    key: trip.id,
    title: trip.title,
    flag: trip.flag,
    meta: `${trip.place} · ${trip.year}`,
    uri: img(`${trip.id}-a`, 300, 380),
    with: others,
    tripId: trip.id,
  });
  // Trips shared with the user show who else went ("com Ana e Caio").
  const shared: TripCard[] = isMe
    ? trips.map((trip) => tripCard(trip, okNames(trip)))
    : trips
        .filter((trip) => okNames(trip).includes(id))
        .map((trip) => tripCard(trip, ['me', ...okNames(trip).filter((n) => n !== id)]));
  const own: TripCard[] = (known?.trips ?? []).map((trip) => ({
    key: `tv-${trip.title}`,
    title: trip.title,
    flag: trip.flag,
    meta: trip.meta,
    uri: img(`tv-${trip.title}`, 300, 380),
    with: [],
  }));
  const cards = isMe ? shared : [...shared, ...own];
  // Prototype: others also have older trips that aren't on the public grid (+6).
  const tripCount = isMe ? trips.length : own.length + shared.length + (known ? 6 : 0);
  const posts = isMe ? myPosts : POSTS.filter((p) => p.author === id);

  const onFollow = () => {
    if (!followed) toast.show(t('community.traveler.followed', { name: first }));
    toggleFollow(id);
  };

  const stats = [
    { n: profile.countries.length, key: 'countries' },
    { n: profile.cities, key: 'cities' },
    { n: tripCount, key: 'trips' },
  ] as const;

  return (
    <DemoGate network onBack={back}>
      <Screen
        testID="traveler-screen"
        withTabBar
        gap={20}
        header={
          <ScreenHeader
            overline={isMe ? t('community.traveler.overlineMe') : t('community.traveler.overline')}
            onBack={back}
            backLabel={t('common.actions.back')}
          />
        }
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Avatar
            {...personAvatar(name, isMe, isMe ? me.avatar : undefined)}
            initials={profile.ini}
            size={72}
          />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text variant="h2" testID="traveler-name">
              {name}
            </Text>
            <Text variant="bodyS" tone="muted">
              {[profile.handle, profile.city].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>
        {profile.bio ? (
          <Text variant="body" tone="support" style={{ marginTop: -6 }}>
            {profile.bio}
          </Text>
        ) : null}

        {isMe ? (
          <View style={styles.meStrip} testID="traveler-me-strip">
            <Icon name="eye" size={20} color={colors.accentOnDark} />
            <Text variant="caption" tone="inverse" style={{ flex: 1 }}>
              {t('community.traveler.meStrip', {
                privacy: t(`community.traveler.privacy.${privacy}`),
              })}
            </Text>
          </View>
        ) : null}

        {isMe ? (
          <Button
            testID="traveler-edit"
            variant="outline"
            size="sm"
            label={t('community.traveler.editProfile')}
            onPress={() => router.push(routes.cfg('account'))}
          />
        ) : (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <FollowPill
              large
              testID="traveler-follow"
              followed={followed}
              name={name}
              onPress={onFollow}
            />
            <Pressable
              testID="traveler-message"
              accessibilityRole="button"
              accessibilityLabel={t('community.traveler.message')}
              onPress={() => router.push(routes.chat(id))}
              style={styles.messageButton}
            >
              <Icon name="chat-circle" size={20} />
            </Pressable>
          </View>
        )}

        <View style={styles.globeCard}>
          <View style={{ position: 'absolute', left: 110, top: -10 }}>
            <Globe
              width={260}
              height={230}
              visited={profile.countries}
              autoRotate={0.15}
              initialRotation={[20, -25]}
              interactive={false}
              glow
              accessibilityLabel={t('community.traveler.globe', { name: first })}
            />
          </View>
          <View style={styles.globeText} pointerEvents="none">
            <Text variant="overline" tone="accentOnDark">
              {t('community.traveler.mapOf', { name: first })}
            </Text>
            <View style={{ gap: 6 }}>
              {stats.map((s) => (
                <Text key={s.key} variant="label" tone="inverseMuted">
                  <Text variant="statS" tone="inverse">
                    {String(s.n)}
                  </Text>
                  {` ${t(`community.traveler.${s.key}`, { count: s.n })}`}
                </Text>
              ))}
            </View>
          </View>
        </View>

        <Segmented
          testID="traveler-tabs"
          label={t('community.traveler.segments')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'trips', label: t('community.traveler.tabTrips') },
            { value: 'tips', label: t('community.traveler.tabTips') },
          ]}
        />

        {tab === 'trips' ? (
          cards.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {cards.map((card) => (
                <TripTile key={card.key} card={card} meName={me.name} />
              ))}
            </View>
          ) : (
            <EmptyState title={t('community.traveler.noTrips')} />
          )
        ) : posts.length ? (
          <View style={{ gap: 10 }}>
            {posts.map((p) => (
              <Pressable
                key={p.id}
                testID={`traveler-tip-${p.id}`}
                accessibilityRole="button"
                accessibilityLabel={p.text}
                onPress={() => router.push(routes.post(p.id))}
                style={styles.tip}
              >
                <Text variant="caption" weight={700} tone="muted" style={{ fontSize: 12 }}>
                  {`${t(`community.types.${TYPE_KEYS[p.type]}`)} · ${p.where} · ${p.when}`}
                </Text>
                <Text variant="body">{p.text}</Text>
                <ConfirmLine post={p} size={12} />
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyState title={t('community.traveler.noTips')} />
        )}
      </Screen>
    </DemoGate>
  );
}

function TripTile({ card, meName }: { card: TripCard; meName: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const names = card.with.map((n) => (n === 'me' ? firstName(meName) : firstName(n)));
  const withText = names.length
    ? t('community.traveler.with', { names: joinNames(names, t('common.list.and')) })
    : '';
  const content = (
    <>
      <Photo uri={card.uri} tint={colors.border} aspectRatio={4 / 5} radius={16} />
      <Text variant="body" weight={700} style={{ lineHeight: 20 }} numberOfLines={2}>
        {card.title}
      </Text>
      <Text variant="caption" tone="muted" style={{ fontSize: 12, marginTop: -4 }}>
        {`${card.flag} ${card.meta}`}
      </Text>
      {card.with.length ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AvatarStack
            size={24}
            max={3}
            ringColor={colors.surface}
            label={withText}
            people={card.with.map((n) => personAvatar(n === 'me' ? meName : n, n === 'me'))}
          />
          <Text variant="caption" weight={700} tone="support" style={{ fontSize: 12, flex: 1 }}>
            {withText}
          </Text>
        </View>
      ) : null}
    </>
  );
  const style = { width: '48%' as const, gap: 6 };
  if (!card.tripId) return <View style={style}>{content}</View>;
  const tripId = card.tripId;
  return (
    <Pressable
      testID={`traveler-trip-${tripId}`}
      accessibilityRole="button"
      accessibilityLabel={[card.title, card.meta, withText].filter(Boolean).join(', ')}
      onPress={() => router.push(routes.trip(tripId))}
      style={style}
    >
      {content}
    </Pressable>
  );
}
