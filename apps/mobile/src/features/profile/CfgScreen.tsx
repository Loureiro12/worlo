import { useLocalSearchParams } from 'expo-router';
import type { ComponentType } from 'react';
import type { CfgSection } from '@/navigation/routes';
import { AccountSection } from './cfg/AccountSection';
import { DeleteSection } from './cfg/DeleteSection';
import { EmailSection } from './cfg/EmailSection';
import { ExportSection } from './cfg/ExportSection';
import { HelpSection } from './cfg/HelpSection';
import { CurrencySection, LanguageSection, UnitsSection } from './cfg/PreferenceSections';
import { PrivacySection } from './cfg/PrivacySection';
import { SecuritySection } from './cfg/SecuritySection';

const SECTIONS: Record<CfgSection, ComponentType> = {
  account: AccountSection,
  email: EmailSection,
  security: SecuritySection,
  language: LanguageSection,
  currency: CurrencySection,
  units: UnitsSection,
  privacy: PrivacySection,
  export: ExportSection,
  help: HelpSection,
  delete: DeleteSection,
};

const isSection = (value: unknown): value is CfgSection =>
  typeof value === 'string' && value in SECTIONS;

/** K3 · `/cfg/[section]` (fullscreen). Unknown sections fall back to "Editar perfil". */
export function CfgScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const Section = SECTIONS[isSection(section) ? section : 'account'];
  // Remount per section so form state never leaks between sub-screens.
  return <Section key={section} />;
}
