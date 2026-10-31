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
import { useState } from 'react';
import { View } from 'react-native';
import { avatarFor, firstName, ME } from '@/lib/people';
import { links, useCopyLink } from '@/lib/useCopyLink';
import type { Collaborator } from '@/mocks/types';
import { useStore } from '@/store';
import type { Member } from '@/store/slices/trips';
import { CollabNote, FriendSuggestions, suggestFriends } from './parts';

export type PeopleTarget = { kind: 'trip' | 'future'; id: string };

const EMPTY: Member[] = [];

/**
 * Sheet "Pessoas na viagem" (H): members with their status, invite friends and
 * copy the invite link. Only the owner removes people (05 → Permissões).
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
  const copyLink = useCopyLink();
  const [query, setQuery] = useState('');
  const me = useStore((s) => s.me);
  const subject = useStore((s) =>
    target?.kind === 'trip'
      ? s.trips.find((x) => x.id === target.id)
      : target
        ? s.futures.find((x) => x.id === target.id)
        : undefined,
  );
  const setCollaborators = useStore((s) => s.setCollaborators);
  const setFutureCollaborators = useStore((s) => s.setFutureCollaborators);

  const collab: Member[] = (subject?.collab as Member[] | undefined) ?? EMPTY;
  const title = subject ? ('title' in subject ? subject.title : subject.name) : '';
  const owner = collab.find((c) => c.owner);
  const iAmOwner = !owner;

  const save = (next: Member[]) => {
    if (!target) return;
    if (target.kind === 'trip') setCollaborators(target.id, next);
    else setFutureCollaborators(target.id, next);
  };

  const invite = (name: string) => {
    const pending: Collaborator = { name, status: 'pending' };
    save([...collab, pending]);
    setQuery('');
    toast.show(t('trips.people.invited', { name: firstName(name) }));
  };

  const remove = (name: string) => {
    save(collab.filter((c) => c.name !== name));
    toast.show(t('trips.people.removed', { name: firstName(name) }), 'info');
  };

  const close = () => {
    setQuery('');
    onClose();
  };

  const statusOf = (c: Member) =>
    c.owner
      ? { label: t('trips.people.owner'), color: colors.textMuted }
      : c.status === 'ok'
        ? { label: t('trips.people.collaborator'), color: colors.success }
        : { label: t('trips.people.pending'), color: colors.link };

  const meRow = {
    key: ME,
    avatar: avatarFor(ME, me.avatar),
    name: t('trips.people.me', { name: me.name }),
    status: owner
      ? { label: t('trips.people.collaboratorMe'), color: colors.success }
      : { label: t('trips.people.owner'), color: colors.textMuted },
    removable: false,
  };
  const others = collab.map((c) => ({
    key: c.name,
    avatar: avatarFor(c.name),
    name: c.name,
    status: statusOf(c),
    removable: iAmOwner && !c.owner,
  }));
  const rows = owner
    ? [
        ...others.filter((r) => r.key === owner.name),
        meRow,
        ...others.filter((r) => r.key !== owner.name),
      ]
    : [meRow, ...others];

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
                onPress={() => remove(row.key)}
              />
            ) : null}
          </View>
        ))}
      </View>
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
      <FriendSuggestions
        friends={suggestFriends(
          collab.map((c) => c.name),
          query,
        )}
        onInvite={(f) => invite(f.name)}
      />
      <Button
        testID="people-copy-link"
        variant="outline"
        size="md"
        icon="link"
        fullWidth
        label={t('trips.people.copyLink')}
        onPress={() => copyLink(links.tripInvite(target?.id ?? ''))}
      />
    </Sheet>
  );
}
