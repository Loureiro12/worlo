import { useTranslation } from '@worlo/i18n';
import { Button, Card, colors, Icon, IconCircle, Text, useToast } from '@worlo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { routes } from '@/navigation/routes';
import { GroupCard } from '../parts';
import { CfgLayout } from './CfgLayout';

const FAQ = ['1', '2', '3', '4'] as const;

/** K3 · Ajuda: FAQ accordion, support chat and links. */
export function HelpSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState<number>(0);
  const soon = () => toast.show(t('profile.cfg.help.linkSoon'), 'info');

  return (
    <CfgLayout section="help">
      <GroupCard>
        {FAQ.map((n, i) => {
          const expanded = open === i;
          return (
            <View key={n}>
              <Pressable
                testID={`faq-${n}`}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={t(`profile.cfg.help.faq.q${n}`)}
                onPress={() => setOpen(expanded ? -1 : i)}
                style={{
                  minHeight: 56,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Text variant="body" weight={600} style={{ flex: 1, lineHeight: 20 }}>
                  {t(`profile.cfg.help.faq.q${n}`)}
                </Text>
                <Icon
                  name={expanded ? 'caret-up' : 'caret-down'}
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>
              {expanded ? (
                <Text
                  testID={`faq-answer-${n}`}
                  variant="bodyS"
                  tone="support"
                  weight={400}
                  style={{ paddingHorizontal: 16, paddingBottom: 16, lineHeight: 21 }}
                >
                  {t(`profile.cfg.help.faq.a${n}`)}
                </Text>
              ) : null}
            </View>
          );
        })}
      </GroupCard>

      <Card
        testID="help-support"
        surface="soft"
        radius={24}
        padding={16}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
        onPress={() => router.push(routes.chat('support'))}
        accessibilityLabel={`${t('profile.cfg.help.support')}, ${t('profile.cfg.help.supportText')}`}
      >
        <IconCircle icon="chat-circle-dots" size={44} background={colors.surface} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyL" weight={700}>
            {t('profile.cfg.help.support')}
          </Text>
          <Text variant="bodyS" tone="support" weight={400}>
            {t('profile.cfg.help.supportText')}
          </Text>
        </View>
        <Icon name="arrow-right" size={20} color={colors.link} />
      </Card>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
        <Button variant="ghost" label={t('profile.cfg.help.terms')} onPress={soon} />
        <Button variant="ghost" label={t('profile.cfg.help.privacyPolicy')} onPress={soon} />
      </View>
    </CfgLayout>
  );
}
