import { useTranslation } from '@worlo/i18n';
import {
  BottomBar,
  Button,
  colors,
  HeroScreen,
  Icon,
  IconButton,
  type IconName,
  layout,
  radius,
  Text,
  useToast,
} from '@worlo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { img } from '@/lib/images';
import { CITY_TABS, PLACE_INFO, PLACE_TIPS } from '@/mocks/data.generated';
import { routes } from '@/navigation/routes';
import { useStore } from '@/store';
import {
  Breadcrumb,
  decodeParam,
  findCityItem,
  LISBOA,
  savedItemFor,
  TipCard,
  useIsSaved,
  useToggleSaved,
} from './shared';

const DEFAULT_PLACE = 'Miradouro da Senhora do Monte';

/**
 * C7 · Lugar. PLACE_INFO has the Miradouro; other places get a generic page
 * built from their CITY_TABS row (type · price · hours).
 */
export function PlaceScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const name = decodeParam(rawId) || DEFAULT_PLACE;
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const toggleSaved = useToggleSaved();
  const itineraries = useStore((s) => s.itineraries);
  const updateItinerary = useStore((s) => s.updateItinerary);

  const found = findCityItem(name);
  const item = found?.item ?? { name, meta: '', rating: '4,6' };
  const tab = found?.tab ?? 'attr';
  const rating = item.rating ?? '4,6';
  const info = PLACE_INFO[name];
  const metaParts = item.meta ? item.meta.split(' · ') : [];
  const saved = useIsSaved(savedItemFor(item, tab).id);

  // Deterministic counts per place (prototype formula).
  const reviews = ((name.length * 37) % 900) + 120;
  const travelers = ((name.length * 53) % 2000) + 300;

  const rows: [IconName, string, string][] = info
    ? info.rows
    : [
        ['tag', t('map.place.rows.type'), metaParts[0] ?? CITY_TABS[tab].l],
        ['coins', t('map.place.rows.price'), metaParts[1] ?? t('map.place.fallback.price')],
        ['clock', t('map.place.rows.hours'), metaParts[2] ?? t('map.place.fallback.hours')],
        ['hourglass', t('map.place.rows.duration'), t('map.place.fallback.duration')],
      ];

  const onSave = () => toggleSaved(savedItemFor({ ...item, rating }, tab));

  const addToItinerary = () => {
    const target = itineraries[0];
    if (!target) return;
    updateItinerary(target.id, (it) => ({
      ...it,
      days: it.days.map((d, j) =>
        j === it.days.length - 1
          ? {
              ...d,
              items: [
                ...d.items,
                { time: 'A definir', icon: 'map-pin', title: name, note: LISBOA.name, cost: 0 },
              ],
            }
          : d,
      ),
    }));
    toast.show(t('map.place.addedToItinerary', { place: name, itinerary: target.title }));
  };

  return (
    <HeroScreen
      testID="place-screen"
      heroUri={img(`ci-${name}`, 800, 560)}
      heroTint={colors.border}
      heroHeight={280}
      onBack={() => router.back()}
      backLabel={t('common.actions.back')}
      actions={
        <IconButton
          testID="place-save-top"
          icon="bookmark-simple"
          iconWeight={saved ? 'fill' : 'regular'}
          iconColor={saved ? colors.primary : colors.text}
          label={saved ? t('map.place.saved') : t('map.place.save')}
          accessibilityState={{ selected: saved }}
          tone="photo"
          onPress={onSave}
        />
      }
      bottomBar={
        <BottomBar tone="white">
          <Button
            testID="place-save"
            variant="outline"
            icon="bookmark-simple"
            label={saved ? t('map.place.saved') : t('map.place.save')}
            accessibilityState={{ selected: saved }}
            flex={1}
            onPress={onSave}
          />
          <Button
            testID="place-add-itinerary"
            label={t('map.place.addToItinerary')}
            flex={1.3}
            onPress={addToItinerary}
          />
        </BottomBar>
      }
    >
      <View style={{ paddingHorizontal: layout.gutter, paddingTop: 20, gap: 22 }}>
        <View style={{ gap: 8 }}>
          <Breadcrumb
            items={[{ label: LISBOA.country }, { label: LISBOA.name }, { label: CITY_TABS[tab].l }]}
          />
          <Text variant="h1Detail" accessibilityRole="header">
            {name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Icon name="star" weight="fill" size={16} color={colors.primary} />
            <Text variant="label">{rating}</Text>
            <Text variant="bodyS" tone="muted" style={{ flexShrink: 1 }}>
              {t('map.place.stats', { reviews, travelers })}
            </Text>
          </View>
        </View>

        <Text variant="bodyL" tone="support">
          {info ? info.desc : t('map.place.genericDesc', { name, city: LISBOA.name })}
        </Text>

        <View
          testID="place-info"
          style={{ borderRadius: radius.r24, backgroundColor: colors.surface, overflow: 'hidden' }}
        >
          {rows.map(([icon, label, value], i) => (
            <View
              key={label}
              accessible
              accessibilityLabel={`${label}: ${value}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderBottomWidth: i === rows.length - 1 ? 0 : 1,
                borderBottomColor: colors.background,
              }}
            >
              <Icon name={icon} size={20} color={colors.textMuted} />
              <Text variant="label" tone="muted" style={{ flex: 1 }}>
                {label}
              </Text>
              <Text variant="label" weight={700} align="right" style={{ flexShrink: 1 }}>
                {value}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ gap: 10 }}>
          <Text variant="h3" accessibilityRole="header">
            {t('map.place.tipsTitle')}
          </Text>
          {PLACE_TIPS.map((tip) => (
            <TipCard key={tip.who} tip={tip} />
          ))}
        </View>

        <Pressable
          testID="place-tours"
          accessibilityRole="button"
          accessibilityLabel={`${t('map.place.toursTitle')}. ${t('map.place.toursText')}`}
          onPress={() => router.push(routes.passeio('tejo'))}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            padding: 16,
            borderRadius: radius.r24,
            backgroundColor: colors.accentSoft,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="ticket" size={22} color={colors.link} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="body" weight={700} style={{ fontSize: 16 }}>
              {t('map.place.toursTitle')}
            </Text>
            <Text variant="bodyS" tone="support">
              {t('map.place.toursText')}
            </Text>
          </View>
          <Icon name="arrow-right" size={20} color={colors.link} />
        </Pressable>
      </View>
    </HeroScreen>
  );
}
