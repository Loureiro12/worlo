import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { LocalDatabase } from './database';
import * as schema from './schema';

/** Fresh in-memory database with the real migrations applied. */
export function createTestDatabase(): LocalDatabase {
  const db = drizzle(new Database(':memory:'), { schema });
  migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });
  return db;
}

export function sequentialClock(start = Date.UTC(2026, 9, 30)) {
  let tick = 0;
  return () => new Date(start + tick++ * 1000);
}

export const generateId = () => randomUUID();
