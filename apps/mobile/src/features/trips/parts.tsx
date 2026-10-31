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
  radius,
  Text,
} from '@worlo/ui';
import { Pressable, View } from 'react-native';
import { matchesQuery } from '@/lib/format';
import { avatarFor, firstName, joinNames, ME } from '@/lib/people';
import { FRIENDS } from '@/mocks/data.generated';
import type { Activity, Friend } from '@/mocks/types';
import { useStore } from '@/store';
import type { Member } from '@/store/slices/trips';

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

/** Friends not yet in the list, filtered by the search (3 without query, up to 6 with). */
export function suggestFriends(exclude: readonly string[], query: string): Friend[] {
  return FRIENDS.filter(
    (f) => !exclude.includes(f.name) && matchesQuery(`${f.name} ${f.handle}`, query),
  ).slice(0, query.trim() ? 6 : 3);
}

export function FriendSuggestions({
  friends,
  onInvite,
}: {
  friends: readonly Friend[];
  onInvite: (friend: Friend) => void;
}) {
  const { t } = useTranslation();
  if (friends.length === 0) return null;
  return (
    <View style={{ borderRadius: radius.r16, overflow: 'hidden' }}>
      {friends.map((friend, index) => (
        <Pressable
          key={friend.name}
          testID={`invite-${friend.handle}`}
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
          <Avatar {...avatarFor(friend.name)} size={36} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="body" weight={700}>
              {friend.name}
            </Text>
            <Text variant="caption" tone="muted" weight={400}>
              {friend.handle}
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
  activity?: readonly Activity[];
  onOpen: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const and = t('common.list.and');
  const meAvatar = useStore((s) => s.me.avatar);
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

  const recent = activity.filter((a) => ok.some((o) => o.name === a.who));
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
              key={`${a.who}-${a.text}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <Avatar {...avatarFor(a.who)} size={28} />
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
