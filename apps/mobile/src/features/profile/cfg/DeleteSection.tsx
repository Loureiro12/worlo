import { useTranslation } from '@worlo/i18n';
import { Button, colors, Icon, radius, Text, TextField, useToast } from '@worlo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { failureCode } from '@/features/auth/entry';
import { auth } from '@/lib/auth';
import { routes } from '@/navigation/routes';
import { CfgLayout } from './CfgLayout';
import { deleteConfirmed } from './validation';

const LOSSES = ['loss1', 'loss2', 'loss3', 'loss4'] as const;

/** K3 · Excluir conta: the red button only works after typing the word. */
export function DeleteSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const word = t('profile.cfg.delete.word');
  const ok = deleteConfirmed(input, word);

  return (
    <CfgLayout
      section="delete"
      cta={{
        label: t('profile.cfg.delete.cta'),
        variant: 'destructiveSolid',
        disabled: !ok,
        loading: busy,
        onPress: async () => {
          if (!ok || busy) return;
          setBusy(true);
          // Removes the account on the server, then signs out and wipes the device.
          const result = await auth.deleteAccount();
          setBusy(false);
          const code = failureCode(result);
          if (code) {
            toast.show(t(`auth.errors.server.${code}`), 'error');
            return;
          }
          if (!result.ok) return;
          router.replace(routes.welcome);
          toast.show(t('profile.cfg.delete.done'), 'info');
        },
      }}
    >
      <View style={{ gap: 18 }}>
        <View
          testID="delete-warning"
          style={{
            padding: 16,
            gap: 10,
            borderRadius: radius.r16,
            borderWidth: 1,
            borderColor: colors.error,
            backgroundColor: colors.surface,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="warning" weight="fill" size={20} color={colors.error} />
            <Text variant="body" weight={700} tone="error">
              {t('profile.cfg.delete.warning')}
            </Text>
          </View>
          {LOSSES.map((key) => (
            <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name="minus-circle" size={18} color={colors.error} />
              <Text variant="bodyS" tone="support" weight={400} style={{ flex: 1 }}>
                {t(`profile.cfg.delete.${key}`)}
              </Text>
            </View>
          ))}
        </View>
        <Button
          testID="delete-export-first"
          variant="ghost"
          icon="download-simple"
          label={t('profile.cfg.delete.exportFirst')}
          onPress={() => router.push(routes.cfg('export'))}
        />
        <TextField
          testID="delete-confirm"
          label={t('profile.cfg.delete.confirmLabel')}
          placeholder={word}
          value={input}
          onChangeText={setInput}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </View>
    </CfgLayout>
  );
}
