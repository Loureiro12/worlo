import { useTranslation } from '@worlo/i18n';
import {
  Avatar,
  AvatarStack,
  BottomBar,
  Button,
  Card,
  colors,
  EmptyState,
  HeroScreen,
  Icon,
  type IconName,
  makeStyles,
  Screen,
  ScreenHeader,
  Text,
} from '@worlo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { img } from '@/lib/images';
import { avatarFor, firstName, joinNames, ME } from '@/lib/people';
import { INVITES } from '@/mocks/data.generated';
import type { Invite } from '@/mocks/types';
import { routes } from '@/navigation/routes';
import { useStore } from '@/store';
import { useInviteActions } from './useInviteActions';

type PermKey =
  | 'photos'
  | 'places'
  | 'expenses'
  | 'diary'
  | 'map'
  | 'itinerary'
  | 'suggest'
  | 'budget'
  | 'profile';

const PERMS: Record<Invite['kind'], readonly [IconName, PermKey][]> = {
  past: [
    ['images', 'photos'],
    ['map-pin', 'places'],
    ['wallet', 'expenses'],
    ['notebook', 'diary'],
    ['globe-hemisphere-west', 'map'],
  ],
  future: [
    ['map-trifold', 'itinerary'],
    ['bookmark-simple', 'suggest'],
    ['wallet', 'budget'],
    ['user-circle', 'profile'],
  ],
};

/** H2 · Convite (fullscreen) for a past ("jeri") or future ("seul") trip. */
export function InviteScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const invite = id ? INVITES[id] : undefined;
  if (!invite) {
    return (
      <Screen
        testID="invite-screen"
        header={<ScreenHeader onBack={() => router.back()} backLabel={t('common.actions.back')} />}
      >
        <EmptyState icon="envelope-simple" title={t('explore.invite.notFound')} />
      </Screen>
    );
  }
  return <InviteContent invite={invite} />;
}

function InviteContent({ invite }: { invite: Invite }) {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const status = useStore((s) => s.invites[invite.id] ?? 'pending');
  const { accept, decline } = useInviteActions();
  const past = invite.kind === 'past';
  const openTrip = () => router.push(past ? routes.trip(invite.id) : routes.future(invite.id));

  const people = [invite.from, ...invite.others];
  const names = joinNames(
    [...people.map(firstName), t('explore.invite.you')],
    t('common.list.and'),
  );
  const stats = [
    { n: invite.days ?? 0, key: 'days' as const },
    { n: invite.photos ?? 0, key: 'photos' as const },
    { n: invite.places ?? 0, key: 'places' as const },
  ];

  const bottomBar = (
    <BottomBar tone="white" testID="invite-bar">
      {status === 'pending' ? (
        <>
          <Button
            testID="invite-decline"
            variant="outline"
            label={t('explore.invite.decline')}
            flex={1}
            onPress={() => decline(invite.id)}
          />
          <Button
            testID="invite-accept"
            label={t('explore.invite.accept')}
            flex={1.6}
            onPress={() => {
              accept(invite.id);
              openTrip();
            }}
          />
        </>
      ) : status === 'accepted' ? (
        <Button
          testID="invite-open"
          icon="check"
          label={t('explore.invite.open')}
          fullWidth
          onPress={openTrip}
        />
      ) : (
        <View style={styles.declined}>
          <Text variant="label" tone="muted" style={styles.flex}>
            {t('explore.invite.declinedText')}
          </Text>
          <Button
            testID="invite-accept-anyway"
            variant="pill"
            size="sm"
            label={t('explore.invite.acceptAnyway')}
            onPress={() => {
              accept(invite.id);
              openTrip();
            }}
          />
        </View>
      )}
    </BottomBar>
  );

  return (
    <HeroScreen
      testID="invite-screen"
      heroUri={img(`inv-${invite.id}`, 800, 560)}
      heroTint={colors.border}
      heroHeight={260}
      onBack={() => router.back()}
      backLabel={t('common.actions.back')}
      bottomBar={bottomBar}
    >
      <Card overlap gap={14} style={styles.overlap}>
        <Text variant="overline" tone="link">
          {past ? t('explore.invite.overlinePast') : t('explore.invite.overlineFuture')}
        </Text>
        <Text variant="h1Detail">{invite.title}</Text>
        <View style={styles.facts}>
          <Fact icon="map-pin" text={`${invite.flag} ${invite.place}`} />
          <Fact icon="calendar-blank" text={invite.period} />
        </View>
      </Card>

      <View style={styles.body}>
        <View style={styles.fromRow}>
          <Avatar {...avatarFor(invite.from)} size={44} />
          <View style={styles.fromText}>
            <Text variant="body" weight={700}>
              {t('explore.invite.from', { name: invite.from })}
            </Text>
            <View style={styles.bubble}>
              <Text variant="body">{invite.note}</Text>
            </View>
          </View>
        </View>

        <Card radius={24} padding={16} gap={12}>
          <Text variant="h3">
            {past ? t('explore.invite.whoPast') : t('explore.invite.whoFuture')}
          </Text>
          <View style={styles.crew}>
            <AvatarStack
              size={36}
              ringColor={colors.surface}
              label={names}
              people={[...people, ME].map((n) => avatarFor(n))}
            />
            <Text variant="label" tone="support" style={styles.flex}>
              {names}
            </Text>
          </View>
          {past ? (
            <View style={styles.stats}>
              {stats.map((s) => (
                <Text key={s.key} variant="caption" weight={600} tone="muted">
                  <Text variant="cardTitle">{s.n}</Text>{' '}
                  {t(`explore.invite.stats.${s.key}`, { count: s.n })}
                </Text>
              ))}
            </View>
          ) : null}
        </Card>

        <View style={styles.perms}>
          <Text variant="h3">{t('explore.invite.canTitle')}</Text>
          {PERMS[invite.kind].map(([icon, key]) => (
            <View key={key} style={styles.perm}>
              <View style={styles.permIcon}>
                <Icon name={icon} size={18} />
              </View>
              <Text variant="body" style={styles.flex}>
                {t(`explore.invite.perms.${key}`)}
              </Text>
            </View>
          ))}
          <View style={styles.privacy}>
            <Icon name="lock-simple" size={16} color={colors.textMuted} />
            <Text variant="caption" tone="muted" weight={400} style={styles.flex}>
              {t('explore.invite.privacy')}
            </Text>
          </View>
        </View>
      </View>
    </HeroScreen>
  );
}

function Fact({ icon, text }: { icon: IconName; text: string }) {
  const styles = useStyles();
  return (
    <View style={styles.fact}>
      <Icon name={icon} size={18} color={colors.textMuted} />
      <Text variant="body" tone="support" style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  overlap: { marginTop: -48 },
  facts: { gap: 8 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  body: { paddingHorizontal: t.layout.gutter, marginTop: -4, gap: 20 },
  fromRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  fromText: { flex: 1, gap: 6, minWidth: 0 },
  bubble: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: 4,
    borderTopRightRadius: t.radius.r18,
    borderBottomLeftRadius: t.radius.r18,
    borderBottomRightRadius: t.radius.r18,
  },
  crew: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stats: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: t.colors.background,
  },
  perms: { gap: 10 },
  perm: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  permIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: t.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacy: { flexDirection: 'row', gap: 8, marginTop: 4 },
  declined: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
}));
