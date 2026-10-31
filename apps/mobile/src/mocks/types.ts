import type { IconName } from '@worlo/ui';

/**
 * Mock data contracts, ported from design_handoff_worlo_app/prototype.
 * User-generated content (names, places, posts) stays in pt-BR on purpose: it
 * is data, not UI copy, and is not translated.
 */

export type CountryId = string; // ISO 3166-1 numeric, zero padded ("076")

export type Country = {
  name: string;
  flag: string;
  capital: string;
  lang: string;
  cur: string;
  hist?: string;
  best?: string;
};

export type City = { n: string; c: [number, number]; ph?: number };

export type CollaboratorStatus = 'ok' | 'pending';
/**
 * Someone on a trip / wish besides the user. `owner` marks who created a trip
 * the user joined through an invite; `userId` is set for Worlo accounts
 * (memberships), absent for legacy free-text companions.
 */
export type Collaborator = {
  name: string;
  status: CollaboratorStatus;
  owner?: boolean;
  userId?: string;
};

export type Trip = {
  id: string;
  title: string;
  place: string;
  country: string;
  flag: string;
  period: string;
  year: string;
  days: number;
  photos: number;
  places: number;
  collab: Collaborator[];
  people: string;
  total: string;
  tint: string;
};

export type Friend = { name: string; ini: string; handle: string };

export type Activity = { who: string; text: string; when: string };

export type Invite = {
  id: string;
  kind: 'past' | 'future';
  from: string;
  title: string;
  place: string;
  country?: string;
  flag: string;
  period: string;
  year?: string;
  days?: number;
  photos?: number;
  places?: number;
  total?: string;
  others: string[];
  note: string;
};

export type NotificationType =
  | 'invite'
  | 'activity'
  | 'memory'
  | 'accepted'
  | 'pending'
  | 'community'
  | 'reminder'
  | 'follow';

export type Notification = {
  id: string;
  group: 'Hoje' | 'Esta semana';
  type: NotificationType;
  inv?: string;
  who?: string;
  text?: string;
  time: string;
  trip?: string;
  badge?: IconName;
};

export type TimelineItem = {
  time: string;
  icon: IconName;
  title: string;
  note: string;
  extra?: string;
};
export type TripDay = { label: string; items: TimelineItem[] };
export type ExpenseCategory = { name: string; val: number; color: string };
export type ExpenseItem = {
  icon: IconName;
  name: string;
  meta: string;
  val: string;
  receipt?: boolean;
};

export type TripDetails = {
  places: { name: string; cat: string; stars: string }[];
  diary: { text: string; meta: string };
  best: string;
  days?: TripDay[];
  money?: { total: number; cur: string; cats: ExpenseCategory[]; items: ExpenseItem[] };
};

export type Future = {
  id: string;
  cid: CountryId;
  name: string;
  flag: string;
  collab?: Collaborator[];
  note: string;
  saved: string;
  tint: string;
};

export type PlaceToKnow = {
  name: string;
  short: string;
  meta: string;
  cat: 'Cidades' | 'Praias' | 'Trilhas';
  tint: string;
  go?: string;
};

export type Popular = { id: CountryId; flag: string; name: string; meta: string };
export type Experience = { name: string; meta: string; rating: string; tint: string };

export type Fact = { icon: IconName; label: string; value: string; sub?: string; tip?: string };

export type CountryPage = {
  region: string;
  tagline: string;
  facts: Fact[];
  regions: string[];
  cities: { name: string; note: string; tint: string; go?: boolean }[];
  source: string;
};

export type CityTabKey = 'attr' | 'food' | 'shop' | 'move' | 'serv';
export type CityItem = { name: string; meta: string; rating?: string };
export type CityTab = { l: string; i: IconName; items: CityItem[] };

export type PostType = 'Dica' | 'Roteiro' | 'Avaliação' | 'Pergunta';
export type Post = {
  id: string;
  author: string;
  ini: string;
  where: string;
  when: string;
  type: PostType;
  text: string;
  yes: number;
  no: number;
  tint: string;
  rating?: number;
};

export type Stop = {
  time: string;
  icon: IconName;
  title: string;
  note: string;
  cost: number;
  done?: boolean;
};
export type ItineraryDay = { label: string; items: Stop[] };

export type Itinerary = {
  id: string;
  title: string;
  place: string;
  flag: string;
  dates: string;
  status: string;
  sugKey: SuggestionKey;
  days: ItineraryDay[];
};

export type Recommendation = {
  id: string;
  title: string;
  author: string;
  ini: string;
  region: 'Europa' | 'Ásia' | 'América do Sul';
  place: string;
  flag: string;
  saves: string;
  rating: string;
  sugKey: SuggestionKey;
  days: ItineraryDay[];
};

export type SuggestionKey = 'peru' | 'japao' | 'lisboa' | 'generic';
export type Suggestion = { icon: IconName; title: string; note: string; cost: number };

export type Tour = {
  id: string;
  name: string;
  place: string;
  dur: string;
  price: number;
  cur: string;
  rating: string;
  reviews: number;
  cat: 'Barco' | 'Gastronomia' | 'Trilhas' | 'Cultura';
  host: string;
  hostIni: string;
  lang: string;
  group: string;
  desc: string;
  inc: string[];
  meet: string;
  review: { who: string; text: string };
};

export type SavedCategory = 'Atrações' | 'Gastronomia' | 'Passeios' | 'Hospedagem';
export type SavedItem = {
  id: string;
  name: string;
  cat: SavedCategory;
  city: string;
  flag: string;
  meta: string;
  rating: string;
};

export type Collection = { id: string; name: string; ids: string[] };

export type Region = {
  name: string;
  tagline: string;
  facts: Fact[];
  cities: { name: string; note: string; go?: string }[];
  highlights: { name: string; meta: string }[];
};

export type PlaceInfo = { desc: string; rows: [IconName, string, string][] };
export type PlaceTip = { who: string; ini: string; when: string; text: string; pct: string };

export type Traveler = {
  ini: string;
  handle: string;
  city: string;
  bio: string;
  countries: CountryId[];
  cities: number;
  trips: { title: string; flag: string; meta: string }[];
};

export type Comment = { who: string; ini: string; when: string; text: string };

export type Expert = {
  id: string;
  ini: string;
  name: string;
  role: string;
  area: string;
  title: string;
  text: string;
};
