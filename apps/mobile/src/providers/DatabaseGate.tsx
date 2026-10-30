import migrations from '@worlo/db/migrations';
import { Screen, Text } from '@worlo/ui';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import type { ReactNode } from 'react';
import { db } from '@/lib/database';

/** Renders children only after local migrations have been applied. */
export function DatabaseGate({ children }: { children: ReactNode }) {
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Text tone="danger">{error.message}</Text>
      </Screen>
    );
  }
  if (!success) return null;
  return children;
}
