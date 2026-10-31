import { useTranslation } from '@worlo/i18n';
import {
  Avatar,
  colors,
  Icon,
  IconButton,
  makeStyles,
  opacity,
  Photo,
  palette,
  StarRating,
  Text,
} from '@worlo/ui';
import { Pressable, TextInput, View } from 'react-native';
import type { Comment } from '@/mocks/types';
import { useStore } from '@/store';
import type { CommunityPost, Vote } from '@/store/slices/community';
import { hasProfile, personAvatar, postPhoto, postStats, TYPE_KEYS, type TypeKey } from './model';

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
  const v = useStore((s) => s.votes[post.id]);
  const stats = postStats(post, v);
  const color = stats.level === 'high' ? colors.success : colors.textMuted;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
      <Icon name="seal-check" size={16} color={color} />
      <Text
        variant="caption"
        weight={700}
        style={{ color, fontSize: size }}
        numberOfLines={1}
        testID={`post-confirm-${post.id}`}
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
  const v = useStore((s) => s.votes[post.id]);
  const stats = postStats(post, v);
  const photo = postPhoto(post, 700, 400);
  const meta = t('community.post.meta', { place: post.where, when: post.when });
  return (
    <View style={styles.card} testID={`post-card-${post.id}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('community.post.author', { name: post.author })}, ${meta}`}
        disabled={!hasProfile(post)}
        onPress={onAuthor}
        style={styles.row}
      >
        <Avatar {...personAvatar(post.author, post.mine)} initials={post.ini} size={40} />
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
        testID={`post-open-${post.id}`}
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
            testID={`vote-yes-${post.id}`}
            value="yes"
            selected={v === 'yes'}
            count={stats.yes}
            onPress={() => onVote('yes')}
          />
          <VoteButton
            testID={`vote-no-${post.id}`}
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
export function CommentRow({ comment, isMe }: { comment: Comment; isMe: boolean }) {
  const styles = useStyles();
  return (
    <View style={{ flexDirection: 'row', gap: 10 }} accessible>
      <Avatar {...personAvatar(comment.who, isMe)} initials={comment.ini} size={32} />
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
