import type { EntityType, MembershipStatus } from '@worlo/db';
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
import { inviteKey, myMembership } from '@/data/collab';
import {
  isEntityType,
  type NotificationView,
  notificationsData,
  useNotifications,
  useTimeAgo,
} from '@/data/notifications';
import { usePerson } from '@/data/people';
import { repos } from '@/data/repositories';
import { useQuery } from '@/data/useQuery';
import { avatarFor } from '@/lib/people';
import { routes } from '@/navigation/routes';
import { useInviteActions } from './useInviteActions';

type Seg = 'all' | 'invites';
const GROUPS = ['today', 'week', 'earlier'] as const;

/** Icon bubbles for notifications without a person (prototype notifVals). */
const SYSTEM_ICONS: Partial<
  Record<NotificationView['type'], { icon: IconName; bg: string; fg: string }>
> = {
  memory: { icon: 'clock-counter-clockwise', bg: palette.carvao, fg: palette.coral300 },
  community: { icon: 'seal-check', bg: palette.areia, fg: palette.sucesso },
  reminder: { icon: 'airplane-takeoff', bg: palette.coral100, fg: palette.coral700 },
};
const DEFAULT_ICON = { icon: 'bell' as IconName, bg: palette.areia, fg: palette.carvao };

/** Small badge on a person's avatar, by type (and activity kind). */
function badgeOf(n: NotificationView): IconName | undefined {
  switch (n.type) {
    case 'invite':
      return 'envelope-simple';
    case 'invite_accepted':
      return 'check';
    case 'invite_pending':
      return 'hourglass';
    case 'follow':
      return 'user-plus';
    case 'comment':
      return 'chat-circle';
    case 'activity':
      return n.data.kind === 'expense' ? 'wallet' : n.data.kind === 'diary' ? 'notebook' : 'images';
    default:
      return undefined;
  }
}

const num = (v: unknown, fallback = 1) =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

/** H1 · Notificações. */
export function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const styles = useStyles();
  const empty = useIsEmpty();
  const notifications = useNotifications();
  const [seg, setSeg] = useState<Seg>('all');

  const list = empty ? [] : notifications.filter((n) => seg === 'all' || n.type === 'invite');
  const groups = GROUPS.map((key) => ({ key, items: list.filter((n) => n.group === key) })).filter(
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
                notificationsData.markAllRead();
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
              {t(`explore.notifs.${g.key}`)}
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

/** "convidou você pra a viagem “Réveillon em Jeri”." etc., from the row data. */
function useNotificationText(n: NotificationView): { who: string; text: string } {
  const { t } = useTranslation();
  const title = n.entityName;
  switch (n.type) {
    case 'invite':
      return {
        who: '',
        text: !title
          ? t('explore.notifs.inviteGone')
          : n.entityType === 'wish'
            ? t('explore.notifs.inviteFuture', { title })
            : t('explore.notifs.invitePast', { title }),
      };
    case 'invite_accepted':
      return { who: '', text: t('explore.notifs.inviteAccepted', { title }) };
    case 'invite_pending':
      return { who: '', text: t('explore.notifs.invitePending', { title }) };
    case 'activity':
      return {
        who: '',
        text:
          n.data.kind === 'expense'
            ? t('explore.notifs.activityExpense', {
                amount: typeof n.data.amount === 'string' ? n.data.amount : '',
                title,
              })
            : n.data.kind === 'diary'
              ? t('explore.notifs.activityDiary', { title })
              : t('explore.notifs.activityPhotos', { count: num(n.data.count), title }),
      };
    case 'follow':
      return { who: '', text: t('explore.notifs.follow') };
    case 'comment':
      return { who: '', text: t('explore.notifs.comment') };
    case 'community': {
      const count = num(n.data.count);
      return {
        who: t('explore.notifs.communityWho', { count }),
        text: t('explore.notifs.community', { count }),
      };
    }
    case 'memory':
      return {
        who: '',
        text: t('explore.notifs.memory', { count: num(n.data.years), place: n.entityPlace }),
      };
    case 'reminder':
      return { who: '', text: t('explore.notifs.reminder', { count: num(n.data.days), title }) };
    default:
      return { who: '', text: '' };
  }
}

/** Where a tap goes (null: just marks it read). */
function targetOf(n: NotificationView, inviteId: string | undefined): Href | null {
  const id = n.entityId;
  switch (n.type) {
    case 'invite':
      return inviteId ? routes.invite(inviteId) : null;
    case 'follow':
      return n.actorId ? routes.traveler(n.actorId) : null;
    case 'comment':
    case 'community':
      return id ? routes.post(id) : null;
    case 'reminder':
      return id ? routes.roteiro(id) : null;
    default:
      if (!id) return null;
      if (n.entityType === 'trip') return repos.trips.get(id) ? routes.trip(id) : null;
      if (n.entityType === 'wish') return routes.future(id);
      return null;
  }
}

function NotificationRow({
  notification: n,
  last,
  navigate,
}: {
  notification: NotificationView;
  last: boolean;
  navigate: (href: Href) => void;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  const timeAgo = useTimeAgo();
  const actor = usePerson(n.actorId);
  const { accept, decline } = useInviteActions();
  const invite =
    n.type === 'invite' && isEntityType(n.entityType) && n.entityId
      ? { type: n.entityType as EntityType, id: n.entityId }
      : undefined;
  const membership = useQuery(
    () => (invite ? myMembership(invite.type, invite.id) : undefined),
    [invite?.type, invite?.id],
  );

  const { who: label, text } = useNotificationText(n);
  const isPerson = Boolean(n.actorId);
  const who = isPerson ? (actor?.name ?? '') : label;
  const badge = isPerson ? badgeOf(n) : undefined;
  const unread = !n.read;
  const time = timeAgo(n.createdAt);

  const onPress = () => {
    notificationsData.markRead(n.id);
    const href = targetOf(n, membership?.id);
    if (href) navigate(href);
  };

  const sys = SYSTEM_ICONS[n.type] ?? DEFAULT_ICON;
  const message = who ? `${who} ${text}` : text;

  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Pressable
        testID={`notif-${n.key}`}
        accessibilityRole="button"
        accessibilityLabel={`${message} ${time}${unread ? `, ${t('explore.notifs.unread')}` : ''}`}
        onPress={onPress}
        style={styles.main}
      >
        <View style={styles.lead}>
          {isPerson ? (
            <Avatar {...avatarFor(who, actor?.avatarUrl)} size={44} />
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
            {time}
          </Text>
        </View>
        {unread ? (
          <View style={styles.dot}>
            <UnreadDot />
          </View>
        ) : null}
      </Pressable>
      {invite && membership ? (
        <InviteActions
          id={inviteKey(invite.type, invite.id)}
          status={membership.status}
          onAccept={() => {
            notificationsData.markRead(n.id);
            accept(invite.type, invite.id);
          }}
          onDecline={() => {
            notificationsData.markRead(n.id);
            decline(invite.type, invite.id);
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
  status: MembershipStatus;
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
