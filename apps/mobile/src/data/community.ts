import {
  type InfiniteData,
  type QueryClient,
  type QueryKey,
  useInfiniteQuery,
  useQuery as useOnlineQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useTranslation } from '@worlo/i18n';
import { initialsOf, palette, useToast } from '@worlo/ui';
import { randomUUID } from 'expo-crypto';
import { useCallback, useEffect, useState } from 'react';
import type { Comment, Post, PostType } from '@/mocks/types';
import {
  type CommentRow,
  communityApi,
  type FeedArgs,
  type FeedRow,
  isOfflineError,
  type PersonRow,
  type ServerPostType,
  type TravelerProfileRow,
} from './communityApi';
import { useMe } from './profile';
import { getCurrentUserId } from './repositories';

/**
 * Community (online only, React Query): feed, posts, comments, votes, public
 * traveler pages and people search. Server rows (`./communityApi`) are cached
 * as they come and mapped to the view types below with `select`, so optimistic
 * updates only touch raw rows. Synced people/follows live in `@/data/people`.
 */

export type { TravelerProfileRow } from './communityApi';
export { isOfflineError, OfflineError } from './communityApi';

export type Vote = 'yes' | 'no';
export type Visibility = 'public' | 'friends';

/** A feed post. `yes`/`no` exclude my vote (`myVote`): `postStats` adds it back. */
export type CommunityPost = Post & {
  authorId: string;
  mine: boolean;
  myVote?: Vote;
  avatarUrl: string | null;
  expertRole: string | null;
  title: string | null;
  /** Cover photo (first of `photos`), public URL. */
  photo: string | null;
  photos: string[];
  tripId: string | null;
  visibility: Visibility;
  comments: number;
  createdAt: string;
};

export type PostComment = Comment & {
  id: string;
  authorId: string;
  avatarUrl: string | null;
  mine: boolean;
};

export type PeopleResult = {
  id: string;
  name: string;
  username: string;
  city: string;
  avatarUrl: string | null;
  expertRole: string | null;
};

/* ───────────── Mapping (pure) ───────────── */

export const POST_TYPE_OF: Record<ServerPostType, PostType> = {
  tip: 'Dica',
  review: 'Avaliação',
  itinerary: 'Roteiro',
  question: 'Pergunta',
};

export const SERVER_TYPE_OF: Record<PostType, ServerPostType> = {
  Dica: 'tip',
  Avaliação: 'review',
  Roteiro: 'itinerary',
  Pergunta: 'question',
};

type TimeKey =
  | 'community.time.now'
  | 'community.time.minutes'
  | 'community.time.hours'
  | 'community.time.days'
  | 'community.time.weeks'
  | 'community.time.months'
  | 'community.time.years';
export type TimeLabel = (key: TimeKey, options?: { count: number }) => string;

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** "agora", "há 20 min", "há 3 h", "há 2 dias", "há 1 semana", "há 3 meses", "há 1 ano". */
export function relativeTime(iso: string, t: TimeLabel, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  if (diff < MIN) return t('community.time.now');
  if (diff < HOUR) return t('community.time.minutes', { count: Math.floor(diff / MIN) });
  if (diff < DAY) return t('community.time.hours', { count: Math.floor(diff / HOUR) });
  const days = Math.floor(diff / DAY);
  if (days < 7) return t('community.time.days', { count: days });
  if (days < 30) return t('community.time.weeks', { count: Math.floor(days / 7) });
  if (days < 365) return t('community.time.months', { count: Math.floor(days / 30) });
  return t('community.time.years', { count: Math.floor(days / 365) });
}

const TINTS = [palette.coral100, palette.linha, palette.coral300];
const tintOf = (id: string) =>
  TINTS[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % TINTS.length] ?? palette.linha;

const asVote = (v: string | null | undefined): Vote | undefined =>
  v === 'yes' || v === 'no' ? v : undefined;

const pathsOf = (json: unknown): string[] =>
  Array.isArray(json) ? json.filter((p): p is string => typeof p === 'string') : [];

export type MapContext = { meId: string | null; t: TimeLabel; now?: number };

export function toPost(row: FeedRow, { meId, t, now }: MapContext): CommunityPost {
  const myVote = asVote(row.my_vote);
  const photos = pathsOf(row.photo_paths).map(communityApi.photoUrl).filter(Boolean);
  const name = row.author_name || row.author_username;
  return {
    id: row.id,
    authorId: row.author_id,
    author: name,
    ini: initialsOf(name),
    avatarUrl: row.author_avatar,
    expertRole: row.author_expert_role,
    where: row.place_label,
    when: relativeTime(row.created_at, t, now),
    createdAt: row.created_at,
    type: POST_TYPE_OF[row.type as ServerPostType] ?? 'Dica',
    title: row.title,
    text: row.text,
    rating: row.rating ?? undefined,
    yes: row.yes - (myVote === 'yes' ? 1 : 0),
    no: row.no - (myVote === 'no' ? 1 : 0),
    myVote,
    mine: meId !== null && row.author_id === meId,
    tint: tintOf(row.id),
    photo: photos[0] ?? null,
    photos,
    tripId: row.trip_id,
    visibility: row.visibility === 'friends' ? 'friends' : 'public',
    comments: row.comments,
  };
}

export function toComment(row: CommentRow, { meId, t, now }: MapContext): PostComment {
  const name = row.author_name || row.author_username;
  return {
    id: row.id,
    authorId: row.author_id,
    who: name,
    ini: initialsOf(name),
    avatarUrl: row.author_avatar,
    when: relativeTime(row.created_at, t, now),
    text: row.text,
    mine: meId !== null && row.author_id === meId,
  };
}

export function toPeopleResult(row: PersonRow): PeopleResult {
  return {
    id: row.id,
    name: row.name || row.username,
    username: row.username,
    city: row.city,
    avatarUrl: row.avatar_url,
    expertRole: row.expert_role,
  };
}

/** Applies my vote change to a server row (counts include my vote there). */
export function applyVote(row: FeedRow, next: Vote | null): FeedRow {
  const prev = asVote(row.my_vote);
  return {
    ...row,
    yes: row.yes - (prev === 'yes' ? 1 : 0) + (next === 'yes' ? 1 : 0),
    no: row.no - (prev === 'no' ? 1 : 0) + (next === 'no' ? 1 : 0),
    my_vote: next,
  };
}

/* ───────────── Queries ───────────── */

export const communityKeys = {
  all: ['community'] as const,
  feeds: ['community', 'feed'] as const,
  feed: (args: FeedArgs) => ['community', 'feed', args] as const,
  /** Under `feed(args)`, so invalidating that prefix refreshes the pages too. */
  feedPages: (args: FeedArgs) => ['community', 'feed', args, 'pages'] as const,
  post: (id: string) => ['community', 'post', id] as const,
  comments: (postId: string) => ['community', 'comments', postId] as const,
  traveler: (id: string) => ['community', 'traveler', id] as const,
  people: (query: string) => ['community', 'people', query] as const,
};

/** Offline is not worth retrying (the query resumes on reconnect); server errors twice. */
const retry = (count: number, error: unknown) => !isOfflineError(error) && count < 2;

function useMapContext(): MapContext {
  const { t } = useTranslation();
  return { meId: getCurrentUserId(), t: t as TimeLabel };
}

/** Feed: segment ('foryou' | 'following'), place tips (`place`) or one author's posts. */
export function useFeed(args: FeedArgs, { enabled = true }: { enabled?: boolean } = {}) {
  const ctx = useMapContext();
  const { meId, t } = ctx;
  const select = useCallback(
    (rows: FeedRow[]) => rows.map((r) => toPost(r, { meId, t })),
    [meId, t],
  );
  return useOnlineQuery({
    queryKey: communityKeys.feed(args),
    queryFn: () => communityApi.feed(args),
    retry,
    select,
    enabled,
  });
}

export const FEED_PAGE_SIZE = 20;

/** A feed that grows page by page ("Carregar mais"), newest first. */
export function useFeedPages(args: FeedArgs, { enabled = true }: { enabled?: boolean } = {}) {
  const { meId, t } = useMapContext();
  const select = useCallback(
    (data: FeedPages) => data.pages.flat().map((r) => toPost(r, { meId, t })),
    [meId, t],
  );
  return useInfiniteQuery({
    queryKey: communityKeys.feedPages(args),
    queryFn: ({ pageParam }) =>
      communityApi.feed({ ...args, limit: FEED_PAGE_SIZE, before: pageParam }),
    initialPageParam: undefined as string | undefined,
    // A short page is the last one; the cursor is the oldest post seen.
    getNextPageParam: (last) =>
      last.length < FEED_PAGE_SIZE ? undefined : last[last.length - 1]?.created_at,
    retry,
    select,
    enabled,
  });
}

/** Posts about a place (Lugar / Cidade tips). */
export function usePlacePosts(place: string | undefined) {
  return useFeed({ place }, { enabled: Boolean(place) });
}

/** A traveler's latest posts (especialistas); their whole page uses `useFeedPages`. */
export function useAuthorPosts(authorId: string | null | undefined, limit?: number) {
  return useFeed(
    { author: authorId ?? undefined, ...(limit ? { limit } : {}) },
    { enabled: Boolean(authorId) },
  );
}

/** Cached feeds are plain lists (`useFeed`) or pages (`useFeedPages`). */
type FeedPages = InfiniteData<FeedRow[], string | undefined>;
type FeedCache = FeedRow[] | FeedPages;

const feedRows = (cache: FeedCache | undefined): FeedRow[] =>
  !cache ? [] : Array.isArray(cache) ? cache : cache.pages.flat();

/** Feed rows already cached (opening a post from a list shows it instantly). */
function cachedPost(client: QueryClient, id: string) {
  for (const [key, cache] of client.getQueriesData<FeedCache>({ queryKey: communityKeys.feeds })) {
    const row = feedRows(cache).find((r) => r.id === id);
    if (row) return { row, updatedAt: client.getQueryState(key)?.dataUpdatedAt };
  }
  return undefined;
}

export function usePost(id: string | undefined) {
  const client = useQueryClient();
  const { meId, t } = useMapContext();
  const select = useCallback(
    (row: FeedRow | null) => (row ? toPost(row, { meId, t }) : null),
    [meId, t],
  );
  const cached = id ? cachedPost(client, id) : undefined;
  return useOnlineQuery({
    queryKey: communityKeys.post(id ?? ''),
    queryFn: () => communityApi.post(id ?? ''),
    retry,
    select,
    enabled: Boolean(id),
    initialData: cached?.row,
    initialDataUpdatedAt: cached?.updatedAt,
  });
}

export function useComments(postId: string | undefined) {
  const { meId, t } = useMapContext();
  const select = useCallback(
    (rows: CommentRow[]) => rows.map((r) => toComment(r, { meId, t })),
    [meId, t],
  );
  return useOnlineQuery({
    queryKey: communityKeys.comments(postId ?? ''),
    queryFn: () => communityApi.comments(postId ?? ''),
    retry,
    select,
    enabled: Boolean(postId),
  });
}

export function useTravelerProfile(userId: string | undefined) {
  return useOnlineQuery<TravelerProfileRow | null>({
    queryKey: communityKeys.traveler(userId ?? ''),
    queryFn: () => communityApi.traveler(userId ?? ''),
    retry,
    enabled: Boolean(userId),
  });
}

export const PEOPLE_SEARCH_MIN = 2;
export const PEOPLE_SEARCH_DEBOUNCE_MS = 300;

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

const toPeople = (rows: PersonRow[]) => rows.map(toPeopleResult);

/** People search on the server (debounced, ≥ 2 chars). Empty while offline. */
export function useSearchPeople(query: string): PeopleResult[] {
  const q = useDebounced(query.trim(), PEOPLE_SEARCH_DEBOUNCE_MS);
  const { data } = useOnlineQuery({
    queryKey: communityKeys.people(q.toLowerCase()),
    queryFn: () => communityApi.searchPeople(q),
    select: toPeople,
    enabled: q.length >= PEOPLE_SEARCH_MIN,
    retry: false,
  });
  return q.length >= PEOPLE_SEARCH_MIN && data ? data : NO_PEOPLE;
}
const NO_PEOPLE: PeopleResult[] = [];

/* ───────────── Writes ───────────── */

type Snapshot = [QueryKey, unknown][];

/** Stops in-flight refetches (they would overwrite the optimistic rows) and saves the cache. */
function snapshot(client: QueryClient, keys: QueryKey[]): Snapshot {
  for (const queryKey of keys) void client.cancelQueries({ queryKey });
  return keys.flatMap((queryKey) => client.getQueriesData({ queryKey }));
}

function restore(client: QueryClient, snap: Snapshot) {
  for (const [key, data] of snap) client.setQueryData(key, data);
}

function updatePostRows(client: QueryClient, id: string, fn: (row: FeedRow) => FeedRow) {
  const update = (rows: FeedRow[]) => rows.map((r) => (r.id === id ? fn(r) : r));
  client.setQueriesData<FeedCache>({ queryKey: communityKeys.feeds }, (cache) => {
    if (!cache) return cache;
    return Array.isArray(cache) ? update(cache) : { ...cache, pages: cache.pages.map(update) };
  });
  client.setQueryData<FeedRow | null>(communityKeys.post(id), (row) => (row ? fn(row) : row));
}

/** Toast for a failed online write (offline copy when there is no connection). */
function useWriteError() {
  const toast = useToast();
  const { t } = useTranslation();
  return useCallback(
    (error?: unknown) =>
      toast.show(
        error === undefined || isOfflineError(error)
          ? t('common.states.offlineTitle')
          : t('community.errors.failed'),
        'info',
      ),
    [toast, t],
  );
}

/**
 * "Está correto / Está errado": one vote per person, the same value again
 * removes it. Optimistic; rolls back with a toast on error. Own posts can't be
 * voted (toast).
 */
export function useVote() {
  const client = useQueryClient();
  const toast = useToast();
  const { t } = useTranslation();
  const fail = useWriteError();
  return useCallback(
    async (post: CommunityPost, value: Vote) => {
      if (post.mine) {
        toast.show(t('community.vote.ownBlocked'), 'info');
        return;
      }
      if (!communityApi.isOnline()) return fail();
      const next = post.myVote === value ? null : value;
      const snap = snapshot(client, [communityKeys.feeds, communityKeys.post(post.id)]);
      updatePostRows(client, post.id, (row) => applyVote(row, next));
      try {
        await communityApi.vote(post.id, next);
        // The cache already shows the vote: just mark it stale for the next visit.
        void client.invalidateQueries({ queryKey: communityKeys.all, refetchType: 'none' });
      } catch (error) {
        restore(client, snap);
        fail(error);
      }
    },
    [client, toast, t, fail],
  );
}

/** Adds a comment (optimistic, at the end of the thread). Resolves false on error. */
export function useAddComment() {
  const client = useQueryClient();
  const me = useMe();
  const fail = useWriteError();
  return useCallback(
    async (postId: string, text: string): Promise<boolean> => {
      const value = text.trim();
      if (!value) return false;
      if (!communityApi.isOnline()) {
        fail();
        return false;
      }
      const key = communityKeys.comments(postId);
      const snap = snapshot(client, [key, communityKeys.feeds, communityKeys.post(postId)]);
      const temp: CommentRow = {
        id: `pending-${randomUUID()}`,
        author_id: getCurrentUserId() ?? '',
        author_name: me.name,
        author_username: me.user,
        author_avatar: me.avatar ?? null,
        text: value,
        created_at: new Date().toISOString(),
      };
      client.setQueryData<CommentRow[]>(key, (rows) => [...(rows ?? []), temp]);
      updatePostRows(client, postId, (row) => ({ ...row, comments: row.comments + 1 }));
      try {
        const saved = await communityApi.comment(postId, value);
        client.setQueryData<CommentRow[]>(key, (rows) =>
          rows?.map((r) => (r.id === temp.id ? { ...temp, ...saved, author_name: me.name } : r)),
        );
        void client.invalidateQueries({ queryKey: key });
        return true;
      } catch (error) {
        restore(client, snap);
        fail(error);
        return false;
      }
    },
    [client, me, fail],
  );
}

export type PublishInput = {
  type: PostType;
  place: string;
  text: string;
  rating?: number;
  /** Local file URIs picked in Compose (uploaded first). */
  photos: { uri: string; mimeType?: string | null }[];
  tripId: string | null;
  visibility: Visibility;
};

/**
 * Publishes a post: uploads the photos to `post-photos`, inserts the row, caches
 * it for the post screen and refreshes the feeds. Resolves the new id, or null
 * (toast shown) when offline or on error.
 */
export function usePublishPost() {
  const client = useQueryClient();
  const me = useMe();
  const fail = useWriteError();
  return useCallback(
    async (input: PublishInput): Promise<string | null> => {
      if (!communityApi.isOnline()) {
        fail();
        return null;
      }
      try {
        const photoPaths: string[] = [];
        for (const p of input.photos) {
          photoPaths.push(await communityApi.uploadPhoto(p.uri, p.mimeType ?? undefined));
        }
        const row = await communityApi.publish({
          id: randomUUID(),
          type: SERVER_TYPE_OF[input.type],
          placeLabel: input.place,
          text: input.text.trim(),
          rating: input.type === 'Avaliação' ? (input.rating ?? null) : null,
          photoPaths,
          tripId: input.tripId,
          visibility: input.visibility,
        });
        const feedRow: FeedRow = {
          id: row.id,
          author_id: row.user_id,
          author_name: me.name,
          author_username: me.user,
          author_avatar: me.avatar ?? null,
          author_expert_role: null,
          type: row.type,
          place_label: row.place_label,
          place_ref: row.place_ref,
          title: row.title,
          text: row.text,
          rating: row.rating,
          photo_paths: row.photo_paths,
          trip_id: row.trip_id,
          visibility: row.visibility,
          created_at: row.created_at,
          yes: 0,
          no: 0,
          my_vote: null,
          comments: 0,
        };
        client.setQueryData(communityKeys.post(row.id), feedRow);
        void client.invalidateQueries({ queryKey: communityKeys.feeds });
        return row.id;
      } catch (error) {
        fail(error);
        return null;
      }
    },
    [client, me, fail],
  );
}

/** After a follow/unfollow: the following feed and traveler counts change. */
export function useRefreshAfterFollow() {
  const client = useQueryClient();
  return useCallback(
    (personId: string) => {
      void client.invalidateQueries({ queryKey: communityKeys.feed({ segment: 'following' }) });
      void client.invalidateQueries({ queryKey: communityKeys.traveler(personId) });
    },
    [client],
  );
}
