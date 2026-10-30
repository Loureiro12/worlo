import {
  Badge,
  Button,
  Card,
  Checkbox,
  HStack,
  makeStyles,
  RadioGroup,
  Screen,
  type StatusTone,
  Text,
  TextField,
  type TextVariant,
  textVariants,
  useTheme,
  VStack,
} from '@worlo/ui';
import { useState } from 'react';
import { View } from 'react-native';

/** Living catalogue of the design system, rendered with the real components. */

const swatches = [
  'background',
  'surface',
  'surfaceSunken',
  'border',
  'text',
  'textMuted',
  'primary',
  'secondary',
  'danger',
] as const;
const tones: StatusTone[] = ['neutral', 'info', 'success', 'warning', 'danger'];

const useStyles = makeStyles((t) => ({
  swatch: {
    width: t.size.controlLg,
    height: t.size.controlLg,
    borderRadius: t.radius.md,
    borderWidth: t.borderWidth.hairline,
    borderColor: t.colors.border,
  },
}));

export function DesignSystemScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const [checked, setChecked] = useState(true);
  const [choice, setChoice] = useState<'a' | 'b'>('a');

  return (
    <Screen scroll testID="design-system-screen">
      <Section title="Colors">
        <HStack gap="sm" wrap>
          {swatches.map((name) => (
            <VStack key={name} gap="xs" align="center">
              <View style={[styles.swatch, { backgroundColor: theme.colors[name] }]} />
              <Text variant="caption" tone="muted">
                {name}
              </Text>
            </VStack>
          ))}
        </HStack>
      </Section>

      <Section title="Typography">
        {(Object.keys(textVariants) as TextVariant[]).map((variant) => (
          <Text key={variant} variant={variant}>
            {variant}
          </Text>
        ))}
      </Section>

      <Section title="Buttons">
        <HStack gap="sm" wrap>
          <Button label="Primary" />
          <Button label="Secondary" variant="secondary" />
          <Button label="Ghost" variant="ghost" />
          <Button label="Danger" variant="danger" />
        </HStack>
        <HStack gap="sm" wrap>
          <Button label="Small" size="sm" />
          <Button label="Large" size="lg" />
          <Button label="Loading" loading />
          <Button label="Disabled" disabled />
        </HStack>
      </Section>

      <Section title="Forms">
        <TextField label="Label" placeholder="Placeholder" helperText="Helper text" />
        <TextField label="With error" defaultValue="Invalid value" error="Error message" />
        <Checkbox label="Checkbox" checked={checked} onChange={setChecked} />
        <RadioGroup
          label="Radio"
          value={choice}
          onChange={setChoice}
          options={[
            { value: 'a', label: 'Option A' },
            { value: 'b', label: 'Option B' },
          ]}
        />
      </Section>

      <Section title="Badges">
        <HStack gap="sm" wrap>
          {tones.map((tone) => (
            <Badge key={tone} tone={tone} label={tone} />
          ))}
        </HStack>
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <VStack gap="md">
        <Text variant="heading">{title}</Text>
        {children}
      </VStack>
    </Card>
  );
}
