/**
 * Test double of `@/data/communityApi` (Jest only): the community RPCs and
 * writes answered from `demoWorld()`, so component tests see what the seeded
 * Supabase serves. Follows come from the device (SQLite), like after a sync.
 *
 *   jest.mock('@/data/communityApi', () => require('@/features/community/testServer').mockModule());
 *   beforeEach(() => resetCommunityServer());
 */
import type {
  CommentRow,
  FeedArgs,
  FeedRow,
  NewPost,
  PersonRow,
  PostRow,
  ServerVote,
  TravelerProfileRow,
} from '@/data/communityApi';
import { repos } from '@/data/repositories';
import { DEMO_USER } from '@/mocks/demo';
import { Ago, demoWorld } from '@/mocks/demoWorld';

type Row = Record<string, unknown> & { id: string };
type Vote = { post_id: string; user_id: string; value: ServerVote };

class OfflineError extends Error {
  constructor() {
    super('offline');
    this.name = 'OfflineError';
  }
}

const iso = (v: unknown) => (v instanceof Ago ? v.toISOString() : String(v));
const withIsoTimes = (rows: Row[] = []): Row[] =>
  rows.map((r) => ({
    ...r,
    ...(r.created_at !== undefined && { created_at: iso(r.created_at) }),
    ...(r.updated_at !== undefined && { updated_at: iso(r.updated_at) }),
  }));

function freshState() {
  const world = demoWorld();
  return {
    me: DEMO_USER.id,
    online: true,
    /** Calls that fail with a server error ('vote', 'comment', 'publish', 'feed'…). */
    fail: new Set<string>(),
    posts: withIsoTimes(world.posts),
    comments: withIsoTimes(world.comments),
    votes: (world.post_votes ?? []) as unknown as Vote[],
    people: withIsoTimes(world.people),
    profiles: withIsoTimes(world.profiles),
    visited: withIsoTimes(world.visited_countries),
    trips: withIsoTimes(world.trips),
    follows: withIsoTimes(world.follows),
    uploads: [] as string[],
    published: [] as NewPost[],
  };
}

export let communityServer = freshState();

export function resetCommunityServer() {
  communityServer = freshState();
}

function guard(name: string) {
  if (!communityServer.online) throw new OfflineError();
  if (communityServer.fail.has(name)) throw new Error(`server error: ${name}`);
}

/** Who I follow: the device's follows (what the server has after a push). */
const myFollowees = () => new Set(repos.follows.following());
const followsMe = (author: string) =>
  communityServer.follows.some(
    (f) => f.user_id === author && f.followee_id === communityServer.me && !f.deleted_at,
  );

function visible(p: Row) {
  return (
    !p.deleted_at &&
    (p.user_id === communityServer.me ||
      p.visibility === 'public' ||
      followsMe(p.user_id as string))
  );
}

function feedRow(p: Row): FeedRow {
  const { me, votes, comments, people } = communityServer;
  const author = people.find((x) => x.id === p.user_id) ?? ({} as Partial<Row>);
  const mine = votes.find((v) => v.post_id === p.id && v.user_id === me);
  return {
    id: p.id,
    author_id: p.user_id as string,
    author_name: (author.name as string) ?? '',
    author_username: (author.username as string) ?? '',
    author_avatar: (author.avatar_url as string | null) ?? null,
    author_expert_role: (author.expert_role as string | null) ?? null,
    type: p.type as string,
    place_label: p.place_label as string,
    place_ref: null,
    title: (p.title as string | null) ?? null,
    text: p.text as string,
    rating: (p.rating as number | null) ?? null,
    photo_paths: (p.photo_paths as string[]) ?? [],
    trip_id: (p.trip_id as string | null) ?? null,
    visibility: p.visibility as string,
    created_at: p.created_at as string,
    yes: votes.filter((v) => v.post_id === p.id && v.value === 'yes').length,
    no: votes.filter((v) => v.post_id === p.id && v.value === 'no').length,
    my_vote: mine?.value ?? null,
    comments: comments.filter((c) => c.post_id === p.id && !c.deleted_at).length,
  };
}

export const fakeCommunityApi = {
  isOnline: () => communityServer.online,

  async feed({ segment = 'foryou', place, author, before, limit = 30 }: FeedArgs = {}) {
    guard('feed');
    const followees = segment === 'following' ? myFollowees() : null;
    return communityServer.posts
      .filter(visible)
      .filter((p) => !place || (p.place_label as string).toLowerCase() === place.toLowerCase())
      .filter((p) => !author || p.user_id === author)
      .filter((p) => !before || (p.created_at as string) < before)
      .filter((p) => !followees || followees.has(p.user_id as string))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, limit)
      .map(feedRow);
  },

  async post(id: string) {
    guard('post');
    const p = communityServer.posts.find((x) => x.id === id);
    return p && visible(p) ? feedRow(p) : null;
  },

  async comments(postId: string): Promise<CommentRow[]> {
    guard('comments');
    return communityServer.comments
      .filter((c) => c.post_id === postId && !c.deleted_at)
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .map((c) => {
        const person =
          communityServer.people.find((x) => x.id === c.user_id) ?? ({} as Partial<Row>);
        return {
          id: c.id,
          author_id: c.user_id as string,
          author_name: (person.name as string) ?? '',
          author_username: (person.username as string) ?? '',
          author_avatar: (person.avatar_url as string | null) ?? null,
          text: c.text as string,
          created_at: c.created_at as string,
        };
      });
  },

  async traveler(userId: string): Promise<TravelerProfileRow | null> {
    guard('traveler');
    const { me, profiles, people, visited, trips, follows } = communityServer;
    const prof = profiles.find((p) => p.id === userId && !p.deleted_at);
    const person = people.find((p) => p.id === userId);
    if (!prof || !person) return null;
    const detail = (prof.privacy_detail ?? {}) as Record<string, boolean>;
    const audience =
      userId === me ||
      prof.privacy === 'public' ||
      (prof.privacy === 'friends' && followsMe(userId));
    const alive = (f: Row) => !f.deleted_at;
    return {
      id: userId,
      name: person.name as string,
      username: person.username as string,
      city: person.city as string,
      bio: person.bio as string,
      avatarUrl: (person.avatar_url as string | null) ?? null,
      expertRole: (person.expert_role as string | null) ?? null,
      expertArea: (person.expert_area as string | null) ?? null,
      followers: follows.filter((f) => alive(f) && f.followee_id === userId).length,
      following: follows.filter((f) => alive(f) && f.user_id === userId).length,
      followedByMe: myFollowees().has(userId),
      restricted: !audience,
      countries:
        audience && detail.map !== false
          ? [
              ...new Set(
                visited.filter((v) => v.user_id === userId).map((v) => v.country_iso as string),
              ),
            ]
          : [],
      trips:
        audience && detail.trips !== false
          ? trips
              .filter((t) => t.user_id === userId && !t.deleted_at)
              .map((t) => ({
                id: t.id,
                title: t.title as string,
                flag: t.flag as string,
                place: t.place as string,
                year: t.year as string,
              }))
          : [],
    };
  },

  async searchPeople(query: string): Promise<PersonRow[]> {
    guard('searchPeople');
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return communityServer.people
      .filter((p) => p.id !== communityServer.me && !p.deleted_at)
      .filter(
        (p) =>
          String(p.name).toLowerCase().includes(q) || String(p.username).toLowerCase().includes(q),
      )
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      .map((p) => p as unknown as PersonRow);
  },

  async publish(post: NewPost): Promise<PostRow> {
    guard('publish');
    communityServer.published.push(post);
    const now = new Date().toISOString();
    const row: PostRow = {
      id: post.id,
      user_id: communityServer.me,
      type: post.type,
      place_label: post.placeLabel,
      place_ref: null,
      title: null,
      text: post.text,
      rating: post.rating,
      photo_paths: post.photoPaths,
      trip_id: post.tripId,
      visibility: post.visibility,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    communityServer.posts.push(row as unknown as Row);
    return row;
  },

  async vote(postId: string, value: ServerVote | null) {
    guard('vote');
    const { me } = communityServer;
    communityServer.votes = communityServer.votes.filter(
      (v) => !(v.post_id === postId && v.user_id === me),
    );
    if (value) communityServer.votes.push({ post_id: postId, user_id: me, value });
  },

  async comment(postId: string, text: string): Promise<CommentRow> {
    guard('comment');
    const now = new Date().toISOString();
    const id = `c-${communityServer.comments.length + 1}`;
    communityServer.comments.push({
      id,
      post_id: postId,
      user_id: communityServer.me,
      text,
      created_at: now,
      deleted_at: null,
    });
    return {
      id,
      author_id: communityServer.me,
      author_name: '',
      author_username: '',
      author_avatar: null,
      text,
      created_at: now,
    };
  },

  async uploadPhoto(uri: string) {
    guard('uploadPhoto');
    const path = `${communityServer.me}/photo-${communityServer.uploads.length + 1}.jpg`;
    communityServer.uploads.push(uri);
    return path;
  },

  photoUrl: (path: string) => `https://storage.test/post-photos/${path}`,
};

/** Module replacement for `jest.mock('@/data/communityApi', …)`. */
export function mockModule() {
  return {
    communityApi: fakeCommunityApi,
    OfflineError,
    isOfflineError: (e: unknown) => e instanceof Error && e.name === 'OfflineError',
    POST_PHOTOS_BUCKET: 'post-photos',
  };
}
