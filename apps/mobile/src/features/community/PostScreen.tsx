import { useTranslation } from '@worlo/i18n';
import {
  Avatar,
  BottomBar,
  colors,
  EmptyState,
  fontFamily,
  Icon,
  IconButton,
  makeStyles,
  Photo,
  ProgressBar,
  Screen,
  ScreenHeader,
  StarRating,
  Text,
} from '@worlo/ui';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { DemoGate } from '@/components/DemoGate';
import { useAddComment, useComments, usePost, useVote } from '@/data/community';
import { links, useCopyLink } from '@/lib/useCopyLink';
import { CommentRow, MessageComposer, QueryGate, VoteButton } from './components';
import { personAvatar, postPhoto, postStats, TYPE_KEYS, useGoBack, useOpenAuthor } from './model';

const useStyles = makeStyles((t) => ({
  block: { padding: 18, borderRadius: t.radius.r24, backgroundColor: t.colors.surface, gap: 12 },
}));

/** G1 · Detalhe da publicação. */
export function PostScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const copyLink = useCopyLink();
  const back = useGoBack();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = usePost(id);
  const post = query.data;
  const comments = useComments(post ? id : undefined).data ?? [];
  const addComment = useAddComment();
  const onVote = useVote();
  const openAuthor = useOpenAuthor();
  const [text, setText] = useState('');

  const header = (overline?: string) => (
    <ScreenHeader
      overline={overline}
      onBack={back}
      backLabel={t('common.actions.back')}
      right={
        overline ? (
          <IconButton
            icon="export"
            label={t('common.actions.share')}
            onPress={() => copyLink(links.post(id))}
          />
        ) : null
      }
    />
  );

  if (!post) {
    return (
      <DemoGate network onBack={back}>
        <QueryGate query={query} onBack={back}>
          <Screen testID="post-screen" header={header()}>
            <EmptyState title={t('community.post.notFound')} />
          </Screen>
        </QueryGate>
      </DemoGate>
    );
  }

  const vote = post.myVote;
  const stats = postStats(post, vote);
  const photo = postPhoto(post, 700, 480);
  const relColor = stats.level === 'high' ? colors.success : colors.textMuted;
  const pctLabel = `${stats.pct}%`;

  const send = () => {
    const value = text.trim();
    if (!value) return;
    setText('');
    void addComment(post.id, value).then((ok) => {
      // Keep what was typed when it could not be sent.
      if (!ok) setText((current) => current || value);
    });
  };

  return (
    <DemoGate network onBack={back}>
      <Screen
        testID="post-screen"
        gap={18}
        header={header(t(`community.types.${TYPE_KEYS[post.type]}`))}
        bottomBarWithKeyboard
        bottomBar={
          <BottomBar tone="white">
            <MessageComposer
              value={text}
              onChangeText={setText}
              onSend={send}
              placeholder={t('community.comments.placeholder')}
              sendLabel={t('community.comments.send')}
              inputTestID="post-comment-input"
              sendTestID="post-comment-send"
            />
          </BottomBar>
        }
      >
        <Pressable
          testID="post-author"
          accessibilityRole="button"
          accessibilityLabel={t('community.post.author', { name: post.author })}
          onPress={() => openAuthor(post)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <Avatar
            {...personAvatar(post.author, post.mine, post.avatarUrl)}
            initials={post.ini}
            size={44}
          />
          <View style={{ flex: 1 }}>
            <Text variant="body" weight={700}>
              {post.author}
            </Text>
            <Text variant="caption" tone="muted">
              {t('community.post.meta', { place: post.where, when: post.when })}
            </Text>
          </View>
          <Icon name="caret-right" color={colors.textMuted} />
        </Pressable>
        {post.rating ? (
          <StarRating
            size="inline"
            value={post.rating}
            starLabel={(n) => t('common.a11y.stars', { count: n })}
          />
        ) : null}
        <Text variant="body" style={{ fontSize: 18, lineHeight: 27 }}>
          {post.text}
        </Text>
        {photo ? (
          <Photo
            uri={photo}
            tint={colors.border}
            height={240}
            radius={20}
            accessibilityLabel={t('community.post.photo')}
          />
        ) : null}

        <View style={styles.block} testID="post-reliability">
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
            <Text variant="stat" testID="post-pct" style={{ fontSize: 36, lineHeight: 40 }}>
              {pctLabel}
            </Text>
            <Text
              variant="label"
              weight={700}
              style={{ color: relColor }}
              testID="post-reliability-label"
            >
              {t(`community.reliability.${stats.level}`)}
            </Text>
          </View>
          <ProgressBar
            value={stats.pct / 100}
            color={colors.success}
            track={colors.background}
            height={8}
            label={t('community.reliability.bar', { pct: pctLabel })}
          />
          <Text variant="caption" tone="muted" testID="post-reliability-explain">
            {t('community.reliability.explain', { yes: stats.yes, no: stats.no })}
          </Text>
          <Text variant="label" weight={700} style={{ marginTop: 4 }}>
            {t('community.vote.question')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <VoteButton
              full
              testID="post-vote-yes"
              value="yes"
              selected={vote === 'yes'}
              count={stats.yes}
              onPress={() => void onVote(post, 'yes')}
            />
            <VoteButton
              full
              testID="post-vote-no"
              value="no"
              selected={vote === 'no'}
              count={stats.no}
              onPress={() => void onVote(post, 'no')}
            />
          </View>
        </View>

        <View style={{ gap: 10 }} testID="post-comments">
          <Text variant="h3">
            {`${t('community.comments.title')} `}
            <Text variant="h3" tone="muted" style={{ fontFamily: fontFamily.title500 }}>
              {t('community.comments.count', { n: Math.max(comments.length, post.comments) })}
            </Text>
          </Text>
          {comments.map((c) => (
            <CommentRow key={c.id} comment={c} />
          ))}
        </View>
      </Screen>
    </DemoGate>
  );
}
