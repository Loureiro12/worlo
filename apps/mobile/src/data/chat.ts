import type { ChatThread, Message } from '@worlo/db';
import { supabase } from '@/lib/supabase';
import { getCurrentUserId, repos } from './repositories';
import { useQuery } from './useQuery';

/**
 * Chat (direct + support). Threads, members and messages are synced rows:
 * reading and sending work offline (messages wait in the outbox). Opening a
 * thread that isn't on the device yet is an online RPC; the new thread lands
 * in SQLite with the next sync.
 */

/** Route key of the Worlo support thread (`/chat/support`). */
export const SUPPORT = 'support';

export type { ChatThread, Message } from '@worlo/db';

/**
 * The thread a route key points to: 'support', a thread id or a person id
 * (the direct thread with them).
 */
export function findThread(key: string): ChatThread | undefined {
  if (!key || !getCurrentUserId()) return undefined;
  if (key === SUPPORT) return repos.chat.supportThread();
  return repos.chat.threads().find((t) => t.id === key) ?? repos.chat.threadWith(key);
}

export function useThread(key: string): ChatThread | undefined {
  return useQuery(() => findThread(key), [key]);
}

/** The other person of a direct thread (null for support). */
export function useOtherMember(thread: ChatThread | undefined): string | null {
  return useQuery(
    () => (thread && thread.kind === 'direct' ? repos.chat.otherMember(thread.id) : null),
    [thread?.id, thread?.kind],
  );
}

/** Oldest first. */
export function useMessages(threadId: string | undefined): Message[] {
  return useQuery(() => (threadId ? repos.chat.messages(threadId) : []), [threadId]);
}

export function useUnreadCount(threadId: string | undefined): number {
  return useQuery(() => (threadId ? repos.chat.unreadCount(threadId) : 0), [threadId]);
}

/** Unread messages across all threads (badges). */
export function useTotalUnread(): number {
  return useQuery(
    () =>
      getCurrentUserId()
        ? repos.chat.threads().reduce((n, t) => n + repos.chat.unreadCount(t.id), 0)
        : 0,
    [],
  );
}

/** Works offline: synced when the connection is back. */
export function sendMessage(threadId: string, text: string): Message {
  return repos.chat.send(threadId, text);
}

export function markThreadRead(threadId: string) {
  if (repos.chat.unreadCount(threadId) > 0) repos.chat.markRead(threadId);
}

export type OpenThreadResult = { ok: true; threadId: string } | { ok: false; reason: 'error' };

async function open(
  call: () => PromiseLike<{ data: string | null; error: unknown }>,
): Promise<OpenThreadResult> {
  try {
    const { data, error } = await call();
    return error || !data ? { ok: false, reason: 'error' } : { ok: true, threadId: data };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/** Online: opens (or finds) the 1:1 thread with someone. */
export function openDirectThread(personId: string): Promise<OpenThreadResult> {
  const client = supabase;
  if (!client) return Promise.resolve({ ok: false, reason: 'error' });
  return open(() => client.rpc('open_direct_thread', { p_other: personId }));
}

/** Online: the user's thread with the Worlo team (replies come from the team). */
export function openSupportThread(): Promise<OpenThreadResult> {
  const client = supabase;
  if (!client) return Promise.resolve({ ok: false, reason: 'error' });
  return open(() => client.rpc('open_support_thread'));
}
