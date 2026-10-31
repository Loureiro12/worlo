import { useTranslation } from '@worlo/i18n';
import {
  Avatar,
  colors,
  FullScreenState,
  IconCircle,
  layout,
  makeStyles,
  ScreenHeader,
  Text,
} from '@worlo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  type Message,
  markThreadRead,
  openDirectThread,
  openSupportThread,
  SUPPORT,
  sendMessage,
  useMessages,
  useOtherMember,
  useThread,
  useUnreadCount,
} from '@/data/chat';
import { usePerson } from '@/data/people';
import { useMe } from '@/data/profile';
import { useSync } from '@/features/sync/SyncProvider';
import { firstName } from '@/lib/people';
import { routes } from '@/navigation/routes';
import { useAuth } from '@/providers/AuthProvider';
import { MessageComposer } from './components';
import { personAvatar, useGoBack } from './model';

type Item =
  | { kind: 'message'; id: string; mine: boolean; text: string; time: string }
  | { kind: 'day'; id: string; label: string };

const clock = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

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

/**
 * G3 · Chat (people and support). `id` = a person id (the direct thread with
 * them), a thread id or 'support'. Messages are synced rows: sending works
 * offline. A thread that isn't on the device yet is opened online.
 */
export function ChatScreen() {
  const styles = useStyles();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const back = useGoBack();
  const sync = useSync();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const isSupport = id === SUPPORT;
  const me = useMe();
  const myId = useAuth().user?.id ?? null;
  const thread = useThread(id);
  const otherId = useOtherMember(thread);
  const person = usePerson(isSupport ? null : (otherId ?? (thread ? null : id)));
  const rows = useMessages(thread?.id);
  const unread = useUnreadCount(thread?.id);
  const [text, setText] = useState('');
  const [opening, setOpening] = useState<'idle' | 'busy' | 'error'>('idle');

  // Not on the device yet: open it on the server, then pull it down.
  const missing = !thread && Boolean(id);
  const { online, retry } = sync;
  // The sync context changes on every status update: keep `retry` out of the deps.
  const pull = useRef(retry);
  pull.current = retry;
  const openThread = useCallback(async () => {
    setOpening('busy');
    const result = await (isSupport ? openSupportThread() : openDirectThread(id));
    setOpening(result.ok ? 'idle' : 'error');
    if (result.ok) pull.current();
  }, [isSupport, id]);
  useEffect(() => {
    if (missing && online) void openThread();
  }, [missing, online, openThread]);

  // Reading the thread marks it read (also when new messages arrive while open).
  useEffect(() => {
    if (thread && unread > 0) markThreadRead(thread.id);
  }, [thread, unread]);

  const name = isSupport ? t('community.chat.support') : (person?.name ?? '');

  // Inverted list: newest first, rendered at the bottom; a day label above each day.
  const items = useMemo<Item[]>(() => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86_400_000);
    const dayLabel = (date: Date) => {
      const key = dayKey(date);
      if (key === dayKey(now)) return t('community.chat.today');
      if (key === dayKey(yesterday)) return t('community.chat.yesterday');
      return date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long' });
    };
    const list: Item[] = [];
    let lastDay = '';
    const add = (message: Pick<Message, 'id' | 'userId' | 'text'>, date: Date) => {
      const key = dayKey(date);
      if (key !== lastDay) {
        lastDay = key;
        list.push({ kind: 'day', id: `day-${key}`, label: dayLabel(date) });
      }
      list.push({
        kind: 'message',
        id: message.id,
        mine: message.userId === myId,
        text: message.text,
        time: clock(date),
      });
    };
    if (isSupport) {
      // Worlo's greeting is UI copy; the team's replies arrive as messages.
      add(
        {
          id: 'support-hello',
          userId: '',
          text: t('community.chat.supportHello', { name: firstName(me.name) }),
        },
        new Date(thread?.createdAt ?? now),
      );
    }
    for (const m of rows) add(m, new Date(m.createdAt));
    return list.reverse();
  }, [rows, isSupport, myId, me.name, thread?.createdAt, t, i18n.language]);

  const send = (raw: string) => {
    const value = raw.trim();
    if (!value || !thread) return;
    sendMessage(thread.id, value);
    setText('');
  };

  if (missing && (!online || opening === 'error')) {
    const kind = online ? 'error' : 'offline';
    return (
      <View testID="chat-screen" style={{ flex: 1, backgroundColor: colors.background }}>
        <FullScreenState
          kind={kind}
          title={t(`common.states.${kind}Title`)}
          text={t(`common.states.${kind}Text`)}
          retryLabel={t('common.actions.retry')}
          onRetry={() => (online ? void openThread() : retry())}
          secondary={
            kind === 'offline'
              ? {
                  label: t('common.states.offlineSecondary'),
                  onPress: () => router.navigate(routes.trips),
                }
              : undefined
          }
          onBack={back}
          backLabel={t('common.actions.back')}
        />
      </View>
    );
  }

  const quick = isSupport && Boolean(thread) && !rows.some((m) => m.userId === myId);

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
            <Avatar {...personAvatar(name, false, person?.avatarUrl)} size={40} />
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="bodyL" weight={700} numberOfLines={1} testID="chat-name">
              {name}
            </Text>
            {isSupport || person?.username ? (
              <Text
                variant="caption"
                weight={600}
                tone="muted"
                numberOfLines={1}
                style={{ fontSize: 12 }}
              >
                {isSupport ? t('community.chat.supportSub') : `@${person?.username}`}
              </Text>
            ) : null}
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
          data={items}
          keyExtractor={(m) => m.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            if (item.kind === 'day') {
              return (
                <Text
                  variant="caption"
                  weight={600}
                  tone="muted"
                  align="center"
                  style={{ fontSize: 12, paddingVertical: 6 }}
                >
                  {item.label}
                </Text>
              );
            }
            const mine = item.mine;
            return (
              <View
                accessible
                testID={`chat-message-${item.id}`}
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
