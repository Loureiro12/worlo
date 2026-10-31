import { useTranslation } from '@worlo/i18n';
import {
  Avatar,
  Button,
  Card,
  colors,
  EmptyState,
  Globe,
  Icon,
  IconCircle,
  layout,
  opacity,
  radius,
  Screen,
  Segmented,
  StatTile,
  Text,
  useToast,
} from '@worlo/ui';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DemoGate, useIsEmpty } from '@/components/DemoGate';
import { useCatalog } from '@/data/catalog';
import { type Privacy, updatePrefs, useMe, useProfilePrefs } from '@/data/profile';
import { repos } from '@/data/repositories';
import { useQuery } from '@/data/useQuery';
import { WORLD_COUNTRIES } from '@/lib/countries';
import { routes } from '@/navigation/routes';
import { ACHIEVEMENTS, type Achievement } from './achievements';
import { GroupCard, MenuRow } from './parts';
import { formatNumber, worldPercent } from './stats';

/** B5 · Meu perfil (tab root). */
export function ProfileScreen() {
  return (
    <DemoGate loading error>
      <ProfileContent />
    </DemoGate>
  );
}

function ProfileContent() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const empty = useIsEmpty();
  const me = useMe();
  const { privacy } = useProfilePrefs();
  const { CITIES } = useCatalog();
  const visitedMap = useQuery(() => repos.world.visitedMap(), []);
  const wishes = useQuery(() => repos.world.wishes(), []);
  const trips = useQuery(() => repos.trips.list(), []);
  const savedCount = useQuery(() => repos.saved.items().length, []);
  const collectionsCount = useQuery(() => repos.saved.collections().length, []);

  const visited = empty ? [] : Object.keys(visitedMap);
  const wishlist = empty ? [] : wishes.flatMap((w) => (w.countryIso ? [w.countryIso] : []));
  const countries = visited.length;
  const stats = {
    countries,
    cities: empty ? 0 : CITIES.length - 1,
    trips: empty ? 0 : trips.length,
    places: empty ? 0 : trips.reduce((sum, trip) => sum + trip.places, 0),
  };
  const totalPhotos = empty ? 0 : trips.reduce((sum, trip) => sum + trip.photos, 0);
  const lang = i18n.language;

  const achievementMeta = (a: Achievement) =>
    a.unlocked ? a.meta : t('profile.achievements.remaining', { count: a.remaining });

  const onAchievement = (a: Achievement) => {
    if (a.unlocked) {
      router.push(routes.share('ach'));
      return;
    }
    toast.show(
      t('profile.achievements.progressToast', {
        title: t(`profile.achievements.${a.id}`),
        meta: achievementMeta(a),
      }),
      'info',
    );
  };

  const privacyOptions: { value: Privacy; label: string }[] = [
    { value: 'private', label: t('profile.privacy.private') },
    { value: 'friends', label: t('profile.privacy.friends') },
    { value: 'public', label: t('profile.privacy.public') },
  ];

  return (
    <Screen testID="profile-screen" withTabBar gap={22} header={<ProfileHeader />}>
      <Text variant="body" tone="support" style={{ marginTop: -8 }}>
        {me.bio}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -6 }}>
        <Button
          testID="profile-view-public"
          variant="pill"
          size="sm"
          icon="eye"
          label={t('profile.actions.viewPublic')}
          onPress={() => router.push(routes.traveler('me'))}
        />
        <Button
          testID="profile-share"
          size="sm"
          icon="export"
          label={t('profile.actions.shareWorld')}
          onPress={() => router.push(routes.share('year'))}
        />
      </View>

      <View
        testID="profile-world"
        style={{
          height: 230,
          borderRadius: radius.r24,
          backgroundColor: colors.backgroundDark,
          overflow: 'hidden',
        }}
      >
        <View style={{ position: 'absolute', left: 90, top: -10 }}>
          <Globe
            width={300}
            height={260}
            visited={visited}
            wishlist={wishlist}
            autoRotate={0.08}
            interactive={false}
            accessibilityLabel={t('profile.world.globeA11y')}
          />
        </View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 18,
            top: 18,
            bottom: 18,
            justifyContent: 'space-between',
          }}
        >
          <Text variant="overline" tone="accentOnDark">
            {t('profile.world.overline')}
          </Text>
          <View>
            <Text variant="statL" tone="inverse" testID="profile-world-percent">
              {worldPercent(countries, lang)}
            </Text>
            <Text variant="caption" weight={600} tone="inverseMuted">
              {t('profile.world.countries', { n: countries, total: WORLD_COUNTRIES })}
            </Text>
          </View>
        </View>
      </View>

      {empty ? (
        <EmptyState
          testID="profile-empty"
          icon="globe-hemisphere-west"
          title={t('profile.empty.title')}
          text={t('profile.empty.text')}
          action={{
            label: t('profile.empty.cta'),
            onPress: () => router.push(routes.onboardingMap),
          }}
          secondary={{
            label: t('profile.empty.secondary'),
            onPress: () => router.push(routes.tripForm({ mode: 'new', kind: 'past' })),
          }}
        />
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(['countries', 'cities', 'trips', 'places'] as const).map((key) => (
              <StatTile
                key={key}
                testID={`profile-stat-${key}`}
                size="lg"
                value={formatNumber(stats[key], lang)}
                label={t(`profile.stats.${key}`, { count: stats[key] })}
                style={{ flexBasis: '48%', flexGrow: 1 }}
              />
            ))}
          </View>

          <View style={{ gap: 12 }}>
            <Text variant="h3" accessibilityRole="header">
              {t('profile.achievements.title')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -layout.gutter }}
              contentContainerStyle={{ paddingHorizontal: layout.gutter, gap: 10 }}
            >
              {ACHIEVEMENTS.map((a) => {
                const title = t(`profile.achievements.${a.id}`);
                const meta = achievementMeta(a);
                return (
                  <Pressable
                    key={a.id}
                    testID={`achievement-${a.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={t(
                      a.unlocked
                        ? 'profile.achievements.unlockedA11y'
                        : 'profile.achievements.lockedA11y',
                      { title, meta },
                    )}
                    onPress={() => onAchievement(a)}
                    style={{
                      width: 124,
                      padding: 14,
                      gap: 8,
                      borderRadius: radius.r16,
                      backgroundColor: colors.surface,
                      opacity: a.unlocked ? 1 : opacity.locked,
                    }}
                  >
                    <IconCircle
                      icon={a.icon}
                      size={40}
                      iconSize={20}
                      background={a.unlocked ? colors.primary : colors.textMuted}
                      color={colors.textInverse}
                    />
                    <Text variant="label" weight={700} style={{ lineHeight: 18 }}>
                      {title}
                    </Text>
                    <Text variant="caption" tone="muted" style={{ fontSize: 12 }}>
                      {meta}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </>
      )}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <ShortcutCard
          testID="profile-saved"
          icon="bookmark-simple"
          title={t('profile.cards.saved')}
          meta={t('common.count.places', { count: empty ? 0 : savedCount })}
          onPress={() => router.push(routes.saved)}
        />
        <ShortcutCard
          testID="profile-collections"
          icon="folders"
          neutral
          title={t('profile.cards.collections')}
          meta={t('common.count.collections', { count: empty ? 0 : collectionsCount })}
          onPress={() => router.push(routes.collections)}
        />
      </View>

      <Card radius={24} padding={16} gap={12}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="lock-simple" size={18} />
          <Text variant="body" weight={700}>
            {t('profile.privacy.title')}
          </Text>
        </View>
        <Segmented
          testID="profile-privacy"
          label={t('profile.privacy.title')}
          height={36}
          options={privacyOptions}
          value={privacy}
          onChange={(value) => updatePrefs({ privacy: value })}
        />
        <Text variant="caption" tone="muted" weight={400}>
          {t(`profile.privacy.text.${privacy}`)}
        </Text>
      </Card>

      <GroupCard>
        <MenuRow
          testID="profile-photos"
          icon="images"
          label={t('profile.rows.photos')}
          sub={t('profile.rows.photosMeta', { n: formatNumber(totalPhotos, lang) })}
          onPress={() => router.push(routes.photos)}
        />
        <MenuRow
          testID="profile-settings"
          icon="gear-six"
          label={t('profile.rows.settings')}
          sub={t('profile.rows.settingsMeta')}
          onPress={() => router.push(routes.settings)}
        />
        <MenuRow
          testID="profile-welcome"
          icon="arrow-counter-clockwise"
          label={t('profile.rows.welcome')}
          sub={t('profile.rows.welcomeMeta')}
          onPress={() => router.push(routes.welcome)}
        />
      </GroupCard>
    </Screen>
  );
}

function ProfileHeader() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const me = useMe();
  return (
    <View
      style={{
        paddingTop: insets.top + layout.headerGap,
        paddingHorizontal: layout.gutter,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: colors.background,
      }}
    >
      <Avatar name={me.name} isMe photoUrl={me.avatar} size={72} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="h1Detail" accessibilityRole="header" testID="profile-name">
          {me.name}
        </Text>
        <Text variant="bodyS" tone="muted">
          {me.city
            ? t('profile.header.handle', { user: me.user, city: me.city })
            : t('profile.header.handleNoCity', { user: me.user })}
        </Text>
      </View>
    </View>
  );
}

function ShortcutCard({
  icon,
  title,
  meta,
  onPress,
  neutral = false,
  testID,
}: {
  icon: 'bookmark-simple' | 'folders';
  title: string;
  meta: string;
  onPress: () => void;
  neutral?: boolean;
  testID?: string;
}) {
  return (
    <Card
      testID={testID}
      radius={24}
      padding={16}
      gap={10}
      style={{ flex: 1 }}
      onPress={onPress}
      accessibilityLabel={`${title}, ${meta}`}
    >
      <IconCircle
        icon={icon}
        size={40}
        iconSize={20}
        weight={neutral ? 'regular' : 'fill'}
        background={neutral ? colors.background : colors.accentSoft}
        color={neutral ? colors.text : colors.link}
      />
      <View>
        <Text variant="body" weight={700}>
          {title}
        </Text>
        <Text variant="caption" tone="muted" weight={400}>
          {meta}
        </Text>
      </View>
    </Card>
  );
}
