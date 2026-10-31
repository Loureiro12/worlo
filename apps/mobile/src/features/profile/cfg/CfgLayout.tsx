import { useTranslation } from '@worlo/i18n';
import { BottomBar, Button, type ButtonVariant, FormError, Screen } from '@worlo/ui';
import type { ReactNode } from 'react';
import type { CfgSection } from '@/navigation/routes';
import { PageTitle, StackHeader } from '../parts';

export type CfgCta = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Request running: spinner, no second tap. */
  loading?: boolean;
};

/** K3 shell: header "Configurações" + H1 + sub + content + error + fixed CTA. */
export function CfgLayout({
  section,
  cta,
  error,
  children,
}: {
  section: CfgSection;
  cta?: CfgCta;
  /** Message of the first invalid field (04_INTERACTIONS → Validações). */
  error?: string | null;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Screen
      testID="cfg-screen"
      gap={20}
      header={<StackHeader overline={t('profile.cfg.overline')} />}
      bottomBar={
        cta ? (
          <BottomBar testID="cfg-cta-bar">
            <Button
              testID="cfg-cta"
              flex={1}
              variant={cta.variant ?? 'primary'}
              label={cta.label}
              disabled={cta.disabled}
              loading={cta.loading}
              onPress={cta.onPress}
            />
          </BottomBar>
        ) : undefined
      }
    >
      <PageTitle
        variant="h1Detail"
        title={t(`profile.cfg.${section}.title`)}
        sub={section === 'security' ? undefined : t(`profile.cfg.${section}.sub`)}
      />
      {children}
      {error ? <FormError testID="cfg-error" message={error} /> : null}
    </Screen>
  );
}
