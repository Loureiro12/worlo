import {
  COMMENTS,
  COUNTRIES,
  EXPERTS,
  FRIENDS,
  FUTURES,
  INVITES,
  NOTIFS,
  PASSEIOS,
  PLACE_INFO,
  PLACE_TIPS,
  POSTS,
  TRAVELERS,
  TRIP_ACTIVITY,
  TRIPS,
} from './data.generated';
import { DEMO_USER, demoData, demoId } from './demo';
import { CHAT_SEEDS } from './demoChat';

/**
 * The demo world: Ana plus the prototype's friends and experts as real
 * accounts, with follows, shared trips, invites, activity, notifications,
 * posts, comments, votes and a chat. Feeds supabase/seeds/demo.sql (every
 * account logs in with DEMO_USER.password) and, filtered to what Ana can
 * see, the SQLite database of component tests.
 *
 * Rows are in the server shape (snake_case) and carry `user_id`.
 * Times relative to "now" are `Ago` values (SQL: now() - interval; tests: ISO),
 * dates relative to today are `Day` values (SQL: current_date + n; tests: YYYY-MM-DD).
 */

export class Ago {
  constructor(readonly minutes: number) {}
  toISOString(now = Date.now()) {
    return new Date(now - this.minutes * 60_000).toISOString();
  }
}
const ago = (minutes: number) => new Ago(minutes);

export class Day {
  constructor(readonly days: number) {}
  /** UTC, like the server's current_date. */
  toISODate(now = Date.now()) {
    return new Date(now + this.days * 24 * 60 * 60_000).toISOString().slice(0, 10);
  }
}

/** Tour dates: the next 6 days, the 3rd one sold out (02_SCREENS → E2). */
export const TOUR_DAYS = 6;
export const TOUR_CAPACITY = 12;
export const SOLD_OUT_DAY = 2;

const H = 60;
const D = 24 * H;
const WEEKDAYS = ['seg', 'dom', 'sáb', 'sex', 'qui'];

/** "há 20 min", "há 2 h", "ontem", "há 1 semana", "seg" → minutes ago. */
export function parseWhen(when: string): number {
  const n = Number(/\d+/.exec(when)?.[0] ?? 1);
  if (when.startsWith('ontem')) return D;
  if (/min/.test(when)) return n;
  // \d first: a bare /\bh\b/ also matches the "h" of "há".
  if (/\d+\s*h\b/.test(when)) return n * H;
  if (/dia/.test(when)) return n * D;
  if (/semana/.test(when)) return n * 7 * D;
  const weekday = WEEKDAYS.indexOf(when);
  if (weekday >= 0) return (3 + weekday) * D;
  return D;
}

type Person = {
  key: string;
  name: string;
  username: string;
  city: string;
  bio: string;
  expertRole?: string;
  expertArea?: string;
};

const handleOf = (h: string) => h.replace(/^@/, '');

export const DEMO_PEOPLE: Person[] = [
  ...FRIENDS.map((f) => {
    const traveler = TRAVELERS[f.name];
    return {
      key: handleOf(f.handle).replace(/\W/g, ''),
      name: f.name,
      username: handleOf(f.handle),
      city: traveler?.city ?? '',
      bio: traveler?.bio ?? '',
    };
  }),
  ...EXPERTS.map((e) => ({
    key: e.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z]/g, ''),
    name: e.name,
    username: e.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z]/g, ''),
    city: '',
    bio: e.role,
    expertRole: e.role,
    expertArea: e.area,
  })),
];

export type DemoUser = { id: string; email: string; name: string };

export const DEMO_USERS: DemoUser[] = [
  { id: DEMO_USER.id, email: DEMO_USER.email, name: 'Ana Ribeiro' },
  ...DEMO_PEOPLE.map((p) => ({ id: userId(p.name), email: `${p.key}@worlo.app`, name: p.name })),
];

/** "Lúcia M." / "João P." in the prototype are the same people. */
export function userId(name: string): string {
  if (name === 'Ana Ribeiro' || name === 'me') return DEMO_USER.id;
  const person =
    DEMO_PEOPLE.find((p) => p.name === name) ??
    DEMO_PEOPLE.find((p) => p.name.startsWith(name.replace(/\.$/, '')));
  if (!person) throw new Error(`Unknown demo person: ${name}`);
  return demoId(`user:${person.key}`);
}

const POST_TYPE = { Dica: 'tip', Roteiro: 'itinerary', Avaliação: 'review', Pergunta: 'question' };

type Row = Record<string, unknown> & { id: string };
export type DemoWorld = Record<string, Row[]>;

const common = (id: string, createdAt: string | Ago) => ({
  id,
  created_at: createdAt,
  updated_at: createdAt,
  deleted_at: null,
});

export function demoWorld(): DemoWorld {
  const ana = DEMO_USER.id;
  const personal = demoData();
  const withOwner = (rows: Row[]): Row[] => rows.map((r) => ({ ...r, user_id: ana as string }));

  // Ana's trips/wishes: collaborators are real people now (memberships).
  const trips = withOwner(personal.trips).map((t) => ({ ...t, companions: [] }));
  const wishes: Row[] = withOwner(personal.wish_destinations).map((w) => ({
    ...w,
    companions: [],
  }));

  const profiles: Row[] = [
    ...withOwner(personal.profiles).map(({ user_id: _, ...p }) => p as Row),
    ...DEMO_PEOPLE.map((p, i) => ({
      ...common(userId(p.name), ago(400 * D + i)),
      name: p.name,
      username: p.username,
      city: p.city,
      bio: p.bio,
      avatar_url: null,
      currency: 'BRL',
      units: 'metric',
      privacy: 'public',
      privacy_detail: { map: true, trips: true, photos: true, search: true },
      notification_prefs: { memories: true, community: true, itineraries: true, promos: false },
      auto_organize_photos: true,
      onboarded_at: ago(400 * D),
    })),
  ];

  const people: Row[] = profiles.map((p) => {
    const person = DEMO_PEOPLE.find((x) => userId(x.name) === p.id);
    return {
      id: p.id,
      created_at: p.created_at,
      updated_at: p.updated_at,
      deleted_at: null,
      name: p.name,
      username: p.username,
      city: p.city,
      bio: p.bio,
      avatar_url: null,
      expert_role: person?.expertRole ?? null,
      expert_area: person?.expertArea ?? null,
      searchable: true,
    };
  });

  // Other travelers' own maps and trips (their public pages).
  const visited: Row[] = [...withOwner(personal.visited_countries)];
  const otherTrips: Row[] = [];
  for (const [name, t] of Object.entries(TRAVELERS)) {
    const owner = userId(name);
    for (const iso of t.countries) {
      visited.push({
        ...common(demoId(`visited:${name}:${iso}`), ago(300 * D)),
        user_id: owner,
        country_iso: iso,
        years: [],
      });
    }
    t.trips.forEach((trip, i) => {
      const [place = '', year = ''] = trip.meta.includes('·')
        ? trip.meta.split(' · ')
        : ['', trip.meta];
      otherTrips.push({
        ...common(demoId(`trip:${name}:${i}`), ago((100 + i) * D)),
        user_id: owner,
        title: trip.title,
        place,
        country: '',
        country_iso: Object.entries(COUNTRIES).find(([, c]) => c.flag === trip.flag)?.[0] ?? null,
        flag: trip.flag,
        period: year,
        year,
        days: 1,
        photos: 0,
        places: 0,
        companions: [],
        people: '',
        total: '',
        tint: '',
        details: null,
      });
    });
  }

  // Invites to Ana (03_FLOWS → F4): Bia's past trip, Rafael's future trip.
  const jeri = INVITES.jeri;
  const seul = INVITES.seul;
  if (!jeri || !seul) throw new Error('Prototype invites missing');
  otherTrips.push({
    ...common(demoId('trip:jeri'), ago(30 * D)),
    user_id: userId(jeri.from),
    title: jeri.title,
    place: jeri.place,
    country: jeri.country ?? '',
    country_iso: Object.entries(COUNTRIES).find(([, c]) => c.name === jeri.country)?.[0] ?? null,
    flag: jeri.flag,
    period: jeri.period,
    year: jeri.year ?? '',
    days: jeri.days ?? 1,
    photos: jeri.photos ?? 0,
    places: jeri.places ?? 0,
    companions: [],
    people: '',
    total: jeri.total ?? '',
    tint: '',
    details: null,
  });
  wishes.push({
    ...common(demoId('wish:seul'), ago(10 * D)),
    user_id: userId(seul.from),
    country_iso: Object.entries(COUNTRIES).find(([, c]) => c.flag === seul.flag)?.[0] ?? null,
    name: seul.title,
    flag: seul.flag,
    note: seul.note,
    companions: [],
    tint: '',
  });

  const membership = (
    entityType: 'trip' | 'wish',
    entityId: string,
    member: string,
    status: 'pending' | 'accepted',
    invitedBy: string,
    when: Ago,
  ): Row => ({
    ...common(demoId(`member:${entityId}:${member}`), when),
    user_id: member,
    entity_type: entityType,
    entity_id: entityId,
    role: 'collaborator',
    status,
    invited_by: invitedBy,
  });
  const memberships: Row[] = [
    ...TRIPS.flatMap((t) =>
      t.collab.map((c) =>
        membership(
          'trip',
          demoId(`trip:${t.id}`),
          userId(c.name),
          c.status === 'ok' ? 'accepted' : 'pending',
          ana,
          ago(60 * D),
        ),
      ),
    ),
    ...FUTURES.flatMap((f) =>
      (f.collab ?? []).map((c) =>
        membership(
          'wish',
          demoId(`wish:${f.id}`),
          userId(c.name),
          c.status === 'ok' ? 'accepted' : 'pending',
          ana,
          ago(60 * D),
        ),
      ),
    ),
    membership(
      'trip',
      demoId('trip:jeri'),
      userId(jeri.others[0] as string),
      'accepted',
      userId(jeri.from),
      ago(25 * D),
    ),
    membership('trip', demoId('trip:jeri'), ana, 'pending', userId(jeri.from), ago(20)),
    membership(
      'wish',
      demoId('wish:seul'),
      userId(seul.others[0] as string),
      'accepted',
      userId(seul.from),
      ago(9 * D),
    ),
    membership('wish', demoId('wish:seul'), ana, 'pending', userId(seul.from), ago(5 * H)),
  ];

  const ACTIVITY_KIND: [RegExp, string, (text: string) => Record<string, unknown>][] = [
    [
      /fotos/,
      'photos',
      (t) => ({
        count: Number(/\d+/.exec(t)?.[0] ?? 1),
        day: Number(/Dia (\d+)/.exec(t)?.[1] ?? 0) || null,
      }),
    ],
    [
      /lançou/,
      'expense',
      (t) => ({ amount: /R\$ [\d.,]+/.exec(t)?.[0] ?? '', name: t.split(' no ').at(-1) ?? '' }),
    ],
    [/diário/, 'diary', (t) => ({ day: Number(/Dia (\d+)/.exec(t)?.[1] ?? 0) || null })],
  ];
  const activities: Row[] = Object.entries(TRIP_ACTIVITY).flatMap(([tripKey, list]) =>
    list.map((a, i) => {
      const [, kind, data] = ACTIVITY_KIND.find(([re]) => re.test(a.text)) ?? [
        /./,
        'joined',
        () => ({}),
      ];
      return {
        ...common(demoId(`activity:${tripKey}:${i}`), ago(parseWhen(a.when))),
        user_id: userId(a.who),
        entity_type: 'trip',
        entity_id: demoId(`trip:${tripKey}`),
        kind,
        data: data(a.text),
      };
    }),
  );

  const follows: Row[] = [
    ...FRIENDS.map((f) => ({
      ...common(demoId(`follow:ana:${f.name}`), ago(200 * D)),
      user_id: ana,
      followee_id: userId(f.name),
    })),
    ...['Marina Costa', 'Bia Souza', 'Rafael Lima'].map((name) => ({
      ...common(
        demoId(`follow:${name}:ana`),
        ago(name === 'Rafael Lima' ? parseWhen('qui') : 150 * D),
      ),
      user_id: userId(name),
      followee_id: ana,
    })),
  ];

  // Posts: community feed, place tips, expert highlights, and Ana's own tip.
  const posts: Row[] = [
    ...POSTS.map((p) => ({
      ...common(demoId(`post:${p.id}`), ago(parseWhen(p.when))),
      user_id: userId(p.author),
      type: POST_TYPE[p.type],
      place_label: p.where,
      place_ref: null,
      title: null,
      text: p.text,
      rating: p.rating ?? null,
      photo_paths: [],
      trip_id: null,
      visibility: 'public',
    })),
    ...PLACE_TIPS.map((t, i) => ({
      ...common(demoId(`tip:${i}`), ago(parseWhen(t.when))),
      user_id: userId(t.who),
      type: 'tip',
      place_label: Object.keys(PLACE_INFO)[0] ?? '',
      place_ref: null,
      title: null,
      text: t.text,
      rating: null,
      photo_paths: [],
      trip_id: null,
      visibility: 'public',
    })),
    ...EXPERTS.map((e, i) => ({
      ...common(demoId(`expert-post:${e.id}`), ago((i + 1) * 2 * D)),
      user_id: userId(e.name),
      type: 'tip',
      place_label: e.area,
      place_ref: null,
      title: e.title,
      text: e.text,
      rating: null,
      photo_paths: [],
      trip_id: null,
      visibility: 'public',
    })),
    {
      ...common(demoId('post:ana-28'), ago(20 * D)),
      user_id: ana,
      type: 'tip',
      place_label: 'Lisboa',
      place_ref: null,
      title: null,
      text: 'Pega o elétrico 28 no Martim Moniz antes das 9h: dá pra sentar e ver Alfama com calma.',
      rating: null,
      photo_paths: [],
      trip_id: demoId('trip:lisboa'),
      visibility: 'public',
    },
  ];

  const comments: Row[] = Object.entries(COMMENTS).flatMap(([postKey, list]) =>
    list.map((c, i) => ({
      ...common(demoId(`comment:${postKey}:${i}`), ago(parseWhen(c.when))),
      post_id: demoId(`post:${postKey}`),
      user_id: userId(c.who),
      text: c.text,
    })),
  );

  // Real votes from the demo accounts (the prototype's 128/4 are illustrative).
  const voters = DEMO_USERS.map((u) => u.id);
  const votes: Record<string, unknown>[] = [];
  for (const p of POSTS) {
    const author = userId(p.author);
    const others = voters.filter((v) => v !== author && v !== ana);
    const yes = Math.min(
      others.length - 1,
      Math.max(1, Math.round((p.yes / (p.yes + p.no)) * (others.length - 1))),
    );
    others.forEach((v, i) => {
      if (i <= yes)
        votes.push({
          post_id: demoId(`post:${p.id}`),
          user_id: v,
          value: i < yes ? 'yes' : 'no',
          created_at: ago(D),
        });
    });
  }
  for (const v of voters.filter((x) => x !== ana)) {
    votes.push({
      post_id: demoId('post:ana-28'),
      user_id: v,
      value: 'yes',
      created_at: ago(6 * D),
    });
  }

  // Ana's inbox (05 · NOTIFS). The server writes these in real use.
  const N = (
    id: string,
    type: string,
    actor: string | null,
    entityType: string | null,
    entityId: string | null,
    data: Record<string, unknown>,
    when: string,
  ): Row => ({
    ...common(demoId(`notification:${id}`), ago(parseWhen(when))),
    user_id: ana,
    type,
    actor_id: actor,
    entity_type: entityType,
    entity_id: entityId,
    data,
    read_at: null,
  });
  const notifications: Row[] = NOTIFS.map((n) => {
    switch (n.type) {
      case 'invite': {
        const inv = INVITES[n.inv ?? ''];
        if (!inv) throw new Error(`Unknown invite ${n.inv}`);
        return inv.kind === 'past'
          ? N(
              n.id,
              'invite',
              userId(inv.from),
              'trip',
              demoId(`trip:${inv.id}`),
              { note: inv.note },
              n.time,
            )
          : N(
              n.id,
              'invite',
              userId(inv.from),
              'wish',
              demoId(`wish:${inv.id}`),
              { note: inv.note },
              n.time,
            );
      }
      case 'activity':
        return N(
          n.id,
          'activity',
          userId(n.who ?? ''),
          'trip',
          demoId(`trip:${n.trip}`),
          { kind: 'photos', count: Number(/\d+/.exec(n.text ?? '')?.[0] ?? 1) },
          n.time,
        );
      case 'memory':
        return N(n.id, 'memory', null, 'trip', demoId(`trip:${n.trip}`), { years: 1 }, n.time);
      case 'accepted':
        return N(
          n.id,
          'invite_accepted',
          userId(n.who ?? ''),
          'trip',
          demoId(`trip:${n.trip}`),
          {},
          n.time,
        );
      case 'pending':
        return N(
          n.id,
          'invite_pending',
          userId(n.who ?? ''),
          'trip',
          demoId(`trip:${n.trip}`),
          {},
          n.time,
        );
      case 'community':
        return N(
          n.id,
          'community',
          null,
          'post',
          demoId('post:ana-28'),
          { count: Number(/\d+/.exec(n.who ?? '')?.[0] ?? 1) },
          n.time,
        );
      case 'reminder':
        return N(
          n.id,
          'reminder',
          null,
          'itinerary',
          demoId('itinerary:peru'),
          { days: 30 },
          n.time,
        );
      case 'follow':
        return N(n.id, 'follow', userId(n.who ?? ''), null, null, {}, n.time);
      default:
        throw new Error(`Unmapped prototype notification type: ${n.type}`);
    }
  });

  // A direct thread with Marina (prototype chat seed).
  const thread = demoId('thread:marina');
  const chatMessages = (CHAT_SEEDS['Marina Costa'] ?? []).map((m, i, all) => ({
    ...common(demoId(`message:marina:${i}`), ago(D - (all.length - i) * 5)),
    thread_id: thread,
    user_id: m.from === 'me' ? ana : userId('Marina Costa'),
    text: m.text,
  }));
  const lastMessage = chatMessages.at(-1)?.created_at ?? ago(D);

  return {
    profiles,
    people,
    visited_countries: visited,
    wish_destinations: wishes,
    trips: [...trips, ...otherTrips],
    memberships,
    activities,
    itineraries: withOwner(personal.itineraries),
    live_sessions: withOwner(personal.live_sessions),
    saved_items: withOwner(personal.saved_items),
    collections: withOwner(personal.collections),
    follows,
    notifications,
    chat_threads: [{ ...common(thread, ago(2 * D)), kind: 'direct', last_message_at: lastMessage }],
    chat_members: [ana, userId('Marina Costa')].map((u) => ({
      ...common(demoId(`chat-member:marina:${u}`), ago(2 * D)),
      thread_id: thread,
      user_id: u,
      last_read_at: u === ana ? null : lastMessage,
    })),
    messages: chatMessages,
    posts,
    comments,
    post_votes: votes as Row[],
    tour_slots: PASSEIOS.flatMap((tour) =>
      Array.from({ length: TOUR_DAYS }, (_, i) => ({
        ...common(demoId(`slot:${tour.id}:${i}`), ago(D)),
        tour_id: tour.id,
        date: new Day(i + 1),
        capacity: TOUR_CAPACITY,
        booked: i === SOLD_OUT_DAY ? TOUR_CAPACITY : 0,
      })),
    ),
  };
}

/** Tables the device syncs (posts, comments and votes are online only). */
const LOCAL_TABLES = [
  'profiles',
  'people',
  'visited_countries',
  'wish_destinations',
  'trips',
  'memberships',
  'activities',
  'itineraries',
  'live_sessions',
  'saved_items',
  'collections',
  'follows',
  'notifications',
  'chat_threads',
  'chat_members',
  'messages',
  'tour_slots',
  'bookings',
  'businesses',
] as const;

/**
 * What `userId`'s phone holds after a full sync: the same rules as the RLS
 * policies (supabase/migrations), applied to the demo world.
 */
export function visibleTo(world: DemoWorld, me = DEMO_USER.id): DemoWorld {
  const get = (t: string) => world[t] ?? [];
  const myMemberships = get('memberships').filter(
    (m) => m.user_id === me && (m.status === 'pending' || m.status === 'accepted'),
  );
  const ownedBy = (table: string) =>
    new Set(
      get(table)
        .filter((r) => r.user_id === me)
        .map((r) => r.id),
    );
  const viewable = {
    trip: new Set([
      ...ownedBy('trips'),
      ...myMemberships.filter((m) => m.entity_type === 'trip').map((m) => m.entity_id as string),
    ]),
    wish: new Set([
      ...ownedBy('wish_destinations'),
      ...myMemberships.filter((m) => m.entity_type === 'wish').map((m) => m.entity_id as string),
    ]),
  };
  const editableTrips = new Set([
    ...ownedBy('trips'),
    ...myMemberships
      .filter((m) => m.entity_type === 'trip' && m.status === 'accepted')
      .map((m) => m.entity_id as string),
  ]);
  const canView = (r: Row) =>
    viewable[r.entity_type as 'trip' | 'wish']?.has(r.entity_id as string) ?? false;
  const myThreads = new Set(
    get('chat_members')
      .filter((m) => m.user_id === me)
      .map((m) => m.thread_id),
  );

  const related = new Set<string>([me]);
  for (const f of get('follows')) {
    if (f.user_id === me) related.add(f.followee_id as string);
    if (f.followee_id === me) related.add(f.user_id as string);
  }
  for (const m of get('memberships').filter(canView)) {
    if (m.status === 'pending' || m.status === 'accepted') related.add(m.user_id as string);
  }
  for (const t of [...get('trips'), ...get('wish_destinations')]) {
    if (viewable.trip.has(t.id) || viewable.wish.has(t.id)) related.add(t.user_id as string);
  }
  for (const m of get('chat_members'))
    if (myThreads.has(m.thread_id)) related.add(m.user_id as string);

  const rules: Record<(typeof LOCAL_TABLES)[number], (r: Row) => boolean> = {
    profiles: (r) => r.id === me,
    people: (r) => related.has(r.id) || r.expert_role != null,
    visited_countries: (r) => r.user_id === me,
    wish_destinations: (r) => viewable.wish.has(r.id),
    trips: (r) => viewable.trip.has(r.id),
    memberships: (r) => r.user_id === me || canView(r),
    activities: canView,
    itineraries: (r) => r.user_id === me,
    live_sessions: (r) => r.user_id === me,
    saved_items: (r) => r.user_id === me,
    collections: (r) => r.user_id === me,
    follows: (r) => r.user_id === me || r.followee_id === me,
    notifications: (r) => r.user_id === me,
    chat_threads: (r) => myThreads.has(r.id),
    chat_members: (r) => myThreads.has(r.thread_id),
    messages: (r) => myThreads.has(r.thread_id),
    tour_slots: () => true,
    bookings: (r) => r.user_id === me,
    businesses: (r) => r.user_id === me,
  };
  const out: DemoWorld = {};
  for (const table of LOCAL_TABLES) out[table] = get(table).filter(rules[table]);
  out.trip_expenses = (get('trip_expenses') ?? []).filter((r) =>
    editableTrips.has(r.trip_id as string),
  );
  return out;
}
