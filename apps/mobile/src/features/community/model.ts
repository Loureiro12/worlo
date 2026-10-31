import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { type Catalog, getCatalog } from '@/data/catalog';
import type { CommunityPost, Vote } from '@/data/community';
import { img } from '@/lib/images';
import { avatarFor } from '@/lib/people';
import { POSTS } from '@/mocks/data.generated';
import { demoId } from '@/mocks/demo';
import type { PlaceTip, PostType } from '@/mocks/types';
import { routes } from '@/navigation/routes';

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

/** Prototype key of a demo post ('p1'), else the id: stable testIDs and photo seeds. */
const DEMO_POST_KEYS = new Map(
  [...POSTS.map((p) => p.id), 'ana-28'].map((key) => [demoId(`post:${key}`), key]),
);
export function postKey(id: string): string {
  return DEMO_POST_KEYS.get(id) ?? id;
}

/**
 * Feed photo: the post's first uploaded photo; the prototype's posts keep their
 * seeded placeholder (they had one in the approved visual phase).
 */
export function postPhoto(post: CommunityPost, width: number, height: number): string | null {
  if (post.photo) return post.photo;
  const key = postKey(post.id);
  return POSTS.some((p) => p.id === key) ? img(`post-${key}`, width, height) : null;
}

/** Author → public profile ('me' for own posts). */
export function useOpenAuthor() {
  const router = useRouter();
  return useCallback(
    (post: Pick<CommunityPost, 'mine' | 'authorId'>) =>
      router.push(routes.traveler(post.mine ? 'me' : post.authorId)),
    [router],
  );
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

/** Countries, cities and tours of the catalog, deduped (rebuilt when the catalog changes). */
let placeIndex: { catalog: Catalog; index: PlaceOption[] } | null = null;
function placeIndexOf(catalog: Catalog): PlaceOption[] {
  if (placeIndex?.catalog === catalog) return placeIndex.index;
  const { CITIES, COUNTRIES, PASSEIOS, PLACES } = catalog;
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
  placeIndex = { catalog, index: out };
  return out;
}

export const DEFAULT_PLACE_SUGGESTIONS: PlaceOption[] = [
  { title: 'Lisboa', kind: 'city' },
  { title: 'Kyoto', kind: 'city' },
  { title: 'Florianópolis', kind: 'city' },
];

/** Every word must match (accent-insensitive), max 5. Empty query → defaults. */
export function searchPlaces(query: string): PlaceOption[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return DEFAULT_PLACE_SUGGESTIONS;
  return placeIndexOf(getCatalog())
    .filter((p) => {
      const title = normalize(p.title);
      return words.every((w) => title.includes(w));
    })
    .slice(0, 5);
}

/** Avatar props keeping the real name for screen readers (the user is coral). */
export function personAvatar(name: string, isMe = false, photoUrl?: string | null) {
  return { ...avatarFor(isMe ? 'me' : name, photoUrl), name };
}

/** Feed post → the place/city tip card ('' pct = no votes yet). */
export function toPlaceTip(post: CommunityPost): PlaceTip {
  const stats = postStats(post, post.myVote);
  return {
    who: post.author,
    ini: post.ini,
    when: post.when,
    text: post.text,
    pct: stats.total ? `${stats.pct}%` : '',
  };
}
