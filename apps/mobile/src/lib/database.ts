import { schema } from '@worlo/db';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

// Change listener powers `useLiveQuery`: the UI re-renders on every local write.
const sqlite = openDatabaseSync('worlo.db', { enableChangeListener: true });

export const db = drizzle(sqlite, { schema });
