import { schema } from '@worlo/db';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

/** The on-device database: the UI's source of truth (docs/offline-first.md). */
export const db = drizzle(openDatabaseSync('worlo.db'), { schema });
