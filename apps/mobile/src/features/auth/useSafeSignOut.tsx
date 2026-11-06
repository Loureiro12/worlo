import { useTranslation } from '@worlo/i18n';
import { Button, Sheet, Text } from '@worlo/ui';
import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { flushPendingChanges } from '@/features/sync/SyncProvider';
import { auth } from '@/lib/auth';
import { routes } from '@/navigation/routes';

/**
 * Signing out erases this account's data from the device, including changes
 * that never reached the server. So: push them first, and if some are still
 * only here (offline, server down), ask before throwing them away.
 */
export function useSafeSignOut(): {
  signOut: () => Promise<void>;
  busy: boolean;
  confirm: ReactNode;
} {
  const { t } = useTranslation();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(0);

  const leave = async () => {
    setPending(0);
    setBusy(true);
    await auth.signOut();
    router.replace(routes.welcome);
  };

  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    const left = await flushPendingChanges();
    setBusy(false);
    if (left > 0) setPending(left);
    else await leave();
  };

  const confirm = (
    <Sheet
      testID="sign-out-pending"
      visible={pending > 0}
      onClose={() => setPending(0)}
      closeLabel={t('common.actions.close')}
      title={t('auth.signOutPending.title')}
      footer={
        <View style={{ gap: 8 }}>
          <Button
            testID="sign-out-pending-retry"
            label={t('auth.signOutPending.retry')}
            fullWidth
            loading={busy}
            onPress={() => void signOut()}
          />
          <Button
            testID="sign-out-pending-discard"
            variant="destructive"
            label={t('auth.signOutPending.discard')}
            fullWidth
            onPress={() => void leave()}
          />
        </View>
      }
    >
      <Text variant="body" tone="support">
        {t('auth.signOutPending.text', { count: pending })}
      </Text>
    </Sheet>
  );

  return { signOut, busy, confirm };
}
