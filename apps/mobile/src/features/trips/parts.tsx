import { Trans, useTranslation } from '@worlo/i18n';
import {
  Avatar,
  AvatarStack,
  Button,
  Card,
  colors,
  Divider,
  Icon,
  type IconName,
  Photo,
  radius,
  StatusChip,
  Text,
} from '@worlo/ui';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { PeopleResult } from '@/data/community';
import type { Person } from '@/data/people';
import { useMe } from '@/data/profile';
import { matchesQuery } from '@/lib/format';
import { avatarFor, firstName, joinNames, ME } from '@/lib/people';
import type { Member } from '@/store/slices/trips';
import type { ActivityView } from './activity';

/** Dashed full-width action ("Adicionar destino", "Criar roteiro"). Promotion candidate. */
export function DashedButton({
  label,
  icon = 'plus',
  onPress,
  testID,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 56,
        borderRadius: radius.r16,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: colors.border,
        backgroundColor: pressed ? colors.surface : 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      })}
    >
      <Icon name={icon} size={18} color={colors.textSupport} />
      <Text variant="body" weight={600} tone="support">
        {label}
      </Text>
    </Pressable>
  );
}

/** Coral-100 note explaining what a collaborator can do (06_COPY → Colaboração). */
export function CollabNote() {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 10,
        alignItems: 'flex-start',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: radius.r16,
        backgroundColor: colors.accentSoft,
      }}
    >
      <Icon name="users-three" size={20} color={colors.link} />
      <Text variant="caption" weight={400} tone="support" style={{ flex: 1, lineHeight: 19 }}>
        <Trans
          i18nKey="trips.people.note"
          components={{ b: <Text variant="caption" weight={700} tone="support" /> }}
        />
      </Text>
    </View>
  );
}

/** Small coral "Convidar" pill shown at the end of a suggestion row. */
function InvitePill() {
  const { t } = useTranslation();
  return (
    <View
      style={{
        height: 30,
        paddingHorizontal: 12,
        borderRadius: radius.full,
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <Icon name="user-plus" size={14} color={colors.onPrimary} />
      <Text variant="caption" weight={700} tone="onPrimary">
        {t('trips.people.invite')}
      </Text>
    </View>
  );
}

/**
 * People I follow not yet on the list (by user id), filtered by the search
 * (3 without query, up to 6 with).
 */
/** Someone who can be invited: a person I follow or anyone found on the server. */
export type InviteCandidate = Pick<Person, 'id' | 'name' | 'username' | 'avatarUrl'>;

/** A server search result as someone to invite. */
export const toCandidate = (p: PeopleResult): InviteCandidate => ({
  id: p.id,
  name: p.name,
  username: p.username,
  avatarUrl: p.avatarUrl,
});

/**
 * People to invite: the ones I follow that match, then anyone on Worlo found by
 * name or @username (server search, online) — invites are not limited to
 * friends, a new account follows nobody yet.
 */
export function suggestFriends(
  following: readonly InviteCandidate[],
  exclude: readonly string[],
  query: string,
  found: readonly InviteCandidate[] = [],
): InviteCandidate[] {
  const max = query.trim() ? 6 : 3;
  const mine = following.filter(
    (p) => !exclude.includes(p.id) && matchesQuery(`${p.name} @${p.username}`, query),
  );
  const others = query.trim()
    ? found.filter((p) => !exclude.includes(p.id) && !mine.some((m) => m.id === p.id))
    : [];
  return [...mine, ...others].slice(0, max);
}

export function FriendSuggestions({
  friends,
  onInvite,
}: {
  friends: readonly InviteCandidate[];
  onInvite: (friend: InviteCandidate) => void;
}) {
  const { t } = useTranslation();
  if (friends.length === 0) return null;
  return (
    <View style={{ borderRadius: radius.r16, overflow: 'hidden' }}>
      {friends.map((friend, index) => (
        <Pressable
          key={friend.id}
          testID={`invite-@${friend.username}`}
          accessibilityRole="button"
          accessibilityLabel={t('trips.people.inviteName', { name: friend.name })}
          onPress={() => onInvite(friend)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 10,
            paddingHorizontal: 12,
            backgroundColor: pressed ? colors.background : colors.surface,
            borderTopWidth: index === 0 ? 0 : 1,
            borderTopColor: colors.background,
          })}
        >
          <Avatar {...avatarFor(friend.name, friend.avatarUrl)} size={36} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="body" weight={700}>
              {friend.name}
            </Text>
            <Text variant="caption" tone="muted" weight={400}>
              {`@${friend.username}`}
            </Text>
          </View>
          <InvitePill />
        </Pressable>
      ))}
    </View>
  );
}

/** Splits a member list into owner (if someone else created it), accepted and pending. */
export function memberGroups(collab: readonly Member[]) {
  return {
    owner: collab.find((c) => c.owner),
    ok: collab.filter((c) => c.status === 'ok'),
    pending: collab.filter((c) => c.status === 'pending'),
  };
}

/** "Quem foi" / "Quem vai" card (C1, C3): avatars, names, counts and recent activity. */
export function PeopleCard({
  collab,
  future = false,
  activity = [],
  onOpen,
  testID,
}: {
  collab: readonly Member[];
  future?: boolean;
  activity?: readonly ActivityView[];
  onOpen: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const and = t('common.list.and');
  const meAvatar = useMe().avatar;
  const { owner, ok, pending } = memberGroups(collab);

  const names = collab.length
    ? joinNames(
        owner
          ? [
              firstName(owner.name),
              t('trips.who.youLower'),
              ...collab.filter((c) => !c.owner).map((c) => firstName(c.name)),
            ]
          : [t('trips.who.you'), ...collab.map((c) => firstName(c.name))],
        and,
      )
    : t('trips.who.onlyYou');

  const sub = owner
    ? t('trips.who.createdBy', { name: firstName(owner.name) })
    : collab.length
      ? [
          ok.length ? t('trips.who.collaborators', { count: ok.length }) : null,
          pending.length ? t('trips.who.pending', { count: pending.length }) : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : future
        ? t('trips.who.inviteGoes')
        : t('trips.who.inviteWent');

  const recent = activity.filter((a) => ok.some((o) => o.userId === a.userId));
  const people = [avatarFor(ME, meAvatar), ...collab.map((c) => avatarFor(c.name))];

  return (
    <Card radius={24} padding={16} testID={testID}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text variant="h3" style={{ flex: 1 }}>
          {future ? t('trips.who.goes') : t('trips.who.went')}
        </Text>
        <Button
          testID={testID ? `${testID}-invite` : undefined}
          variant="outline"
          size="sm"
          icon="user-plus"
          label={t('common.actions.invite')}
          onPress={onOpen}
        />
      </View>
      <Pressable
        testID={testID ? `${testID}-open` : undefined}
        accessibilityRole="button"
        accessibilityLabel={`${names}. ${sub}`}
        accessibilityHint={t('trips.who.openPeople')}
        onPress={onOpen}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <AvatarStack people={people} size={36} max={5} ringColor={colors.surface} label={names} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="body" weight={700}>
            {names}
          </Text>
          <Text variant="caption" tone="muted" weight={400}>
            {sub}
          </Text>
        </View>
      </Pressable>
      {recent.length ? (
        <View style={{ gap: 10 }}>
          <Divider />
          <Text variant="overline" tone="muted">
            {t('trips.who.activity')}
          </Text>
          {recent.map((a) => (
            <View
              key={a.id}
              testID={`trip-activity-${a.kind}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <Avatar {...avatarFor(a.who, a.avatarUrl)} size={28} />
              <Text variant="bodyS" weight={400} tone="support" style={{ flex: 1, lineHeight: 19 }}>
                <Text variant="bodyS" weight={700}>
                  {firstName(a.who)}
                </Text>
                {` ${a.text}`}
              </Text>
              <Text variant="caption" tone="muted" style={{ fontSize: 12 }}>
                {a.when}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

/**
 * Card of a plan — a roteiro or a "Quero ir" (4.2): same size, cover, title and
 * place; the status chip says which one it is. The cover is the photo chosen
 * for it, or its solid color with the flag.
 */
export function PlanCard({
  testID,
  onPress,
  accessibilityLabel,
  cover,
  tint,
  flag,
  status,
  title,
  subtitle,
  children,
}: {
  testID: string;
  onPress: () => void;
  accessibilityLabel: string;
  cover?: string | null;
  tint: string;
  flag: string;
  status: { kind: 'planned' | 'wishlist'; label: string };
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <Card
      testID={testID}
      radius={24}
      padding={10}
      style={{ paddingBottom: 16 }}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
    >
      <Photo uri={cover ?? null} tint={tint} height={120} radius={radius.r16}>
        {cover ? null : (
          <View
            testID={`${testID}-solid`}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 40, lineHeight: 48 }} accessibilityElementsHidden>
              {flag}
            </Text>
          </View>
        )}
        <StatusChip
          kind={status.kind}
          size="sm"
          label={status.label}
          style={{ position: 'absolute', top: 10, left: 10 }}
        />
      </Photo>
      <View style={{ paddingHorizontal: 6, gap: 4 }}>
        <Text variant="h3">{title}</Text>
        <Text variant="bodyS" tone="support" numberOfLines={2}>
          {subtitle}
        </Text>
        {children}
      </View>
    </Card>
  );
}
