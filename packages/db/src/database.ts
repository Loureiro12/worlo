import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type * as schema from './schema';

/**
 * Any synchronous Drizzle SQLite database: `expo-sqlite` on the device,
 * `better-sqlite3` in tests. Code in this package must use the sync API
 * (`.run()`, `.all()`, `.get()`) so it behaves the same on both.
 */
export type LocalDatabase = BaseSQLiteDatabase<'sync', unknown, typeof schema>;
