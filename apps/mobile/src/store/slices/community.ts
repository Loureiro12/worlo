import type { Comment, Post } from '@/mocks/types';
import type { Slice } from '../types';

export type Vote = 'yes' | 'no';
export type Visibility = 'public' | 'friends';

/** A post published from the app (Compose). Mock posts never set `mine`. */
export type CommunityPost = Post & {
  mine?: boolean;
  /** Cover photo (first of `photos`). */
  photo?: string | null;
  photos?: string[];
  tripId?: string | null;
  visibility?: Visibility;
};

/** `from` is 'me' or 'them' (the other side of the thread). */
export type ChatMessage = { id: string; from: 'me' | 'them'; text: string; time: string };

export type CommunitySlice = {
  votes: Record<string, Vote | undefined>;
  myPosts: CommunityPost[];
  comments: Record<string, Comment[]>;
  /** Traveler names and expert ids the user follows. */
  following: Record<string, boolean>;
  /** Messages sent in the app, per thread ('support' or a person's name). */
  chats: Record<string, ChatMessage[]>;
  /** One vote per user; voting the same value again removes it. */
  vote: (postId: string, value: Vote) => void;
  publish: (post: CommunityPost) => void;
  addComment: (postId: string, comment: Comment) => void;
  toggleFollow: (personId: string) => void;
  sendMessage: (chatId: string, message: ChatMessage) => void;
};

export const createCommunitySlice: Slice<CommunitySlice> = (set) => ({
  votes: {},
  myPosts: [],
  comments: {},
  following: {},
  chats: {},
  vote: (postId, value) =>
    set((s) => ({
      votes: { ...s.votes, [postId]: s.votes[postId] === value ? undefined : value },
    })),
  publish: (post) => set((s) => ({ myPosts: [{ ...post, mine: true }, ...s.myPosts] })),
  addComment: (postId, comment) =>
    set((s) => ({
      comments: { ...s.comments, [postId]: [...(s.comments[postId] ?? []), comment] },
    })),
  toggleFollow: (personId) =>
    set((s) => ({ following: { ...s.following, [personId]: !s.following[personId] } })),
  sendMessage: (chatId, message) =>
    set((s) => ({ chats: { ...s.chats, [chatId]: [...(s.chats[chatId] ?? []), message] } })),
});
