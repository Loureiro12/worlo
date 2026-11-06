import { useTranslation } from '@worlo/i18n';
import {
  Avatar,
  BottomBar,
  Button,
  Card,
  colors,
  HeroScreen,
  Icon,
  IconButton,
  makeStyles,
  StatusChip,
  Text,
  useToast,
} from '@worlo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, View } from 'react-native';
import { DemoGate } from '@/components/DemoGate';
import { useCatalog } from '@/data/catalog';
import { formatMoney } from '@/lib/format';
import { img } from '@/lib/images';
import { routes } from '@/navigation/routes';
import { findTour } from './tours';
import { useTourSave } from './useTourSave';

/** Only http(s) links leave the app. */
function safeUrl(url: string | undefined): string | null {
  const value = url?.trim();
  return value && /^https?:\/\/\S+$/i.test(value) ? value : null;
}

/**
 * E2 · Detalhe do passeio. "Reservar" opens the booking page the supplier gave
 * us: the contract is between the traveler and the supplier, not Worlo.
 */
export function PasseioScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { PASSEIOS } = useCatalog();
  const tour = findTour(PASSEIOS, id);
  const { saved, toggle } = useTourSave(tour);
  const back = () => (router.canGoBack() ? router.back() : router.navigate(routes.passeios));
  const price = formatMoney(tour.price, tour.cur);
  const bookingUrl = safeUrl(tour.bookingUrl);

  // Booking happens on the supplier's site: Worlo only sends the traveler there.
  const reserve = async () => {
    if (!bookingUrl) return;
    try {
      await Linking.openURL(bookingUrl);
    } catch {
      toast.show(t('discovery.tour.linkError'), 'error');
    }
  };

  return (
    <DemoGate network onBack={back}>
      <HeroScreen
        testID="passeio-screen"
        heroUri={img(`pas-${tour.id}`, 800, 600)}
        heroTint={colors.border}
        heroHeight={300}
        onBack={back}
        backLabel={t('common.actions.back')}
        actions={
          <IconButton
            testID="passeio-save"
            icon="heart"
            tone="photo"
            label={saved ? t('discovery.unsave') : t('discovery.save')}
            accessibilityState={{ selected: saved }}
            iconWeight={saved ? 'fill' : 'regular'}
            iconColor={saved ? colors.primary : colors.text}
            onPress={toggle}
          />
        }
        bottomBar={
          <BottomBar tone="white">
            <View style={{ flexShrink: 0 }}>
              <Text testID="passeio-total" variant="statS" style={styles.total}>
                {price}
              </Text>
              <Text variant="micro" tone="muted" style={{ fontSize: 12 }}>
                {t('discovery.tour.perPersonShort')}
              </Text>
            </View>
            <Button
              testID="passeio-book"
              flex={1}
              icon={bookingUrl ? 'arrow-square-out' : undefined}
              label={
                bookingUrl
                  ? t('discovery.tour.bookWith', { host: tour.host })
                  : t('discovery.tour.noLink')
              }
              disabled={!bookingUrl}
              onPress={() => void reserve()}
            />
          </BottomBar>
        }
      >
        <Card overlap gap={10}>
          <Text variant="overline" tone="link">{`${tour.cat} · ${tour.place}`}</Text>
          <Text variant="h2" style={styles.name}>
            {tour.name}
          </Text>
          <View
            accessible
            accessibilityLabel={`${t('common.a11y.rating', { value: tour.rating })}, ${t('discovery.tour.reviews', { count: tour.reviews })}`}
            style={styles.row6}
          >
            <Icon name="star" weight="fill" size={16} color={colors.primary} />
            <Text variant="label">{tour.rating}</Text>
            <Text variant="bodyS" tone="muted">
              {`· ${t('discovery.tour.reviews', { count: tour.reviews })}`}
            </Text>
          </View>
          <View style={styles.chips}>
            <StatusChip kind="neutral" icon="clock" label={tour.dur} />
            <StatusChip kind="neutral" icon="translate" label={tour.lang} />
            <StatusChip kind="neutral" icon="users" label={tour.group} />
          </View>
        </Card>

        <View style={styles.content}>
          <Card style={styles.hostRow}>
            <Avatar name={tour.host} initials={tour.hostIni} size={44} colorIndex={0} />
            <View style={{ flex: 1 }}>
              <Text variant="body" weight={700}>
                {tour.host}
              </Text>
              <View style={styles.row4}>
                <Icon name="seal-check" size={16} color={colors.success} />
                <Text variant="caption" weight={600} tone="success">
                  {t('discovery.tour.verified')}
                </Text>
              </View>
            </View>
          </Card>

          <View style={{ gap: 8 }}>
            <Text variant="h3">{t('discovery.tour.about')}</Text>
            <Text variant="body" tone="support" style={{ lineHeight: 23 }}>
              {tour.desc}
            </Text>
          </View>

          <View style={{ gap: 10 }}>
            <Text variant="h3">{t('discovery.tour.includes')}</Text>
            {tour.inc.map((item) => (
              <View key={item} style={styles.row10}>
                <Icon name="check-circle" size={20} color={colors.link} />
                <Text variant="body" style={{ flex: 1 }}>
                  {item}
                </Text>
              </View>
            ))}
            <View
              accessible
              accessibilityLabel={t('discovery.tour.meetingPoint', { place: tour.meet })}
              style={[styles.row10, { marginTop: 4 }]}
            >
              <Icon name="map-pin" size={20} color={colors.textMuted} />
              <Text variant="body" tone="support" style={{ flex: 1 }}>
                {tour.meet}
              </Text>
            </View>
          </View>

          {bookingUrl ? (
            <View style={styles.row10}>
              <Icon name="info" size={20} color={colors.textMuted} />
              <Text testID="passeio-external-note" variant="bodyS" tone="muted" style={{ flex: 1 }}>
                {t('discovery.tour.externalNote', { host: tour.host })}
              </Text>
            </View>
          ) : null}

          <Card padding={16} gap={8}>
            <View
              accessible
              accessibilityLabel={t('discovery.tour.reviewA11y', { who: tour.review.who })}
              style={styles.row8}
            >
              <Text variant="bodyS" weight={700}>
                {tour.review.who}
              </Text>
              <View style={styles.stars}>
                {[0, 1, 2, 3, 4].map((n) => (
                  <Icon key={n} name="star" weight="fill" size={12} color={colors.primary} />
                ))}
              </View>
            </View>
            <Text variant="body">{`“${tour.review.text}”`}</Text>
          </Card>
        </View>
      </HeroScreen>
    </DemoGate>
  );
}

const useStyles = makeStyles((t) => ({
  total: { fontSize: 22, lineHeight: 26 },
  name: { fontSize: 26, lineHeight: 32, letterSpacing: -0.26 },
  row4: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  row6: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  row8: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row10: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  content: {
    paddingHorizontal: t.layout.gutter,
    paddingTop: 20,
    gap: 22,
  },
  hostRow: { flexDirection: 'row', alignItems: 'center' },
  datesScroll: { marginHorizontal: -t.layout.gutter, flexGrow: 0 },
  dates: { paddingHorizontal: t.layout.gutter, gap: 8 },
  peopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  stars: { flexDirection: 'row', gap: 2 },
  sheetActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
}));
