import { useTranslation } from '@worlo/i18n';
import {
  Avatar,
  EmptyState,
  IconButton,
  initialsOf,
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
import { Pressable, View } from 'react-native';
import { DemoGate } from '@/components/DemoGate';
import { useAuthorPosts, useFeedPages, useRefreshAfterFollow, useVote } from '@/data/community';
import { type Person, toggleFollow, useExperts, useIsFollowing } from '@/data/people';
import { routes } from '@/navigation/routes';
import {
  FollowPill,
  LoadMore,
  OnlineErrorState,
  PostCard,
  PostSkeletons,
  queryFailure,
} from './components';
import { useOpenAuthor } from './model';

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

/** B4 · Comunidade (tab root). Feed online (React Query); experts and follows synced. */
export function CommunityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>('forYou');
  const forYou = useFeedPages({ segment: 'foryou' }, { enabled: segment === 'forYou' });
  const following = useFeedPages({ segment: 'following' }, { enabled: segment === 'following' });
  const experts = useExperts();
  const onVote = useVote();
  const openAuthor = useOpenAuthor();

  const feed = segment === 'following' ? following : forYou;
  const posts = feed.data ?? [];

  const failure = segment === 'experts' ? null : queryFailure(feed);
  if (failure) {
    return (
      <DemoGate network error loading>
        <OnlineErrorState error={failure.error} onRetry={() => void feed.refetch()} />
      </DemoGate>
    );
  }

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
            {experts.map((x) => (
              <ExpertCard key={x.id} expert={x} />
            ))}
          </View>
        ) : feed.isLoading ? (
          <PostSkeletons />
        ) : posts.length ? (
          <View style={{ gap: 14 }}>
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                onOpen={() => router.push(routes.post(p.id))}
                onAuthor={() => openAuthor(p)}
                onVote={(v) => void onVote(p, v)}
              />
            ))}
            <LoadMore testID="community-load-more" query={feed} />
          </View>
        ) : segment === 'forYou' ? (
          <EmptyState
            testID="community-feed-empty"
            icon="chat-circle"
            title={t('community.feed.emptyTitle')}
            text={t('community.feed.emptyText')}
            action={{
              label: t('community.publish'),
              onPress: () => router.push(routes.compose()),
            }}
          />
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

/** Stable testIDs for the demo experts ('anaserrano'), from the username. */
const expertKey = (expert: Person) => expert.username || expert.id;

/** Expert (synced `people` row) + their latest post (online). */
function ExpertCard({ expert }: { expert: Person }) {
  const styles = useStyles();
  const { t } = useTranslation();
  const router = useRouter();
  const followed = useIsFollowing(expert.id);
  const refresh = useRefreshAfterFollow();
  const latest = useAuthorPosts(expert.id, 1).data?.[0];
  const key = expertKey(expert);
  const onFollow = () => {
    toggleFollow(expert.id);
    refresh(expert.id);
  };
  return (
    <View style={styles.expert} testID={`expert-${key}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('community.post.author', { name: expert.name })}
          onPress={() => router.push(routes.traveler(expert.id))}
          style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <Avatar
            name={expert.name}
            initials={initialsOf(expert.name)}
            photoUrl={expert.avatarUrl}
            size={48}
            colors={{ background: palette.carvao, foreground: palette.branco }}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="body" weight={700}>
              {expert.name}
            </Text>
            <Text variant="caption" tone="muted">
              {expert.expertRole}
            </Text>
          </View>
        </Pressable>
        <FollowPill
          testID={`expert-follow-${key}`}
          followed={followed}
          name={expert.name}
          onPress={onFollow}
        />
      </View>
      <StatusChip
        kind="verified"
        size="sm"
        label={t('community.experts.verified', { area: expert.expertArea ?? '' })}
      />
      {latest ? (
        <Pressable
          testID={`expert-post-${key}`}
          accessibilityRole="button"
          accessibilityLabel={t('community.post.open', { name: expert.name })}
          accessibilityHint={latest.text}
          onPress={() => router.push(routes.post(latest.id))}
          style={styles.highlight}
        >
          {latest.title ? (
            <Text variant="body" weight={700} style={{ lineHeight: 20 }}>
              {latest.title}
            </Text>
          ) : null}
          <Text variant="bodyS" weight={400} tone="support">
            {latest.text}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
