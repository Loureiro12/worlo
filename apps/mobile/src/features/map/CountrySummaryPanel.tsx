import { useTranslation } from '@worlo/i18n';
import {
  Button,
  colors,
  Icon,
  IconButton,
  radius,
  StatusChip,
  type StatusChipKind,
  shadow,
  Text,
  useToast,
} from '@worlo/ui';
import { Pressable, View } from 'react-native';
import { useCatalog } from '@/data/catalog';
import { repos } from '@/data/repositories';
import { useQuery } from '@/data/useQuery';
import { world } from '@/data/world';
import { countryFlag, useCountryName } from '@/lib/countries';
import type { CountryId } from '@/mocks/types';
import { hasCountryPage, useCountryStatus } from './shared';

export type CountrySummaryPanelProps = {
  id: CountryId;
  /** Distance from the bottom of the screen (clears the tab bar). */
  bottom?: number;
  onClose: () => void;
  onOpenPage: () => void;
};

/**
 * B2 · Resumo do país: white panel over the globe (not a modal, the globe stays
 * interactive above it). Flag, name, status, facts, history, toggles and CTA.
 */
export function CountrySummaryPanel({
  id,
  bottom = 92,
  onClose,
  onOpenPage,
}: CountrySummaryPanelProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const countryName = useCountryName();
  const status = useCountryStatus(id);
  const isVisited = useQuery(() => Boolean(repos.world.visitedMap()[id]), [id]);
  const isWish = useQuery(() => repos.world.wishes().some((w) => w.countryIso === id), [id]);
  const { toggleVisited, toggleWishlist } = world;
  const { COUNTRIES } = useCatalog();

  const info = COUNTRIES[id];
  const name = countryName(id);
  const flag = countryFlag(id);

  const chip: { kind: StatusChipKind; icon?: 'check-circle' | 'map-pin' } =
    status === 'none'
      ? { kind: 'neutral', icon: 'map-pin' }
      : status === 'visited'
        ? { kind: 'visited', icon: 'check-circle' }
        : { kind: status };

  const tripThere = useQuery(() => repos.trips.list().find((x) => x.countryIso === id), [id]);
  const hist =
    status === 'visited' || status === 'planned'
      ? tripThere
        ? t('map.sheet.histTrip', { title: tripThere.title, period: tripThere.period })
        : status === 'planned'
          ? t('map.sheet.histPlanned')
          : t('map.sheet.histMarked')
      : status === 'wishlist'
        ? t('map.sheet.histWishlist')
        : null;

  const onVisited = () => {
    toggleVisited(id);
    if (!isVisited) toast.show(t('map.toasts.visitedAdded'));
  };
  const onWish = () => {
    toggleWishlist(id, name, flag);
    if (!isWish) toast.show(t('map.toasts.wishlistAdded', { country: name }));
  };

  return (
    <View
      testID="map-country-sheet"
      accessibilityLabel={t('map.sheet.label', { name })}
      style={{
        position: 'absolute',
        left: 8,
        right: 8,
        bottom,
        paddingTop: 8,
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 14,
        borderRadius: radius.r24,
        backgroundColor: colors.surface,
        boxShadow: shadow.sheetMap,
      }}
    >
      <View
        style={{
          width: 36,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.border,
          alignSelf: 'center',
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <Text style={{ fontSize: 36, lineHeight: 40 }} accessibilityElementsHidden>
          {flag}
        </Text>
        <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
          <Text
            testID="map-country-name"
            variant="h2"
            accessibilityRole="header"
            style={{ fontSize: 26, lineHeight: 30 }}
          >
            {name}
          </Text>
          <StatusChip
            testID="map-country-status"
            size="sm"
            kind={chip.kind}
            icon={chip.icon}
            label={t(`map.sheet.status.${status}`)}
          />
        </View>
        <View style={{ borderRadius: 18, backgroundColor: colors.background }}>
          <IconButton
            testID="map-country-close"
            icon="x"
            label={t('common.actions.close')}
            tone="plain"
            size={40}
            iconSize={16}
            onPress={onClose}
          />
        </View>
      </View>

      {info?.capital ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            [t('map.sheet.capital'), info.capital],
            [t('map.sheet.language'), info.lang],
            [t('map.sheet.currency'), info.cur],
          ].map(([label, value]) => (
            <View
              key={label}
              accessible
              accessibilityLabel={`${label}: ${value}`}
              style={{
                flex: 1,
                minWidth: 0,
                padding: 10,
                gap: 2,
                borderRadius: radius.r12,
                backgroundColor: colors.background,
              }}
            >
              <Text variant="overline" tone="muted" style={{ fontSize: 11 }} numberOfLines={1}>
                {label}
              </Text>
              <Text variant="label" style={{ lineHeight: 18 }}>
                {value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {hist ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name="clock-counter-clockwise" size={18} color={colors.link} />
          <Text variant="label" tone="support" style={{ flex: 1 }}>
            {hist}
          </Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <ToggleButton
          testID="map-country-visited"
          active={isVisited}
          icon="check-circle"
          label={isVisited ? t('map.sheet.visited') : t('map.sheet.beenThere')}
          activeTone="coral"
          onPress={onVisited}
        />
        <ToggleButton
          testID="map-country-wishlist"
          active={isWish}
          icon="diamond"
          label={isWish ? t('map.sheet.onList') : t('map.sheet.wantToGo')}
          activeTone="dark"
          onPress={onWish}
        />
      </View>

      {hasCountryPage(id) ? (
        <Button
          testID="map-country-page"
          label={t('map.sheet.openPage')}
          size="md"
          fullWidth
          onPress={onOpenPage}
        />
      ) : null}
    </View>
  );
}

/** "Já fui" / "Quero ir" pill toggle (44, outline → filled when active). */
function ToggleButton({
  active,
  icon,
  label,
  activeTone,
  onPress,
  testID,
}: {
  active: boolean;
  icon: 'check-circle' | 'diamond';
  label: string;
  activeTone: 'coral' | 'dark';
  onPress: () => void;
  testID: string;
}) {
  const bg = active ? (activeTone === 'coral' ? colors.primary : colors.selected) : colors.surface;
  const fg = active && activeTone === 'dark' ? colors.onSelected : colors.text;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: 44,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: active ? bg : colors.border,
        backgroundColor: bg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Icon name={icon} size={18} color={fg} weight={active ? 'fill' : 'regular'} />
      <Text variant="label" weight={700} style={{ color: fg }}>
        {label}
      </Text>
    </Pressable>
  );
}
