import { useTranslation } from '@worlo/i18n';
import { useToast } from '@worlo/ui';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { img } from '@/lib/images';
import { avatarFor } from '@/lib/people';
import { CITIES, COUNTRIES, PASSEIOS, PLACES, POSTS, TRAVELERS } from '@/mocks/data.generated';
import type { PostType } from '@/mocks/types';
import { routes } from '@/navigation/routes';
import { useStore } from '@/store';
import type { CommunityPost, Vote } from '@/store/slices/community';

export type TypeKey = 'tip' | 'review' | 'itinerary' | 'question';

/** Post types are stored in pt-BR (mock data contract); UI copy comes from i18n. */
export const TYPE_KEYS: Record<PostType, TypeKey> = {
  Dica: 'tip',
  Avaliação: 'review',
  Roteiro: 'itinerary',
  Pergunta: 'question',
};

export const POST_TYPES: readonly PostType[] = ['Dica', 'Avaliação', 'Roteiro', 'Pergunta'];

export type ReliabilityLevel = 'high' | 'checking' | 'waiting';

export type PostStats = {
  yes: number;
  no: number;
  total: number;
  /** 0–100, rounded. */
  pct: number;
  level: ReliabilityLevel;
};

/**
 * 04_INTERACTIONS → Confiabilidade: % = sim/(sim+não); ≥90% with votes is
 * "Alta confiabilidade"; 0 votes is "Aguardando confirmações". Counts include
 * the user's own vote.
 */
export function postStats(post: Pick<CommunityPost, 'yes' | 'no'>, vote?: Vote): PostStats {
  const yes = post.yes + (vote === 'yes' ? 1 : 0);
  const no = post.no + (vote === 'no' ? 1 : 0);
  const total = yes + no;
  const pct = total ? Math.round((yes / total) * 100) : 0;
  const level: ReliabilityLevel = !total ? 'waiting' : pct >= 90 ? 'high' : 'checking';
  return { yes, no, total, pct, level };
}

/** Feed photo: mock posts get a seeded placeholder; own posts show their first photo. */
export function postPhoto(post: CommunityPost, width: number, height: number): string | null {
  if (post.mine) return post.photo ?? null;
  return img(`post-${post.id}`, width, height);
}

/** My posts (newest first) on top of the mock feed. */
export function useAllPosts(): CommunityPost[] {
  const myPosts = useStore((s) => s.myPosts);
  return useMemo(() => [...myPosts, ...POSTS], [myPosts]);
}

/** Vote handler with the own-post rule (toast instead of voting). */
export function useVoteAction() {
  const vote = useStore((s) => s.vote);
  const toast = useToast();
  const { t } = useTranslation();
  return useCallback(
    (post: CommunityPost, value: Vote) => {
      if (post.mine) {
        toast.show(t('community.vote.ownBlocked'), 'info');
        return;
      }
      vote(post.id, value);
    },
    [vote, toast, t],
  );
}

/** Author → public profile ('me' for own posts; only known travelers have one). */
export function useOpenAuthor() {
  const router = useRouter();
  return useCallback(
    (post: CommunityPost) => {
      if (post.mine) router.push(routes.traveler('me'));
      else if (TRAVELERS[post.author]) router.push(routes.traveler(post.author));
    },
    [router],
  );
}

export function hasProfile(post: CommunityPost): boolean {
  return Boolean(post.mine || TRAVELERS[post.author]);
}

export function useGoBack(fallback = routes.community) {
  const router = useRouter();
  return useCallback(
    () => (router.canGoBack() ? router.back() : router.navigate(fallback)),
    [router, fallback],
  );
}

/** "14:05" */
export function clockTime(date = new Date()): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/* ───────────── Place search (Compose → Onde) ───────────── */

export type PlaceKind = 'country' | 'city' | 'place' | 'tour';
export type PlaceOption = { title: string; kind: PlaceKind };

export function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

const PLACE_INDEX: PlaceOption[] = (() => {
  const seen = new Set<string>();
  const out: PlaceOption[] = [];
  const add = (title: string, kind: PlaceKind) => {
    const key = normalize(title);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ title, kind });
  };
  for (const c of Object.values(COUNTRIES)) add(c.name, 'country');
  for (const c of CITIES) add(c.n, 'city');
  for (const p of PLACES) add(p.short, 'city');
  for (const p of PASSEIOS) add(p.name, 'tour');
  return out;
})();

export const DEFAULT_PLACE_SUGGESTIONS: PlaceOption[] = [
  { title: 'Lisboa', kind: 'city' },
  { title: 'Kyoto', kind: 'city' },
  { title: 'Florianópolis', kind: 'city' },
];

/** Every word must match (accent-insensitive), max 5. Empty query → defaults. */
export function searchPlaces(query: string): PlaceOption[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return DEFAULT_PLACE_SUGGESTIONS;
  return PLACE_INDEX.filter((p) => {
    const title = normalize(p.title);
    return words.every((w) => title.includes(w));
  }).slice(0, 5);
}

/** Avatar props keeping the real name for screen readers (the user is coral). */
export function personAvatar(name: string, isMe = false, photoUrl?: string | null) {
  return { ...avatarFor(isMe ? 'me' : name, photoUrl), name };
}
