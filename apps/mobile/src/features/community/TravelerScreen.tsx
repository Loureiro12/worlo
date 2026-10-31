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
import { useCatalog } from '@/data/catalog';
import { useAuthorPosts, useRefreshAfterFollow, useTravelerProfile } from '@/data/community';
import { toggleFollow, useIsFollowing, usePerson } from '@/data/people';
import { useMe, useProfilePrefs } from '@/data/profile';
import { getCurrentUserId } from '@/data/repositories';
import { useTrips } from '@/data/trips';
import { useVisitedMap } from '@/data/world';
import { img } from '@/lib/images';
import { firstName, joinNames } from '@/lib/people';
import { demoKey } from '@/mocks/demo';
import type { Trip } from '@/mocks/types';
import { routes } from '@/navigation/routes';
import { ConfirmLine, FollowPill, QueryGate } from './components';
import { personAvatar, postKey, TYPE_KEYS, useGoBack } from './model';

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

const ME = 'me';

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

/**
 * G2 · Perfil público. `id` = a user id (`traveler_profile` RPC, online) or
 * 'me' ("Ver como outros veem", from the local profile).
 */
export function TravelerScreen() {
  const back = useGoBack();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const isMe = id === ME || id === getCurrentUserId();
  const query = useTravelerProfile(isMe ? undefined : id);
  return (
    <DemoGate network onBack={back}>
      {isMe ? (
        <TravelerContent id={ME} />
      ) : (
        <QueryGate query={query} onBack={back}>
          <TravelerContent id={id} />
        </QueryGate>
      )}
    </DemoGate>
  );
}

function TravelerContent({ id }: { id: string }) {
  const styles = useStyles();
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const back = useGoBack();
  const isMe = id === ME;
  const me = useMe();
  const meId = getCurrentUserId();
  const visitedMap = useVisitedMap();
  const { privacy } = useProfilePrefs();
  const trips = useTrips();
  const followed = useIsFollowing(isMe ? null : id);
  const refreshFollow = useRefreshAfterFollow();
  const known = usePerson(isMe ? null : id);
  const remote = useTravelerProfile(isMe ? undefined : id).data;
  const posts = useAuthorPosts(isMe ? meId : id).data ?? [];
  const [tab, setTab] = useState<Tab>('trips');
  const { CITIES } = useCatalog();

  const header = (
    <ScreenHeader
      overline={isMe ? t('community.traveler.overlineMe') : t('community.traveler.overline')}
      onBack={back}
      backLabel={t('common.actions.back')}
    />
  );

  if (!isMe && !remote) {
    return (
      <Screen testID="traveler-screen" withTabBar header={header}>
        <EmptyState testID="traveler-not-found" title={t('community.traveler.notFound')} />
      </Screen>
    );
  }

  const name = isMe ? me.name : (remote?.name ?? known?.name ?? '');
  const first = firstName(name);
  const restricted = !isMe && Boolean(remote?.restricted);
  const profile = isMe
    ? {
        handle: `@${me.user}`,
        city: me.city,
        bio: me.bio,
        avatar: me.avatar,
        countries: Object.keys(visitedMap),
        cities: CITIES.length - 1,
      }
    : {
        handle: remote?.username ? `@${remote.username}` : '',
        city: remote?.city ?? '',
        bio: remote?.bio ?? '',
        avatar: remote?.avatarUrl ?? known?.avatarUrl ?? null,
        countries: remote?.countries ?? [],
        cities: new Set((remote?.trips ?? []).map((trip) => trip.place)).size,
      };

  const tripCard = (trip: Trip, others: string[]): TripCard => ({
    key: trip.id,
    title: trip.title,
    flag: trip.flag,
    meta: `${trip.place} · ${trip.year}`,
    uri: img(`${trip.id}-a`, 300, 380),
    with: others,
    tripId: trip.id,
  });
  // Who went (owner when someone else + accepted members + legacy companions).
  const went = (trip: Trip) => trip.collab.filter((c) => c.status === 'ok');
  // Trips shared with the user show who else went ("com Ana e Caio").
  const shared: TripCard[] = isMe
    ? trips.map((trip) =>
        tripCard(
          trip,
          went(trip).map((c) => c.name),
        ),
      )
    : trips
        .filter((trip) => went(trip).some((c) => c.userId === id))
        .map((trip) =>
          tripCard(trip, [
            ME,
            ...went(trip)
              .filter((c) => c.userId !== id)
              .map((c) => c.name),
          ]),
        );
  const sharedIds = new Set(shared.map((c) => c.key));
  // Their own public trips (privacy permitting) that aren't shared with me.
  const own: TripCard[] = (remote?.trips ?? [])
    .filter((trip) => !sharedIds.has(trip.id))
    .map((trip) => ({
      key: trip.id,
      title: trip.title,
      flag: trip.flag,
      meta: `${trip.place} · ${trip.year}`,
      uri: img(`tv-${trip.title}`, 300, 380),
      with: [],
    }));
  const cards = isMe ? shared : [...shared, ...own];
  const tripCount = cards.length;

  const onFollow = () => {
    if (!followed) toast.show(t('community.traveler.followed', { name: first }));
    toggleFollow(id);
    refreshFollow(id);
  };

  const stats = [
    { n: profile.countries.length, key: 'countries' },
    { n: profile.cities, key: 'cities' },
    { n: tripCount, key: 'trips' },
  ] as const;

  return (
    <Screen testID="traveler-screen" withTabBar gap={20} header={header}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar
          {...personAvatar(name, isMe, profile.avatar)}
          initials={initialsOf(name)}
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

      {restricted ? (
        <EmptyState
          testID="traveler-restricted"
          icon="lock-simple"
          title={t('community.traveler.restrictedTitle')}
          text={t('community.traveler.restrictedText', { name: first })}
        />
      ) : (
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
      )}

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
              testID={`traveler-tip-${postKey(p.id)}`}
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
      testID={`traveler-trip-${demoKey(tripId, 'trip')}`}
      accessibilityRole="button"
      accessibilityLabel={[card.title, card.meta, withText].filter(Boolean).join(', ')}
      onPress={() => router.push(routes.trip(tripId))}
      style={style}
    >
      {content}
    </Pressable>
  );
}
