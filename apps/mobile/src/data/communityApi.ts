import { onlineManager } from '@tanstack/react-query';
import type { Database } from '@worlo/supabase';
import { randomUUID } from 'expo-crypto';
import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { getCurrentUserId } from './repositories';

/**
 * Online-only community calls (RPCs, inserts, Storage). Screens never call this
 * module: they use the hooks/actions of `@/data/community`, which map these
 * server rows to view types. Component tests replace this module with the
 * demo-world fake (`features/community/testServer.ts`).
 */

type Fns = Database['public']['Functions'];
type Nullable<T, K extends keyof T> = Omit<T, K> & { [P in K]: T[P] | null };
/** Generated RPC types lose nullability: these columns can be null. */
export type FeedRow = Nullable<
  Fns['community_feed']['Returns'][number],
  'author_avatar' | 'author_expert_role' | 'place_ref' | 'title' | 'rating' | 'trip_id' | 'my_vote'
>;
export type CommentRow = Nullable<Fns['post_comments']['Returns'][number], 'author_avatar'>;
export type PersonRow = Fns['search_people']['Returns'][number];
export type PostRow = Database['public']['Tables']['posts']['Row'];

export type ServerPostType = 'tip' | 'review' | 'itinerary' | 'question';
export type ServerVote = 'yes' | 'no';

/** `traveler_profile(p_user)` JSON (null when the profile is hidden or gone). */
export type TravelerProfileRow = {
  id: string;
  name: string;
  username: string;
  city: string;
  bio: string;
  avatarUrl: string | null;
  expertRole: string | null;
  expertArea: string | null;
  followers: number;
  following: number;
  followedByMe: boolean;
  restricted: boolean;
  countries: string[];
  trips: { id: string; title: string; flag: string; place: string; year: string | number }[];
};

export type FeedArgs = {
  segment?: 'foryou' | 'following';
  place?: string;
  author?: string;
  before?: string;
  limit?: number;
};

export type NewPost = {
  id: string;
  type: ServerPostType;
  placeLabel: string;
  text: string;
  rating: number | null;
  photoPaths: string[];
  tripId: string | null;
  visibility: 'public' | 'friends';
};

/** No backend, no session or no connection: screens show the offline copy. */
export class OfflineError extends Error {
  constructor() {
    super('offline');
    this.name = 'OfflineError';
  }
}

export const isOfflineError = (e: unknown): e is OfflineError =>
  e instanceof OfflineError || (e instanceof Error && e.name === 'OfflineError');

export const POST_PHOTOS_BUCKET = 'post-photos';

function client() {
  if (!supabase || !onlineManager.isOnline()) throw new OfflineError();
  return supabase;
}

function me(): string {
  const id = getCurrentUserId();
  if (!id) throw new OfflineError();
  return id;
}

function check<T>({ data, error }: { data: T; error: unknown }): T {
  if (error) throw error instanceof Error ? error : new Error(String(JSON.stringify(error)));
  return data;
}

/** `.single()` results: data is set whenever there is no error. */
function one<T>(result: { data: T; error: unknown }): NonNullable<T> {
  const data = check(result);
  if (data == null) throw new Error('empty response');
  return data;
}

export const communityApi = {
  /** Checked before optimistic writes, so offline taps don't flash and roll back. */
  isOnline: () => supabase !== null && onlineManager.isOnline(),

  async feed({
    segment = 'foryou',
    place,
    author,
    before,
    limit = 30,
  }: FeedArgs = {}): Promise<FeedRow[]> {
    const args: Fns['community_feed']['Args'] = { p_segment: segment, p_limit: limit };
    if (place) args.p_place = place;
    if (author) args.p_author = author;
    if (before) args.p_before = before;
    return check(await client().rpc('community_feed', args)) ?? [];
  },

  /** One post (deep link to a post that is not in any cached feed). */
  async post(id: string): Promise<FeedRow | null> {
    const db = client();
    const row = check(
      await db.from('posts').select('user_id, created_at').eq('id', id).maybeSingle(),
    );
    if (!row) return null;
    // The feed has no id filter: the author's posts up to this one's timestamp.
    const before = new Date(new Date(row.created_at).getTime() + 1).toISOString();
    const rows = check(
      await db.rpc('community_feed', { p_author: row.user_id, p_before: before, p_limit: 5 }),
    );
    return rows?.find((p) => p.id === id) ?? null;
  },

  async comments(postId: string): Promise<CommentRow[]> {
    return check(await client().rpc('post_comments', { p_post: postId })) ?? [];
  },

  async traveler(userId: string): Promise<TravelerProfileRow | null> {
    const data = check(await client().rpc('traveler_profile', { p_user: userId }));
    return (data as TravelerProfileRow | null) ?? null;
  },

  async searchPeople(query: string): Promise<PersonRow[]> {
    return check(await client().rpc('search_people', { p_query: query })) ?? [];
  },

  async publish(post: NewPost): Promise<PostRow> {
    const row = one(
      await client()
        .from('posts')
        .insert({
          id: post.id,
          user_id: me(),
          type: post.type,
          place_label: post.placeLabel,
          text: post.text,
          rating: post.rating,
          photo_paths: post.photoPaths,
          trip_id: post.tripId,
          visibility: post.visibility,
        })
        .select()
        .single(),
    );
    return row;
  },

  /** Same value again removes the vote (null). */
  async vote(postId: string, value: ServerVote | null): Promise<void> {
    const db = client();
    const userId = me();
    if (value) {
      check(
        await db
          .from('post_votes')
          .upsert({ post_id: postId, user_id: userId, value }, { onConflict: 'post_id,user_id' }),
      );
    } else {
      check(await db.from('post_votes').delete().eq('post_id', postId).eq('user_id', userId));
    }
  },

  async comment(postId: string, text: string): Promise<CommentRow> {
    const row = one(
      await client()
        .from('comments')
        .insert({ id: randomUUID(), post_id: postId, user_id: me(), text })
        .select('id, created_at')
        .single(),
    );
    return {
      id: row.id,
      author_id: me(),
      author_name: '',
      author_username: '',
      author_avatar: null,
      text,
      created_at: row.created_at,
    };
  },

  /** Uploads a picked photo to `post-photos/<me>/<uuid>.jpg` and returns the path. */
  async uploadPhoto(uri: string, mimeType = 'image/jpeg'): Promise<string> {
    const db = client();
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const path = `${me()}/${randomUUID()}.${ext}`;
    const body = await new File(uri).arrayBuffer();
    check(
      await db.storage
        .from(POST_PHOTOS_BUCKET)
        .upload(path, body, { contentType: ext === 'jpg' ? 'image/jpeg' : mimeType }),
    );
    return path;
  },

  /** Public bucket: a plain URL, no signing. */
  photoUrl(path: string): string {
    if (/^(https?|file):/.test(path)) return path;
    if (!supabase) return '';
    return supabase.storage.from(POST_PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;
  },
};

export type CommunityApi = typeof communityApi;
