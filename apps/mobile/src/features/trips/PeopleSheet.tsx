import { useTranslation } from '@worlo/i18n';
import {
  Avatar,
  Button,
  colors,
  IconButton,
  radius,
  Sheet,
  Text,
  TextField,
  useToast,
} from '@worlo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import {
  collab as collabData,
  createInviteLink,
  myMembership,
  OfflineError,
  useInviteCandidates,
} from '@/data/collab';
import { useMe } from '@/data/profile';
import { tripsData, useTrip } from '@/data/trips';
import { useQuery } from '@/data/useQuery';
import { useFuture, world } from '@/data/world';
import { avatarFor, firstName, ME } from '@/lib/people';
import { links, useCopyLink } from '@/lib/useCopyLink';
import type { Collaborator } from '@/mocks/types';
import { routes } from '@/navigation/routes';
import { CollabNote, FriendSuggestions, suggestFriends } from './parts';

export type PeopleTarget = { kind: 'trip' | 'future'; id: string };

const EMPTY: Collaborator[] = [];

/**
 * Sheet "Pessoas na viagem" (H): members with their status, invite people I
 * follow (memberships, offline OK) and copy an invite link (online). Only the
 * owner removes people (05 → Permissões); a collaborator can leave.
 */
export function PeopleSheet({
  target,
  onClose,
}: {
  target: PeopleTarget | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const router = useRouter();
  const copyLink = useCopyLink();
  const [query, setQuery] = useState('');
  const me = useMe();
  const following = useInviteCandidates();
  const trip = useTrip(target?.kind === 'trip' ? target.id : undefined);
  const future = useFuture(target?.kind === 'future' ? target.id : undefined);
  const subject = target?.kind === 'trip' ? trip : target ? future : undefined;
  const type = target?.kind === 'future' ? 'wish' : 'trip';
  const mine = useQuery(
    () => (target ? myMembership(type, target.id) : undefined),
    [type, target?.id],
  );

  const collab: Collaborator[] = subject?.collab ?? EMPTY;
  const title = subject ? ('title' in subject ? subject.title : subject.name) : '';
  const owner = collab.find((c) => c.owner);
  const iAmOwner = subject?.isOwner ?? false;
  const canEdit = subject?.canEdit ?? false;

  const invite = (person: { id: string; name: string }) => {
    if (!target) return;
    collabData.invite(type, target.id, [person.id]);
    setQuery('');
    toast.show(t('trips.people.invited', { name: firstName(person.name) }));
  };

  const remove = (c: Collaborator) => {
    if (!target) return;
    if (c.userId) collabData.remove(type, target.id, c.userId);
    else {
      // A free-text name (no Worlo account): only on the row's companions.
      const next = collab.filter((x) => x !== c);
      if (target.kind === 'trip') tripsData.setCompanions(target.id, next);
      else world.setFutureCompanions(target.id, next);
    }
    toast.show(t('trips.people.removed', { name: firstName(c.name) }), 'info');
  };

  const close = () => {
    setQuery('');
    onClose();
  };

  const leave = () => {
    if (!target) return;
    collabData.leave(type, target.id);
    close();
    toast.show(t('trips.people.left', { title }), 'info');
    router.navigate(routes.trips);
  };

  const shareLink = async () => {
    if (!target) return;
    try {
      const token = await createInviteLink(type, target.id);
      await copyLink(links.tripInvite(token));
    } catch (e) {
      toast.show(
        e instanceof OfflineError ? t('common.states.offlineTitle') : t('common.states.errorTitle'),
        'info',
      );
    }
  };

  const statusOf = (c: Collaborator) =>
    c.owner
      ? { label: t('trips.people.owner'), color: colors.textMuted }
      : c.status === 'ok'
        ? { label: t('trips.people.collaborator'), color: colors.success }
        : { label: t('trips.people.pending'), color: colors.link };

  const meRow = {
    key: ME,
    member: null as Collaborator | null,
    avatar: avatarFor(ME, me.avatar),
    name: t('trips.people.me', { name: me.name }),
    status: iAmOwner
      ? { label: t('trips.people.owner'), color: colors.textMuted }
      : mine?.status === 'pending'
        ? { label: t('trips.people.pending'), color: colors.link }
        : { label: t('trips.people.collaboratorMe'), color: colors.success },
    removable: false,
  };
  const others = collab.map((c) => ({
    key: c.name,
    member: c as Collaborator | null,
    avatar: avatarFor(c.name),
    name: c.name,
    status: statusOf(c),
    removable: iAmOwner && !c.owner,
  }));
  const rows = owner
    ? [...others.filter((r) => r.member?.owner), meRow, ...others.filter((r) => !r.member?.owner)]
    : [meRow, ...others];
  const taken = collab.flatMap((c) => (c.userId ? [c.userId] : []));

  return (
    <Sheet
      visible={Boolean(target && subject)}
      onClose={close}
      title={t('trips.people.title')}
      subtitle={title}
      testID="people-sheet"
      closeLabel={t('common.actions.close')}
    >
      <CollabNote />
      <View
        style={{
          borderRadius: radius.r16,
          borderWidth: 1,
          borderColor: colors.background,
          overflow: 'hidden',
        }}
      >
        {rows.map((row, index) => (
          <View
            key={row.key}
            testID={`member-${row.key}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: colors.background,
            }}
          >
            <Avatar {...row.avatar} size={36} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="body" weight={700}>
                {row.name}
              </Text>
              <Text variant="caption" weight={600} color={row.status.color}>
                {row.status.label}
              </Text>
            </View>
            {row.removable ? (
              <IconButton
                icon="x"
                tone="plain"
                iconColor={colors.textMuted}
                label={t('trips.people.remove', { name: row.name })}
                onPress={() => row.member && remove(row.member)}
              />
            ) : null}
          </View>
        ))}
      </View>
      {canEdit ? (
        <>
          <Text variant="overline" tone="muted" style={{ marginTop: 4 }}>
            {t('trips.people.inviteMore')}
          </Text>
          <TextField
            testID="people-search"
            label={t('trips.people.search')}
            hideLabel
            compact
            icon="magnifying-glass"
            placeholder={t('trips.people.search')}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          <FriendSuggestions friends={suggestFriends(following, taken, query)} onInvite={invite} />
          <Button
            testID="people-copy-link"
            variant="outline"
            size="md"
            icon="link"
            fullWidth
            label={t('trips.people.copyLink')}
            onPress={() => void shareLink()}
          />
        </>
      ) : null}
      {!iAmOwner && mine?.status === 'accepted' ? (
        <Button
          testID="people-leave"
          variant="ghost"
          size="md"
          icon="x"
          fullWidth
          label={t('trips.people.leave')}
          onPress={leave}
        />
      ) : null}
    </Sheet>
  );
}
