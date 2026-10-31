import { createRepositories } from '@worlo/db';
import { randomUUID } from 'expo-crypto';
import { db } from '@/lib/database';
import { dataEvents } from './events';

let requestSync = () => {};
let currentUserId: string | null = null;

/** AuthProvider keeps this in step with the session (owner of new rows). */
export function setCurrentUserId(id: string | null) {
  currentUserId = id;
}

export const getCurrentUserId = () => currentUserId;

/** SyncProvider registers how to schedule a push after local writes. */
export function setSyncRequester(fn: () => void) {
  requestSync = fn;
}

/**
 * The only way the app writes domain data: each write lands in SQLite and in the
 * outbox together, then the UI refreshes and a sync is scheduled.
 */
export const repos = createRepositories(db, {
  generateId: randomUUID,
  userId: getCurrentUserId,
  onChange: () => {
    dataEvents.emit();
    requestSync();
  },
});
