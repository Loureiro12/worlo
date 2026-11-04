import { useTranslation } from '@worlo/i18n';
import {
  Avatar,
  Button,
  colors,
  FullScreenState,
  Icon,
  IconButton,
  makeStyles,
  opacity,
  Photo,
  palette,
  radius,
  SkeletonBlock,
  SkeletonScreen,
  StarRating,
  Text,
} from '@worlo/ui';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import {
  type CommunityPost,
  isOfflineError,
  OfflineError,
  type PostComment,
  type Vote,
} from '@/data/community';
import { routes } from '@/navigation/routes';
import { personAvatar, postKey, postPhoto, postStats, TYPE_KEYS, type TypeKey } from './model';

const useStyles = makeStyles((t) => ({
  typeChip: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: t.radius.full,
    borderWidth: 1,
    borderColor: t.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    padding: 16,
    borderRadius: t.radius.r24,
    backgroundColor: t.colors.surface,
    gap: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  bubble: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: t.radius.r16,
    backgroundColor: t.colors.surface,
    gap: 2,
    minWidth: 0,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.background,
    fontFamily: t.text.body.fontFamily,
    fontSize: 15,
    color: t.colors.text,
  },
}));

export function TypeChip({ typeKey }: { typeKey: TypeKey }) {
  const styles = useStyles();
  const { t } = useTranslation();
  return (
    <View style={styles.typeChip}>
      <Text variant="caption" weight={700} style={{ fontSize: 12 }}>
        {t(`community.types.${typeKey}`)}
      </Text>
    </View>
  );
}

/**
 * Confirm/dispute toggle. Compact (feed): "✓ 128". Full (post detail): flex
 * button with "Está correto". Exposes the user's vote as `selected`.
 */
export function VoteButton({
  value,
  selected,
  count,
  full = false,
  onPress,
  testID,
}: {
  value: Vote;
  selected: boolean;
  count: number;
  full?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const yes = value === 'yes';
  const bg = selected ? (yes ? colors.selected : colors.textSupport) : colors.surface;
  const fg = selected ? colors.onSelected : colors.text;
  const label = full
    ? t(yes ? 'community.vote.yes' : 'community.vote.no')
    : t(yes ? 'community.vote.yesCount' : 'community.vote.noCount', { n: count });
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={full ? undefined : 4}
      style={({ pressed }) => ({
        height: full ? 44 : 36,
        flex: full ? 1 : undefined,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: yes ? colors.text : colors.border,
        backgroundColor: bg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Icon name={yes ? 'check' : 'x'} size={full ? 18 : 16} color={fg} />
      <Text variant="caption" weight={700} style={{ color: fg, fontSize: full ? 14 : 13 }}>
        {full ? label : String(count)}
      </Text>
    </Pressable>
  );
}

/** "seal-check 97% confirmam" (green when highly reliable) or "Aguardando confirmações". */
export function ConfirmLine({ post, size = 13 }: { post: CommunityPost; size?: 12 | 13 }) {
  const { t } = useTranslation();
  const stats = postStats(post, post.myVote);
  const color = stats.level === 'high' ? colors.success : colors.textMuted;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
      <Icon name="seal-check" size={16} color={color} />
      <Text
        variant="caption"
        weight={700}
        style={{ color, fontSize: size }}
        numberOfLines={1}
        testID={`post-confirm-${postKey(post.id)}`}
      >
        {stats.total
          ? t('community.post.confirm', { pct: `${stats.pct}%` })
          : t('community.reliability.waiting')}
      </Text>
    </View>
  );
}

export type PostCardProps = {
  post: CommunityPost;
  onOpen: () => void;
  onAuthor: () => void;
  onVote: (value: Vote) => void;
};

/** B4 · Card de post. */
export function PostCard({ post, onOpen, onAuthor, onVote }: PostCardProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const v = post.myVote;
  const key = postKey(post.id);
  const stats = postStats(post, v);
  const photo = postPhoto(post, 700, 400);
  const meta = t('community.post.meta', { place: post.where, when: post.when });
  return (
    <View style={styles.card} testID={`post-card-${key}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('community.post.author', { name: post.author })}, ${meta}`}
        onPress={onAuthor}
        style={styles.row}
      >
        <Avatar
          {...personAvatar(post.author, post.mine, post.avatarUrl)}
          initials={post.ini}
          size={40}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="body" weight={700} numberOfLines={1}>
            {post.author}
          </Text>
          <Text variant="caption" tone="muted" style={{ fontSize: 12 }} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <TypeChip typeKey={TYPE_KEYS[post.type]} />
      </Pressable>
      <Pressable
        testID={`post-open-${key}`}
        accessibilityRole="button"
        accessibilityLabel={t('community.post.open', { name: post.author })}
        accessibilityHint={post.text}
        onPress={onOpen}
        style={{ gap: 12 }}
      >
        {post.rating ? (
          <StarRating
            size="inline"
            value={post.rating}
            starLabel={(n) => t('common.a11y.stars', { count: n })}
          />
        ) : null}
        <Text variant="body">{post.text}</Text>
        {photo ? <Photo uri={photo} tint={post.tint} height={170} radius={16} /> : null}
      </Pressable>
      <View style={styles.footer}>
        <ConfirmLine post={post} />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <VoteButton
            testID={`vote-yes-${key}`}
            value="yes"
            selected={v === 'yes'}
            count={stats.yes}
            onPress={() => onVote('yes')}
          />
          <VoteButton
            testID={`vote-no-${key}`}
            value="no"
            selected={v === 'no'}
            count={stats.no}
            onPress={() => onVote('no')}
          />
        </View>
      </View>
    </View>
  );
}

/** G1 · Comentário: avatar 32 + white bubble. */
export function CommentRow({ comment }: { comment: PostComment }) {
  const styles = useStyles();
  return (
    <View style={{ flexDirection: 'row', gap: 10 }} accessible>
      <Avatar
        {...personAvatar(comment.who, comment.mine, comment.avatarUrl)}
        initials={comment.ini}
        size={32}
      />
      <View style={styles.bubble}>
        <Text variant="caption" weight={700}>
          {comment.who}{' '}
          <Text variant="caption" weight={500} tone="muted">
            {`· ${comment.when}`}
          </Text>
        </Text>
        <Text variant="bodyS" weight={400}>
          {comment.text}
        </Text>
      </View>
    </View>
  );
}

/**
 * Pill input + coral send (Post comments, Chat). Send is disabled at .4 while
 * empty; the keyboard "send" key submits too.
 * Promotion candidate → @worlo/ui `MessageComposer`.
 */
export function MessageComposer({
  value,
  onChangeText,
  onSend,
  placeholder,
  sendLabel,
  inputTestID,
  sendTestID,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder: string;
  sendLabel: string;
  inputTestID?: string;
  sendTestID?: string;
}) {
  const styles = useStyles();
  const empty = !value.trim();
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <TextInput
        testID={inputTestID}
        accessibilityLabel={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        returnKeyType="send"
        submitBehavior="submit"
        onSubmitEditing={() => {
          if (!empty) onSend();
        }}
        style={styles.input}
      />
      <View style={{ opacity: empty ? opacity.disabled : 1 }}>
        <IconButton
          testID={sendTestID}
          icon="paper-plane-right"
          label={sendLabel}
          tone="coral"
          size={44}
          disabled={empty}
          onPress={onSend}
        />
      </View>
    </View>
  );
}

/** Seguir / Seguindo outline ↔ carvão pill (36 or 44 high). */
export function FollowPill({
  followed,
  name,
  onPress,
  large = false,
  testID,
}: {
  followed: boolean;
  name: string;
  onPress: () => void;
  large?: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const label = followed ? t('community.experts.followingLabel') : t('community.experts.follow');
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${name}`}
      accessibilityState={{ selected: followed }}
      onPress={onPress}
      style={({ pressed }) => ({
        height: large ? 44 : 36,
        flex: large ? 1 : undefined,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: palette.carvao,
        backgroundColor: followed ? palette.carvao : palette.branco,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text
        variant="caption"
        weight={700}
        style={{ fontSize: large ? 15 : 13, color: followed ? palette.branco : palette.carvao }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type QueryLike = {
  data?: unknown;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  /** 'paused' = React Query is waiting for the connection to come back. */
  fetchStatus: string;
  refetch: () => unknown;
};

/** Nothing to show and no way to load it now: offline (paused) or failed. */
export function queryFailure(query: QueryLike): { error: unknown } | null {
  if (query.data !== undefined) return null;
  if (query.isError) return { error: query.error };
  if (query.fetchStatus === 'paused') return { error: new OfflineError() };
  return null;
}

/** Offline / server-error full screen for online data (same copy as DemoGate). */
export function OnlineErrorState({
  error,
  onRetry,
  onBack,
}: {
  error: unknown;
  onRetry: () => void;
  onBack?: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  if (isOfflineError(error)) {
    return (
      <FullScreenState
        kind="offline"
        title={t('common.states.offlineTitle')}
        text={t('common.states.offlineText')}
        retryLabel={t('common.actions.retry')}
        onRetry={onRetry}
        secondary={{
          label: t('common.states.offlineSecondary'),
          onPress: () => router.navigate(routes.trips),
        }}
        onBack={onBack}
        backLabel={t('common.actions.back')}
      />
    );
  }
  return (
    <FullScreenState
      kind="error"
      title={t('common.states.errorTitle')}
      text={t('common.states.errorText')}
      retryLabel={t('common.actions.retry')}
      onRetry={onRetry}
      secondary={{
        label: t('common.states.errorSecondary'),
        onPress: () => router.push(routes.chat('support')),
      }}
      onBack={onBack}
      backLabel={t('common.actions.back')}
    />
  );
}

/**
 * Loading skeleton / offline / error for a screen whose content is online.
 * Cached data wins: the screen keeps showing it while a refetch fails.
 */
export function QueryGate({
  query,
  onBack,
  children,
}: {
  query: QueryLike;
  onBack?: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const failure = queryFailure(query);
  if (failure) {
    return (
      <OnlineErrorState
        error={failure.error}
        onRetry={() => void query.refetch()}
        onBack={onBack}
      />
    );
  }
  if (query.data === undefined && query.isLoading) {
    return <SkeletonScreen label={t('common.states.loading')} />;
  }
  return children;
}

/** "Carregar mais" under a paged feed: nothing once the last page is in. */
export function LoadMore({
  testID,
  query,
}: {
  testID: string;
  query: {
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    isFetchNextPageError: boolean;
    fetchNextPage: () => unknown;
  };
}) {
  const { t } = useTranslation();
  if (!query.hasNextPage) return null;
  return (
    <View style={{ gap: 8 }}>
      {query.isFetchNextPageError ? (
        <Text testID={`${testID}-error`} variant="caption" tone="muted" align="center">
          {t('community.feed.loadMoreError')}
        </Text>
      ) : null}
      <Button
        testID={testID}
        variant="outline"
        fullWidth
        loading={query.isFetchingNextPage}
        label={t('community.feed.loadMore')}
        onPress={() => void query.fetchNextPage()}
      />
    </View>
  );
}

/** Inline list placeholder while a feed loads. */
export function PostSkeletons({ count = 2, height = 220 }: { count?: number; height?: number }) {
  const { t } = useTranslation();
  return (
    <View
      style={{ gap: 14 }}
      accessibilityLabel={t('common.states.loading')}
      testID="posts-loading"
    >
      {Array.from({ length: count }, (_, i) => (
        <SkeletonBlock key={i} style={{ height, borderRadius: radius.r24 }} />
      ))}
    </View>
  );
}
