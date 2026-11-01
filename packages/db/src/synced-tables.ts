import type { RemoteRow } from '@worlo/sync';
import { getTableColumns } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import {
  activities,
  bookings,
  businesses,
  catalog,
  chatMembers,
  chatThreads,
  collections,
  devices,
  follows,
  itineraries,
  liveLogs,
  liveSessions,
  memberships,
  messages,
  notifications,
  people,
  photos,
  profiles,
  savedItems,
  tourSlots,
  tripExpenses,
  trips,
  visitedCountries,
  wishDestinations,
} from './schema';

/**
 * Registry of tables kept in sync with Supabase. To sync a new table:
 * 1. add it to `schema.ts` (with id / created_at / updated_at / deleted_at),
 * 2. create the Postgres table + RLS in `supabase/migrations` (same column names),
 * 3. add it here and to `syncOrder`.
 */

type Row = Record<string, unknown>;

/**
 * Local and remote rows differ only in key casing, because every local column
 * is named after its Postgres column. `updated_at` never goes up (the server
 * stamps it), nor an empty `user_id` (the server defaults it to the caller).
 */
export function createMapper<T extends SQLiteTable>(table: T) {
  const columns = Object.entries(getTableColumns(table)).map(([key, column]) => ({
    key,
    name: column.name,
  }));
  return {
    table,
    toRemote(row: Row): Row {
      const out: Row = {};
      for (const { key, name } of columns) {
        if (name === 'updated_at') continue;
        // Rows created before ownership was tracked: let the server default it.
        if (name === 'user_id' && row[key] == null) continue;
        out[name] = row[key] ?? null;
      }
      return out;
    },
    toLocal(row: RemoteRow): T['$inferInsert'] {
      const out: Row = {};
      for (const { key, name } of columns) {
        if (name in row) out[key] = row[name];
      }
      return out as T['$inferInsert'];
    },
  };
}

export const syncedTables = {
  profiles: createMapper(profiles),
  visited_countries: createMapper(visitedCountries),
  wish_destinations: createMapper(wishDestinations),
  trips: createMapper(trips),
  trip_expenses: createMapper(tripExpenses),
  itineraries: createMapper(itineraries),
  live_sessions: createMapper(liveSessions),
  live_logs: createMapper(liveLogs),
  saved_items: createMapper(savedItems),
  collections: createMapper(collections),
  memberships: createMapper(memberships),
  follows: createMapper(follows),
  notifications: createMapper(notifications),
  chat_members: createMapper(chatMembers),
  messages: createMapper(messages),
  photos: createMapper(photos),
  devices: createMapper(devices),
  businesses: createMapper(businesses),
  /** Pull only: the server writes these. */
  catalog: createMapper(catalog),
  people: createMapper(people),
  activities: createMapper(activities),
  chat_threads: createMapper(chatThreads),
  tour_slots: createMapper(tourSlots),
  bookings: createMapper(bookings),
} as const;

/** Tables the device never writes. */
export const pullOnlyTables = [
  'catalog',
  'people',
  'activities',
  'chat_threads',
  'tour_slots',
  'bookings',
] as const;

export type SyncedTableName = keyof typeof syncedTables;

/** Pull order: catalog first (screens need it), then parents before children. */
export const syncOrder: readonly SyncedTableName[] = [
  'catalog',
  'tour_slots',
  'profiles',
  'people',
  'visited_countries',
  'wish_destinations',
  'trips',
  'memberships',
  'trip_expenses',
  'activities',
  'photos',
  'itineraries',
  'live_sessions',
  'live_logs',
  'saved_items',
  'collections',
  'follows',
  'notifications',
  'chat_threads',
  'chat_members',
  'messages',
  'devices',
  'bookings',
  'businesses',
];

export function isSyncedTable(name: string): name is SyncedTableName {
  return name in syncedTables;
}
