import migrations from '@worlo/db/migrations';
import { useTranslation } from '@worlo/i18n';
import { FullScreenState } from '@worlo/ui';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { reloadAppAsync } from 'expo';
import type { ReactNode } from 'react';
import { db } from '@/lib/database';

/** Renders children only after the local migrations ran. */
export function DatabaseGate({ children }: { children: ReactNode }) {
  const { success, error } = useMigrations(db, migrations);
  const { t } = useTranslation();

  if (error) {
    return (
      <FullScreenState
        kind="error"
        title={t('common.states.errorTitle')}
        text={t('common.states.errorText')}
        retryLabel={t('common.actions.retry')}
        onRetry={() => void reloadAppAsync()}
        code="WRL-DB"
      />
    );
  }
  if (!success) return null;
  return children;
}
