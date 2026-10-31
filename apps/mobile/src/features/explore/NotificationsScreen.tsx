import { useTranslation } from '@worlo/i18n';
import {
  Avatar,
  colors,
  Icon,
  IconButton,
  type IconName,
  makeStyles,
  palette,
  Screen,
  ScreenHeader,
  Segmented,
  Text,
  UnreadDot,
  useToast,
} from '@worlo/ui';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useIsEmpty } from '@/components/DemoGate';
import { avatarFor } from '@/lib/people';
import { FRIENDS, INVITES, NOTIFS, TRAVELERS } from '@/mocks/data.generated';
import type { Notification } from '@/mocks/types';
import { routes } from '@/navigation/routes';
import { useStore } from '@/store';
import { isNotificationUnread } from '@/store/slices/notifications';
import type { InviteStatus } from '@/store/slices/trips';
import { useInviteActions } from './useInviteActions';

type Seg = 'all' | 'invites';
const GROUPS = [
  { key: 'Hoje', label: 'today' },
  { key: 'Esta semana', label: 'week' },
] as const;

/** Icon bubbles for notifications without a person (prototype notifVals). */
const SYSTEM_ICONS: Partial<
  Record<Notification['type'], { icon: IconName; bg: string; fg: string }>
> = {
  memory: { icon: 'clock-counter-clockwise', bg: palette.carvao, fg: palette.coral300 },
  community: { icon: 'seal-check', bg: palette.areia, fg: palette.sucesso },
  reminder: { icon: 'airplane-takeoff', bg: palette.coral100, fg: palette.coral700 },
};
const DEFAULT_ICON = { icon: 'bell' as IconName, bg: palette.areia, fg: palette.carvao };

/** H1 · Notificações. */
export function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const styles = useStyles();
  const empty = useIsEmpty();
  const markAllRead = useStore((s) => s.markAllRead);
  const [seg, setSeg] = useState<Seg>('all');

  const list = empty ? [] : NOTIFS.filter((n) => seg === 'all' || n.type === 'invite');
  const groups = GROUPS.map((g) => ({ ...g, items: list.filter((n) => n.group === g.key) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <Screen
      testID="notifs-screen"
      gap={18}
      header={
        <ScreenHeader
          overline={t('explore.notifs.overline')}
          onBack={() => router.back()}
          backLabel={t('common.actions.back')}
          right={
            <IconButton
              testID="notifs-mark-all"
              icon="checks"
              label={t('explore.notifs.markAll')}
              onPress={() => {
                markAllRead(NOTIFS.map((n) => n.id));
                toast.show(t('explore.notifs.markedAll'), 'info');
              }}
            />
          }
        />
      }
    >
      <Text variant="h1">{t('explore.notifs.title')}</Text>
      <Segmented
        testID="notifs-seg"
        label={t('explore.notifs.filterLabel')}
        value={seg}
        onChange={setSeg}
        options={[
          { value: 'all', label: t('explore.notifs.segAll') },
          { value: 'invites', label: t('explore.notifs.segInvites') },
        ]}
      />
      {groups.length === 0 ? (
        <View testID="notifs-empty" style={styles.emptyCard}>
          <Text variant="body" tone="muted">
            {empty || seg === 'all' ? t('explore.notifs.empty') : t('explore.notifs.noInvites')}
          </Text>
        </View>
      ) : (
        groups.map((g) => (
          <View key={g.key} style={styles.group}>
            <Text variant="overline" tone="muted" style={styles.groupLabel}>
              {t(`explore.notifs.${g.label}`)}
            </Text>
            <View style={styles.card}>
              {g.items.map((n, i) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  last={i === g.items.length - 1}
                  navigate={(href) => router.push(href)}
                />
              ))}
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}

function NotificationRow({
  notification: n,
  last,
  navigate,
}: {
  notification: Notification;
  last: boolean;
  navigate: (href: Href) => void;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  const markRead = useStore((s) => s.markRead);
  const trips = useStore((s) => s.trips);
  const unread = useStore((s) => isNotificationUnread(n, s));
  const inviteStatus = useStore((s) => (n.inv ? s.invites[n.inv] : undefined));
  const { accept, decline } = useInviteActions();

  const invite = n.type === 'invite' && n.inv ? INVITES[n.inv] : undefined;
  const who = invite?.from ?? n.who ?? '';
  const isPerson = Boolean(invite) || FRIENDS.some((f) => f.name === who);
  const text = invite
    ? t(invite.kind === 'past' ? 'explore.notifs.invitePast' : 'explore.notifs.inviteFuture', {
        title: invite.title,
      })
    : (n.text ?? '');
  const badge: IconName | undefined = invite ? 'envelope-simple' : isPerson ? n.badge : undefined;

  const target = (): Href | null => {
    if (invite) return routes.invite(invite.id);
    if (isPerson) {
      if (n.trip && trips.some((tr) => tr.id === n.trip)) return routes.trip(n.trip);
      if (TRAVELERS[who]) return routes.traveler(who);
      return null;
    }
    if (n.type === 'memory') return routes.trip(n.trip ?? 'floripa');
    if (n.type === 'community') return routes.post('p1');
    if (n.type === 'reminder') return routes.roteiro('peru');
    return null;
  };

  const onPress = () => {
    markRead(n.id);
    const href = target();
    if (href) navigate(href);
  };

  const sys = SYSTEM_ICONS[n.type] ?? DEFAULT_ICON;
  const message = who ? `${who} ${text}` : text;

  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Pressable
        testID={`notif-${n.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${message} ${n.time}${unread ? `, ${t('explore.notifs.unread')}` : ''}`}
        onPress={onPress}
        style={styles.main}
      >
        <View style={styles.lead}>
          {isPerson ? (
            <Avatar {...avatarFor(who)} size={44} />
          ) : (
            <View style={[styles.iconLead, { backgroundColor: sys.bg }]}>
              <Icon name={sys.icon} size={20} color={sys.fg} />
            </View>
          )}
          {badge ? (
            <View style={styles.badge}>
              <Icon name={badge} size={11} color={colors.onPrimary} />
            </View>
          ) : null}
        </View>
        <View style={styles.body}>
          <Text variant="bodyS" tone="support" weight={400}>
            {who ? (
              <Text variant="bodyS" weight={700}>
                {who}
              </Text>
            ) : null}
            {who ? ' ' : ''}
            {text}
          </Text>
          <Text variant="caption" weight={600} tone="muted" style={styles.time}>
            {n.time}
          </Text>
        </View>
        {unread ? (
          <View style={styles.dot}>
            <UnreadDot />
          </View>
        ) : null}
      </Pressable>
      {invite && inviteStatus ? (
        <InviteActions
          id={invite.id}
          status={inviteStatus}
          onAccept={() => {
            markRead(n.id);
            accept(invite.id);
          }}
          onDecline={() => {
            markRead(n.id);
            decline(invite.id);
          }}
        />
      ) : null}
    </View>
  );
}

function InviteActions({
  id,
  status,
  onAccept,
  onDecline,
}: {
  id: string;
  status: InviteStatus;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  if (status === 'pending') {
    return (
      <View style={styles.actions}>
        <Pressable
          testID={`notif-accept-${id}`}
          accessibilityRole="button"
          accessibilityLabel={t('explore.notifs.accept')}
          onPress={onAccept}
          style={({ pressed }) => [styles.action, pressed ? styles.acceptPressed : styles.accept]}
        >
          <Text variant="caption" weight={700} tone="onPrimary">
            {t('explore.notifs.accept')}
          </Text>
        </Pressable>
        <Pressable
          testID={`notif-decline-${id}`}
          accessibilityRole="button"
          accessibilityLabel={t('explore.notifs.decline')}
          onPress={onDecline}
          style={({ pressed }) => [
            styles.action,
            styles.declineBtn,
            pressed && styles.declinePressed,
          ]}
        >
          <Text variant="caption" weight={700}>
            {t('explore.notifs.decline')}
          </Text>
        </Pressable>
      </View>
    );
  }
  const accepted = status === 'accepted';
  return (
    <View
      testID={`notif-result-${id}`}
      style={[styles.actions, styles.result, accepted ? styles.resultOk : styles.resultNo]}
    >
      <Icon
        name={accepted ? 'check' : 'x'}
        size={12}
        color={accepted ? colors.link : colors.textMuted}
      />
      <Text variant="overline" tone={accepted ? 'link' : 'muted'} style={styles.resultText}>
        {accepted ? t('explore.notifs.accepted') : t('explore.notifs.declined')}
      </Text>
    </View>
  );
}

const LEAD = 44;

const useStyles = makeStyles((t) => ({
  emptyCard: { padding: 20, borderRadius: t.radius.r16, backgroundColor: t.colors.surface },
  group: { gap: 8 },
  groupLabel: { paddingLeft: 4 },
  card: { borderRadius: t.radius.r24, backgroundColor: t.colors.surface, overflow: 'hidden' },
  row: { paddingVertical: 14, paddingHorizontal: 16, gap: 8 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: t.colors.background },
  main: { flexDirection: 'row', gap: 12 },
  lead: { width: LEAD, height: LEAD },
  iconLead: {
    width: LEAD,
    height: LEAD,
    borderRadius: LEAD / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: t.colors.primary,
    borderWidth: 2,
    borderColor: t.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 6, minWidth: 0 },
  time: { fontSize: 12 },
  dot: { marginTop: 6 },
  actions: { flexDirection: 'row', gap: 8, marginLeft: LEAD + 12 },
  action: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: t.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accept: { backgroundColor: t.colors.primary },
  acceptPressed: { backgroundColor: t.colors.primaryPressed },
  declineBtn: { borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface },
  declinePressed: { backgroundColor: t.colors.background },
  result: {
    alignSelf: 'flex-start',
    height: 26,
    paddingHorizontal: 10,
    borderRadius: t.radius.full,
    alignItems: 'center',
    gap: 6,
  },
  resultOk: { backgroundColor: t.colors.accentSoft },
  resultNo: { backgroundColor: t.colors.background },
  resultText: { textTransform: 'none', letterSpacing: 0 },
}));
