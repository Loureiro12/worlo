import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Local (on-device) schema. Synced tables mirror their Postgres counterpart
 * (supabase/migrations) column by column: TS keys are camelCase, column names
 * are the Postgres snake_case names, so mapping is mechanical (synced-tables.ts).
 * `user_id` exists only on the server (RLS); the local database holds one user.
 *
 * After changing this file run `pnpm db:generate` to create a migration.
 */

const json = <T>(name: string) => text(name, { mode: 'json' }).$type<T>();

/** id / created_at / updated_at / deleted_at, shared by every synced table. */
const synced = {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
};

export type Companion = { name: string; status: 'ok' | 'pending' };

export const profiles = sqliteTable('profiles', {
  ...synced,
  name: text('name').notNull().default(''),
  username: text('username').notNull().default(''),
  city: text('city').notNull().default(''),
  bio: text('bio').notNull().default(''),
  avatarUrl: text('avatar_url'),
  currency: text('currency').$type<'BRL' | 'EUR' | 'USD'>().notNull().default('BRL'),
  units: text('units').$type<'metric' | 'imperial'>().notNull().default('metric'),
  privacy: text('privacy').$type<'private' | 'friends' | 'public'>().notNull().default('friends'),
  privacyDetail: json<{ map: boolean; trips: boolean; photos: boolean; search: boolean }>(
    'privacy_detail',
  ).notNull(),
  notificationPrefs: json<{
    memories: boolean;
    community: boolean;
    itineraries: boolean;
    promos: boolean;
  }>('notification_prefs').notNull(),
  autoOrganizePhotos: integer('auto_organize_photos', { mode: 'boolean' }).notNull().default(true),
  onboardedAt: text('onboarded_at'),
});

export const visitedCountries = sqliteTable(
  'visited_countries',
  {
    ...synced,
    countryIso: text('country_iso').notNull(),
    years: json<string[]>('years').notNull(),
  },
  (t) => [index('visited_countries_iso_idx').on(t.countryIso)],
);

export const wishDestinations = sqliteTable('wish_destinations', {
  ...synced,
  /** Owner. Wishes can be shared (memberships). */
  userId: text('user_id'),
  countryIso: text('country_iso'),
  name: text('name').notNull(),
  flag: text('flag').notNull().default(''),
  note: text('note').notNull().default(''),
  companions: json<Companion[]>('companions').notNull(),
  tint: text('tint').notNull().default(''),
});

export const trips = sqliteTable('trips', {
  ...synced,
  /** Owner. Trips can be shared (memberships). */
  userId: text('user_id'),
  title: text('title').notNull(),
  place: text('place').notNull().default(''),
  country: text('country').notNull().default(''),
  countryIso: text('country_iso'),
  flag: text('flag').notNull().default(''),
  period: text('period').notNull().default(''),
  year: text('year').notNull().default(''),
  days: integer('days').notNull().default(1),
  photos: integer('photos').notNull().default(0),
  places: integer('places').notNull().default(0),
  companions: json<Companion[]>('companions').notNull(),
  people: text('people').notNull().default(''),
  total: text('total').notNull().default(''),
  tint: text('tint').notNull().default(''),
  /** Places, diary, timeline and money summary; the app owns the shape. */
  details: json<Record<string, unknown>>('details'),
});

export const tripExpenses = sqliteTable(
  'trip_expenses',
  {
    ...synced,
    /** Author (any member of the trip). */
    userId: text('user_id'),
    tripId: text('trip_id').notNull(),
    name: text('name').notNull(),
    category: text('category').notNull().default(''),
    icon: text('icon').notNull().default(''),
    meta: text('meta').notNull().default(''),
    amount: real('amount').notNull().default(0),
    amountLabel: text('amount_label').notNull().default(''),
    split: json<string[]>('split').notNull(),
    receipt: integer('receipt', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [index('trip_expenses_trip_idx').on(t.tripId)],
);

export const itineraries = sqliteTable('itineraries', {
  ...synced,
  title: text('title').notNull(),
  place: text('place').notNull().default(''),
  flag: text('flag').notNull().default(''),
  dates: text('dates').notNull().default(''),
  status: text('status').notNull().default(''),
  suggestionKey: text('suggestion_key').notNull().default('generic'),
  /** [{ label, items: Stop[] }]; the app owns the shape. */
  days: json<unknown[]>('days').notNull(),
  sourceRecommendationId: text('source_recommendation_id'),
});

export const liveSessions = sqliteTable('live_sessions', {
  ...synced,
  itineraryId: text('itinerary_id').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  day: integer('day').notNull().default(1),
  done: json<Record<string, boolean>>('done').notNull(),
  spent: real('spent').notNull().default(0),
  startedAt: text('started_at').notNull(),
});

export const liveLogs = sqliteTable(
  'live_logs',
  {
    ...synced,
    sessionId: text('session_id').notNull(),
    type: text('type').$type<'checkin' | 'photo' | 'expense' | 'note' | 'done'>().notNull(),
    text: text('text').notNull(),
    detail: text('detail'),
    photo: text('photo'),
    time: text('time').notNull().default(''),
    author: text('author').notNull().default('me'),
    amount: real('amount').notNull().default(0),
  },
  (t) => [index('live_logs_session_idx').on(t.sessionId)],
);

export const savedItems = sqliteTable(
  'saved_items',
  {
    ...synced,
    refId: text('ref_id').notNull(),
    name: text('name').notNull().default(''),
    category: text('category').notNull().default(''),
    city: text('city').notNull().default(''),
    flag: text('flag').notNull().default(''),
    meta: text('meta').notNull().default(''),
    rating: text('rating').notNull().default(''),
  },
  (t) => [index('saved_items_ref_idx').on(t.refId)],
);

export const collections = sqliteTable('collections', {
  ...synced,
  name: text('name').notNull(),
  itemIds: json<string[]>('item_ids').notNull(),
});

// ── Phase 2: people, collaboration, notifications, chat, photos, devices ──

/** Public profiles of people related to the user (pull only). */
export const people = sqliteTable('people', {
  ...synced,
  name: text('name').notNull().default(''),
  username: text('username').notNull().default(''),
  city: text('city').notNull().default(''),
  bio: text('bio').notNull().default(''),
  avatarUrl: text('avatar_url'),
  expertRole: text('expert_role'),
  expertArea: text('expert_area'),
  searchable: integer('searchable', { mode: 'boolean' }).notNull().default(true),
});

export const follows = sqliteTable(
  'follows',
  {
    ...synced,
    /** Follower. */
    userId: text('user_id').notNull(),
    followeeId: text('followee_id').notNull(),
  },
  (t) => [index('follows_followee_idx').on(t.followeeId)],
);

export type EntityType = 'trip' | 'wish';
export type MembershipStatus = 'pending' | 'accepted' | 'declined' | 'removed';

/** Who collaborates on a trip / wish. The owner is the entity's `userId`. */
export const memberships = sqliteTable(
  'memberships',
  {
    ...synced,
    /** The member. */
    userId: text('user_id').notNull(),
    entityType: text('entity_type').$type<EntityType>().notNull(),
    entityId: text('entity_id').notNull(),
    role: text('role').$type<'collaborator'>().notNull().default('collaborator'),
    status: text('status').$type<MembershipStatus>().notNull().default('pending'),
    invitedBy: text('invited_by'),
  },
  (t) => [index('memberships_entity_idx').on(t.entityType, t.entityId)],
);

/** "Marina adicionou 12 fotos" (written by the server, pull only). */
export const activities = sqliteTable(
  'activities',
  {
    ...synced,
    /** Actor. */
    userId: text('user_id').notNull(),
    entityType: text('entity_type').$type<EntityType>().notNull(),
    entityId: text('entity_id').notNull(),
    kind: text('kind').$type<'expense' | 'photos' | 'joined' | 'diary'>().notNull(),
    data: json<Record<string, unknown>>('data').notNull(),
  },
  (t) => [index('activities_entity_idx').on(t.entityType, t.entityId)],
);

export type NotificationType =
  | 'invite'
  | 'invite_accepted'
  | 'invite_pending'
  | 'activity'
  | 'follow'
  | 'comment'
  | 'community'
  | 'memory'
  | 'reminder';

/** Written by the server; the device only sets `readAt`. */
export const notifications = sqliteTable('notifications', {
  ...synced,
  /** Recipient. */
  userId: text('user_id').notNull(),
  type: text('type').$type<NotificationType>().notNull(),
  actorId: text('actor_id'),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  data: json<Record<string, unknown>>('data').notNull(),
  readAt: text('read_at'),
});

export const chatThreads = sqliteTable('chat_threads', {
  ...synced,
  kind: text('kind').$type<'direct' | 'support'>().notNull(),
  lastMessageAt: text('last_message_at'),
});

export const chatMembers = sqliteTable(
  'chat_members',
  {
    ...synced,
    threadId: text('thread_id').notNull(),
    userId: text('user_id').notNull(),
    lastReadAt: text('last_read_at'),
  },
  (t) => [index('chat_members_thread_idx').on(t.threadId)],
);

export const messages = sqliteTable(
  'messages',
  {
    ...synced,
    threadId: text('thread_id').notNull(),
    /** Author. */
    userId: text('user_id').notNull(),
    text: text('text').notNull(),
  },
  (t) => [index('messages_thread_idx').on(t.threadId, t.createdAt)],
);

export const photos = sqliteTable(
  'photos',
  {
    ...synced,
    userId: text('user_id').notNull(),
    tripId: text('trip_id'),
    /** '<user id>/<photo id>.jpg' in the private `photos` bucket. */
    storagePath: text('storage_path').notNull(),
    width: integer('width'),
    height: integer('height'),
    takenAt: text('taken_at'),
    lat: real('lat'),
    lng: real('lng'),
    caption: text('caption'),
    /** The file is in Storage (other members only see uploaded photos). */
    uploaded: integer('uploaded', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [index('photos_trip_idx').on(t.tripId)],
);

/** Device-only: the picked file waiting to be uploaded. Never synced. */
export const photoFiles = sqliteTable('_photo_files', {
  photoId: text('photo_id').primaryKey(),
  localUri: text('local_uri').notNull(),
  mimeType: text('mime_type').notNull().default('image/jpeg'),
  state: text('state')
    .$type<'pending' | 'uploading' | 'done' | 'failed'>()
    .notNull()
    .default('pending'),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
});

export const devices = sqliteTable('devices', {
  ...synced,
  userId: text('user_id').notNull(),
  name: text('name').notNull().default(''),
  platform: text('platform').notNull().default(''),
  sessionId: text('session_id'),
  lastSeenAt: text('last_seen_at').notNull(),
  revokedAt: text('revoked_at'),
});

/** Read-only reference content (pull only). `id` = '<kind>:<key>'. */
export const catalog = sqliteTable(
  'catalog',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),
    key: text('key').notNull(),
    sort: integer('sort').notNull().default(0),
    data: json<unknown>('data').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (t) => [index('catalog_kind_idx').on(t.kind, t.sort)],
);

/** Local writes waiting to be pushed to the server (transactional outbox). */
export const outbox = sqliteTable(
  '_outbox',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tableName: text('table_name').notNull(),
    recordId: text('record_id').notNull(),
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('outbox_record_idx').on(t.tableName, t.recordId)],
);

/** Writes the server refused for good (permission, constraint), kept for diagnosis. */
export const rejected = sqliteTable('_sync_rejected', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tableName: text('table_name').notNull(),
  recordId: text('record_id').notNull(),
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  error: text('error').notNull(),
  rejectedAt: text('rejected_at').notNull(),
});

/** Pull position per table: keyset `(updated_at, id)` of the last row applied. */
export const syncCursors = sqliteTable('_sync_cursors', {
  tableName: text('table_name').primaryKey(),
  updatedAt: text('updated_at').notNull(),
  recordId: text('record_id').notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type VisitedCountry = typeof visitedCountries.$inferSelect;
export type WishDestination = typeof wishDestinations.$inferSelect;
export type TripRow = typeof trips.$inferSelect;
export type TripExpenseRow = typeof tripExpenses.$inferSelect;
export type ItineraryRow = typeof itineraries.$inferSelect;
export type LiveSession = typeof liveSessions.$inferSelect;
export type LiveLog = typeof liveLogs.$inferSelect;
export type SavedItemRow = typeof savedItems.$inferSelect;
export type CollectionRow = typeof collections.$inferSelect;
export type CatalogRow = typeof catalog.$inferSelect;
export type Person = typeof people.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
export type ChatThread = typeof chatThreads.$inferSelect;
export type ChatMember = typeof chatMembers.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type PhotoFile = typeof photoFiles.$inferSelect;
export type Device = typeof devices.$inferSelect;
