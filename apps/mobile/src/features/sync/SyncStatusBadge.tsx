import { useTranslation } from '@worlo/i18n';
import { Badge, HStack, type StatusTone } from '@worlo/ui';
import { useSync } from './SyncProvider';

export function SyncStatusBadge() {
  const { t } = useTranslation();
  const { status, online } = useSync();

  const [tone, label]: [StatusTone, string] =
    status.state === 'syncing'
      ? ['info', t('sync.syncing')]
      : !online
        ? ['neutral', t('sync.offline')]
        : status.state === 'error'
          ? ['danger', t('sync.error')]
          : ['success', t('sync.synced')];

  return (
    <HStack gap="xs">
      <Badge testID="sync-status" tone={tone} label={label} />
      {status.pending > 0 && (
        <Badge
          testID="sync-pending"
          tone="warning"
          label={t('sync.pending', { count: status.pending })}
        />
      )}
    </HStack>
  );
}
