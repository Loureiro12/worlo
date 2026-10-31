import { useTranslation } from '@worlo/i18n';
import { Avatar, colors, IconCircle, layout, makeStyles, ScreenHeader, Text } from '@worlo/ui';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '@/store';
import type { ChatMessage } from '@/store/slices/community';
import { MessageComposer } from './components';
import { CHAT_SEEDS, DEFAULT_CHAT_SEED, PEOPLE_REPLIES, REPLY_DELAY_MS, SUPPORT_ID } from './data';
import { clockTime, personAvatar, useGoBack } from './model';

const EMPTY: ChatMessage[] = [];

const useStyles = makeStyles((t) => ({
  bubble: { paddingVertical: 10, paddingHorizontal: 14 },
  sent: {
    backgroundColor: t.colors.primaryPressed,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 6,
    borderBottomLeftRadius: 18,
  },
  received: {
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 6,
  },
  bar: {
    paddingTop: 10,
    paddingHorizontal: 16,
    backgroundColor: t.colors.surface,
    borderTopWidth: 1,
    borderTopColor: t.colors.hairline,
    gap: 10,
  },
  quick: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: t.radius.full,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    justifyContent: 'center',
  },
}));

/** G3 · Chat (people and support). `id` = person name or 'support'. */
export function ChatScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const back = useGoBack();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const isSupport = id === SUPPORT_ID;
  const me = useStore((s) => s.me);
  const sent = useStore((s) => s.chats[id] ?? EMPTY);
  const sendMessage = useStore((s) => s.sendMessage);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const name = isSupport ? t('community.chat.support') : id;
  const seed = useMemo<ChatMessage[]>(
    () =>
      isSupport
        ? [
            {
              id: 'seed-support',
              from: 'them',
              text: t('community.chat.supportHello', { name: me.name.split(' ')[0] }),
              time: t('community.time.now'),
            },
          ]
        : (CHAT_SEEDS[id] ?? DEFAULT_CHAT_SEED),
    [isSupport, id, me.name, t],
  );
  // Inverted list: newest first, rendered at the bottom.
  const messages = useMemo(() => [...seed, ...sent].reverse(), [seed, sent]);

  const replies = isSupport
    ? [
        t('community.chat.supportReplies.a'),
        t('community.chat.supportReplies.b'),
        t('community.chat.supportReplies.c'),
      ]
    : PEOPLE_REPLIES;

  const send = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    const time = clockTime();
    sendMessage(id, { id: `m${Date.now()}`, from: 'me', text: value, time });
    setText('');
    setTyping(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const answered = (useStore.getState().chats[id] ?? []).filter((m) => m.from === 'them');
      sendMessage(id, {
        id: `r${Date.now()}`,
        from: 'them',
        text: replies[answered.length % replies.length] ?? '',
        time: clockTime(),
      });
      setTyping(false);
    }, REPLY_DELAY_MS);
  };

  const quick = isSupport && !sent.length;

  return (
    <View testID="chat-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />
      <ScreenHeader white onBack={back} backLabel={t('common.actions.back')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {isSupport ? (
            <IconCircle
              icon="headset"
              size={40}
              iconSize={20}
              weight="fill"
              background={colors.selected}
              color={colors.onSelected}
            />
          ) : (
            <Avatar {...personAvatar(id)} size={40} />
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="bodyL" weight={700} numberOfLines={1} testID="chat-name">
              {name}
            </Text>
            <Text
              variant="caption"
              weight={600}
              tone={isSupport ? 'muted' : 'success'}
              style={{ fontSize: 12 }}
            >
              {isSupport ? t('community.chat.supportSub') : t('community.chat.online')}
            </Text>
          </View>
        </View>
      </ScreenHeader>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          testID="chat-list"
          inverted
          data={messages}
          keyExtractor={(m) => m.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            typing ? (
              <View
                testID="chat-typing"
                accessibilityLiveRegion="polite"
                style={[styles.bubble, styles.received, { alignSelf: 'flex-start' }]}
              >
                <Text variant="caption" weight={600} tone="muted">
                  {t('community.chat.typing')}
                </Text>
              </View>
            ) : undefined
          }
          ListFooterComponent={
            <Text
              variant="caption"
              weight={600}
              tone="muted"
              align="center"
              style={{ fontSize: 12, paddingVertical: 6 }}
            >
              {isSupport ? t('community.chat.today') : t('community.chat.yesterday')}
            </Text>
          }
          renderItem={({ item }) => {
            const mine = item.from === 'me';
            return (
              <View
                accessible
                accessibilityLabel={
                  mine
                    ? t('community.chat.sent', { time: item.time, text: item.text })
                    : t('community.chat.received', { name, time: item.time, text: item.text })
                }
                style={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  alignItems: mine ? 'flex-end' : 'flex-start',
                  maxWidth: '78%',
                  gap: 3,
                }}
              >
                <View style={[styles.bubble, mine ? styles.sent : styles.received]}>
                  <Text variant="body" style={{ lineHeight: 21 }}>
                    {item.text}
                  </Text>
                </View>
                <Text variant="micro" tone="muted" style={{ paddingHorizontal: 4 }}>
                  {item.time}
                </Text>
              </View>
            );
          }}
        />
        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {quick ? (
            <View
              accessibilityLabel={t('community.chat.quickLabel')}
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
            >
              {(['photos', 'booking', 'privacy'] as const).map((k) => {
                const label = t(`community.chat.quick.${k}`);
                return (
                  <Pressable
                    key={k}
                    testID={`chat-quick-${k}`}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    onPress={() => send(label)}
                    style={styles.quick}
                  >
                    <Text variant="caption" weight={600}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', paddingBottom: layout.listGap }}>
            <MessageComposer
              value={text}
              onChangeText={setText}
              onSend={() => send(text)}
              placeholder={t('community.chat.placeholder')}
              sendLabel={t('community.chat.send')}
              inputTestID="chat-input"
              sendTestID="chat-send"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
