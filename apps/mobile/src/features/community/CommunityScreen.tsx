import { useTranslation } from '@worlo/i18n';
import {
  Avatar,
  EmptyState,
  IconButton,
  makeStyles,
  palette,
  Screen,
  Segmented,
  StatusChip,
  TabHeader,
  Text,
} from '@worlo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { DemoGate } from '@/components/DemoGate';
import { EXPERTS, POSTS } from '@/mocks/data.generated';
import type { Expert } from '@/mocks/types';
import { routes } from '@/navigation/routes';
import { useStore } from '@/store';
import { FollowPill, PostCard } from './components';
import { useAllPosts, useOpenAuthor, useVoteAction } from './model';

type Segment = 'forYou' | 'following' | 'experts';

const useStyles = makeStyles((t) => ({
  expert: { padding: 16, borderRadius: t.radius.r24, backgroundColor: t.colors.surface, gap: 12 },
  highlight: {
    padding: 14,
    borderRadius: t.radius.r16,
    backgroundColor: t.colors.background,
    gap: 4,
  },
}));

/** B4 · Comunidade (tab root). */
export function CommunityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>('forYou');
  const following = useStore((s) => s.following);
  const all = useAllPosts();
  const onVote = useVoteAction();
  const openAuthor = useOpenAuthor();

  const posts =
    segment === 'following'
      ? POSTS.filter((p) => following[p.author])
      : segment === 'forYou'
        ? all
        : [];

  return (
    <DemoGate network error loading>
      <Screen
        testID="community-screen"
        withTabBar
        gap={20}
        header={
          <TabHeader
            title={t('community.title')}
            actions={
              <>
                <IconButton
                  testID="community-search"
                  icon="magnifying-glass"
                  label={t('community.search')}
                  onPress={() => router.push(routes.search)}
                />
                <IconButton
                  testID="community-compose"
                  icon="plus"
                  tone="coral"
                  label={t('community.publish')}
                  onPress={() => router.push(routes.compose())}
                />
              </>
            }
          />
        }
      >
        <Segmented
          testID="community-segment"
          label={t('community.segments.label')}
          value={segment}
          onChange={setSegment}
          options={[
            { value: 'forYou', label: t('community.segments.forYou') },
            { value: 'following', label: t('community.segments.following') },
            { value: 'experts', label: t('community.segments.experts') },
          ]}
        />
        {segment === 'experts' ? (
          <View style={{ gap: 12 }}>
            <Text variant="bodyS" weight={400} tone="muted">
              {t('community.experts.intro')}
            </Text>
            {EXPERTS.map((x) => (
              <ExpertCard key={x.id} expert={x} />
            ))}
          </View>
        ) : posts.length ? (
          <View style={{ gap: 14 }}>
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                onOpen={() => router.push(routes.post(p.id))}
                onAuthor={() => openAuthor(p)}
                onVote={(v) => onVote(p, v)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            testID="community-following-empty"
            icon="users"
            title={t('community.following.emptyTitle')}
            text={t('community.following.emptyText')}
            action={{
              label: t('community.following.emptyAction'),
              onPress: () => setSegment('experts'),
            }}
          />
        )}
      </Screen>
    </DemoGate>
  );
}

function ExpertCard({ expert }: { expert: Expert }) {
  const styles = useStyles();
  const { t } = useTranslation();
  const followed = useStore((s) => Boolean(s.following[expert.id]));
  const toggleFollow = useStore((s) => s.toggleFollow);
  return (
    <View style={styles.expert} testID={`expert-${expert.id}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar
          name={expert.name}
          initials={expert.ini}
          size={48}
          colors={{ background: palette.carvao, foreground: palette.branco }}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="body" weight={700}>
            {expert.name}
          </Text>
          <Text variant="caption" tone="muted">
            {expert.role}
          </Text>
        </View>
        <FollowPill
          testID={`expert-follow-${expert.id}`}
          followed={followed}
          name={expert.name}
          onPress={() => toggleFollow(expert.id)}
        />
      </View>
      <StatusChip
        kind="verified"
        size="sm"
        label={t('community.experts.verified', { area: expert.area })}
      />
      <View style={styles.highlight}>
        <Text variant="body" weight={700} style={{ lineHeight: 20 }}>
          {expert.title}
        </Text>
        <Text variant="bodyS" weight={400} tone="support">
          {expert.text}
        </Text>
      </View>
    </View>
  );
}
