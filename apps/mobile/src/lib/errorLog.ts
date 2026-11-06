import Constants from 'expo-constants';
import Storage from 'expo-sqlite/kv-store';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Unexpected errors (a screen that failed to render, a fatal JS error, rows the
 * server rejected) are kept on the device first — the app may be about to
 * close — and sent to `app_errors` once there is a session. Without this the
 * team only hears "o app fechou sozinho".
 */

const KEY = 'worlo.errors';
const MAX_KEPT = 30;

export type ErrorReport = {
  occurredAt: string;
  context: string;
  fatal: boolean;
  message: string;
  stack: string;
};

function read(): ErrorReport[] {
  try {
    const list: unknown = JSON.parse(Storage.getItemSync(KEY) ?? '[]');
    return Array.isArray(list) ? (list as ErrorReport[]) : [];
  } catch {
    return [];
  }
}

function write(list: ErrorReport[]) {
  try {
    Storage.setItemSync(KEY, JSON.stringify(list.slice(-MAX_KEPT)));
  } catch {
    // Nowhere left to keep it: never let error reporting throw.
  }
}

/** Synchronous on purpose: a fatal error may close the app right after. */
export function recordError(error: unknown, context: string, fatal = false) {
  const e = error instanceof Error ? error : new Error(String(error));
  write([
    ...read(),
    {
      occurredAt: new Date().toISOString(),
      context: context.slice(0, 80),
      fatal,
      message: (e.message || e.name || 'Error').slice(0, 2000),
      stack: (e.stack ?? '').slice(0, 8000),
    },
  ]);
}

export const pendingErrorReports = (): ErrorReport[] => read();

let flushing = false;

/** Sends the kept reports (signed in only; RLS ties them to the user). */
export async function flushErrorReports(): Promise<void> {
  const client = supabase;
  if (!client || flushing) return;
  const list = read();
  if (list.length === 0) return;
  flushing = true;
  try {
    const { data } = await client.auth.getSession();
    if (!data.session) return;
    const version = Constants.expoConfig?.version ?? '';
    const { error } = await client.from('app_errors').insert(
      list.map((r) => ({
        occurred_at: r.occurredAt,
        platform: Platform.OS,
        app_version: version,
        context: r.context,
        fatal: r.fatal,
        message: r.message,
        stack: r.stack,
      })),
    );
    // Reports recorded while sending stay for the next flush.
    if (!error) write(read().slice(list.length));
  } catch {
    // Offline or server down: try again later.
  } finally {
    flushing = false;
  }
}

type GlobalHandler = (error: unknown, isFatal?: boolean) => void;
type ErrorUtilsLike = {
  getGlobalHandler(): GlobalHandler;
  setGlobalHandler(handler: GlobalHandler): void;
};

let installed = false;

/** Records uncaught JS errors before React Native's own handler (which may close the app). */
export function installGlobalErrorHandler() {
  const utils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!utils || installed) return;
  installed = true;
  const previous = utils.getGlobalHandler();
  utils.setGlobalHandler((error, isFatal) => {
    recordError(error, 'global', Boolean(isFatal));
    previous(error, isFatal);
  });
}
