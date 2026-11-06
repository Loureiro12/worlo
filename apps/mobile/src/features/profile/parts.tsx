import { useTranslation } from '@worlo/i18n';
import {
  Checkbox,
  colors,
  Divider,
  Icon,
  type IconName,
  Photo,
  Rating,
  radius,
  ScreenHeader,
  Text,
  Toggle,
} from '@worlo/ui';
import { useRouter } from 'expo-router';
import { Children, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useCollections } from '@/data/saved';
import { img } from '@/lib/images';
import type { SavedCategory, SavedItem } from '@/mocks/types';
import { routes } from '@/navigation/routes';

/* Building blocks shared by the profile/settings screens. Promotion candidates
   for @worlo/ui: GroupCard, MenuRow, SwitchRow, CheckRow. */

/** Sticky header of the light stack screens: back · overline · optional action. */
export function StackHeader({ overline, right }: { overline: string; right?: ReactNode }) {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <ScreenHeader
      overline={overline}
      onBack={() => router.back()}
      backLabel={t('common.actions.back')}
      right={right}
    />
  );
}

/** H1 + muted line under the header (Salvos, Coleções, Fotos, Configurações). */
export function PageTitle({
  title,
  sub,
  variant = 'h1',
}: {
  title: string;
  sub?: string;
  variant?: 'h1' | 'h1Detail';
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant={variant} accessibilityRole="header">
        {title}
      </Text>
      {sub ? (
        <Text variant="body" tone="muted">
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

/** Overline (CAIXA ALTA) used above groups of settings. */
export function Overline({ children }: { children: string }) {
  return (
    <Text variant="overline" tone="muted" style={{ paddingLeft: 4 }} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** Overline + white r24 card whose rows are separated by hairlines. */
export function GroupCard({
  title,
  children,
  testID,
}: {
  title?: string;
  children: ReactNode;
  testID?: string;
}) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={{ gap: 8 }} testID={testID}>
      {title ? <Overline>{title}</Overline> : null}
      <View
        style={{ borderRadius: radius.r24, backgroundColor: colors.surface, overflow: 'hidden' }}
      >
        {rows.map((row, i) => (
          <View key={(row as { key?: string }).key ?? i}>
            {i > 0 ? <Divider /> : null}
            {row}
          </View>
        ))}
      </View>
    </View>
  );
}

type RowBase = {
  icon?: IconName;
  label: string;
  sub?: string;
  testID?: string;
};

function RowText({ label, sub }: { label: string; sub?: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text variant="body" weight={600}>
        {label}
      </Text>
      {sub ? (
        <Text variant="caption" tone="muted" weight={400}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

const rowStyle = {
  minHeight: 56,
  paddingVertical: 14,
  paddingHorizontal: 16,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
} as const;

/** Settings row: icon · label/sub · value · caret. Without `onPress` it is static. */
export function MenuRow({
  icon,
  label,
  sub,
  value,
  onPress,
  trailing,
  caret = true,
  testID,
}: RowBase & {
  value?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  caret?: boolean;
}) {
  const content = (
    <>
      {icon ? <Icon name={icon} size={22} /> : null}
      <RowText label={label} sub={sub} />
      {value ? (
        <Text variant="label" tone="muted" numberOfLines={1} style={{ maxWidth: 150 }}>
          {value}
        </Text>
      ) : null}
      {trailing}
      {onPress && caret ? <Icon name="caret-right" size={16} color={colors.textMuted} /> : null}
    </>
  );
  if (!onPress) {
    return (
      <View testID={testID} style={rowStyle}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={[label, sub, value].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ pressed }) => [rowStyle, pressed ? { backgroundColor: colors.background } : null]}
    >
      {content}
    </Pressable>
  );
}

/** Row with a switch on the right; the switch carries the accessible name. */
export function SwitchRow({
  icon,
  label,
  sub,
  value,
  onChange,
  testID,
}: RowBase & { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={rowStyle}>
      {icon ? <Icon name={icon} size={22} /> : null}
      <RowText label={label} sub={sub} />
      <Toggle label={label} value={value} onChange={onChange} testID={testID} />
    </View>
  );
}

/** Row with a checkbox on the right (Exportar dados). */
export function CheckRow({
  icon,
  label,
  sub,
  checked,
  onPress,
  testID,
}: RowBase & { checked: boolean; onPress: () => void }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [rowStyle, pressed ? { backgroundColor: colors.background } : null]}
    >
      {icon ? <Icon name={icon} size={22} /> : null}
      <RowText label={label} sub={sub} />
      <Checkbox checked={checked} />
    </Pressable>
  );
}

const categoryKeys = {
  Atrações: 'attractions',
  Gastronomia: 'food',
  Passeios: 'tours',
  Hospedagem: 'stay',
} as const satisfies Record<SavedCategory, string>;

export const SAVED_CATEGORIES = Object.keys(categoryKeys) as SavedCategory[];

/** Localized label of a saved-item category (data is stored in pt-BR). */
export function useCategoryLabel() {
  const { t } = useTranslation();
  return (cat: SavedCategory) => {
    const key = categoryKeys[cat];
    return key ? t(`profile.categories.${key}`) : cat;
  };
}

/** Saved place card: thumb 64 · name · cat · meta · rating "em N coleções" · actions. */
/** Where a saved item leads: its tour or its place page. */
export function savedItemHref(item: Pick<SavedItem, 'id' | 'name'>) {
  return item.id.startsWith('pas-')
    ? routes.passeio(item.id.slice('pas-'.length))
    : routes.place(item.name);
}

export function SavedItemRow({
  item,
  actions,
  testID,
}: {
  item: SavedItem;
  actions: ReactNode;
  testID?: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const categoryLabel = useCategoryLabel();
  const inCollections = useCollections().filter((c) => c.ids.includes(item.id)).length;
  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 10,
        borderRadius: radius.r16,
        backgroundColor: colors.surface,
      }}
    >
      <Pressable
        testID={testID ? `${testID}-open` : undefined}
        accessibilityRole="button"
        accessibilityLabel={t('profile.saved.open', { name: item.name })}
        onPress={() => router.push(savedItemHref(item))}
        style={({ pressed }) => ({
          flex: 1,
          minWidth: 0,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Photo
          uri={img(item.id, 160, 160)}
          tint={colors.border}
          width={64}
          height={64}
          radius={12}
        />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text variant="body" weight={700} numberOfLines={2} style={{ lineHeight: 20 }}>
            {item.name}
          </Text>
          <Text variant="caption" tone="muted" weight={400} numberOfLines={1}>
            {`${categoryLabel(item.cat)} · ${item.meta}`}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Rating value={item.rating} size={12} />
            {inCollections ? (
              <Text variant="caption" tone="muted" weight={600} style={{ fontSize: 12 }}>
                {`· ${t('profile.saved.inCollections', { count: inCollections })}`}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
      <View style={{ gap: 2 }}>{actions}</View>
    </View>
  );
}
