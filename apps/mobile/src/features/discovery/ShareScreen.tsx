import { useTranslation } from '@worlo/i18n';
import {
  alpha,
  Chip,
  ChipRow,
  colors,
  Icon,
  type IconName,
  Screen,
  ScreenHeader,
  Text,
  useToast,
} from '@worlo/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { type LayoutChangeEvent, Pressable, View } from 'react-native';
import { useCopyLink } from '@/lib/useCopyLink';
import { routes, type ShareSubject } from '@/navigation/routes';
import { useStore } from '@/store';
import type { ShareFormat } from '@/store/slices/discovery';
import { CompactSegmented } from './CompactSegmented';
import { type PictureRef, saveImage, shareImage } from './exportImage';
import { type PreviewLabels, SharePreview } from './SharePreview';
import {
  isShareSubject,
  PREVIEW_SIZE,
  SHARE_FORMATS,
  SHARE_SUBJECTS,
  SHARE_THEME_KEYS,
  SHARE_THEMES,
  type ShareContent,
  useShareContent,
} from './shareContent';

type Destination = 'stories' | 'tiktok' | 'whatsapp' | 'feed' | 'x' | 'save' | 'link';

const DEST_ICONS: Record<Destination, IconName> = {
  stories: 'instagram-logo',
  tiktok: 'tiktok-logo',
  whatsapp: 'whatsapp-logo',
  feed: 'instagram-logo',
  x: 'x-logo',
  save: 'download-simple',
  link: 'link',
};

/** Story → Stories/TikTok/WhatsApp; Post and 1:1 → Feed/X/WhatsApp; + Salvar, Link. */
export function destinationsFor(format: ShareFormat): Destination[] {
  const social: Destination[] =
    format === 'story' ? ['stories', 'tiktok', 'whatsapp'] : ['feed', 'x', 'whatsapp'];
  return [...social, 'save', 'link'];
}

/** J · Compartilhar: subject + format + theme + @ → native share sheet (03_FLOWS → F11). */
export function ShareScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const copyLink = useCopyLink();
  const params = useLocalSearchParams<{
    subject?: string;
    tripId?: string;
    roteiroId?: string;
    ach?: string;
  }>();
  const [picked, setSubject] = useState<ShareSubject>(
    isShareSubject(params.subject) ? params.subject : 'map',
  );
  const { format, theme, showHandle } = useStore((s) => s.shareOptions);
  const setShareOptions = useStore((s) => s.setShareOptions);
  const content = useShareContent({
    format,
    tripId: params.tripId,
    roteiroId: params.roteiroId,
    achievement: params.ach,
  });
  // Without an unlocked achievement there is nothing to show on that card.
  const subjects = SHARE_SUBJECTS.filter((s) => s.key !== 'ach' || content.ach.title);
  const subject = subjects.some((s) => s.key === picked) ? picked : 'map';
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const picture: PictureRef = useRef(null);
  const exporting = useRef(false);
  const close = () => (router.canGoBack() ? router.back() : router.navigate(routes.profile));

  const size = PREVIEW_SIZE[format];
  // Shrink the preview on short screens (the vertical padding of the area is 14 × 2).
  const scale = area ? Math.min(1, area.width / size.width, (area.height - 28) / size.height) : 1;
  const onArea = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!area || area.width !== width || area.height !== height) setArea({ width, height });
  };

  const send = async (dest: Destination) => {
    if (dest === 'link') {
      await copyLink(content.link.startsWith('http') ? content.link : `https://${content.link}`);
      return;
    }
    if (exporting.current) return;
    exporting.current = true;
    try {
      if (dest !== 'save') {
        await shareImage(picture, size);
      } else if ((await saveImage(picture, size)) === 'saved') {
        toast.show(t('share.imageSaved'));
      } else {
        toast.show(t('share.saveDenied'), 'error');
      }
    } catch {
      toast.show(t('share.exportError'), 'error');
    } finally {
      exporting.current = false;
    }
  };

  const labels: PreviewLabels = {
    mapOverline: t('share.preview.mapOverline'),
    yearOverline: t('share.preview.yearOverline'),
    retroOverline: t('share.preview.retroOverline', { year: content.trip.year }),
    bestMoment: t('share.preview.bestMoment'),
    nextTrip: t('share.preview.nextTrip'),
    achOverline: t('share.preview.achOverline'),
  };

  return (
    <Screen
      testID="share-screen"
      tone="dark"
      scroll={false}
      padded={false}
      gap={0}
      header={
        <ScreenHeader
          onDark
          overline={t('share.title')}
          onBack={close}
          backIcon="x"
          backLabel={t('common.actions.close')}
        />
      }
    >
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('share.subjectsLabel')}
        style={{ paddingTop: 4 }}
      >
        <ChipRow>
          {subjects.map((s) => (
            <Chip
              key={s.key}
              testID={`share-subject-${s.key}`}
              onDark
              icon={s.icon}
              label={t(`share.subjects.${s.key}`)}
              selected={subject === s.key}
              onPress={() => setSubject(s.key)}
            />
          ))}
        </ChipRow>
      </View>

      <View
        onLayout={onArea}
        style={{
          flex: 1,
          minHeight: 0,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 14,
        }}
      >
        <SharePreview
          subject={subject}
          format={format}
          theme={SHARE_THEMES[theme]}
          showHandle={showHandle}
          content={content}
          scale={scale}
          pictureRef={picture}
          labels={labels}
          accessibilityLabel={t('share.preview.a11y', {
            format: t(`share.formats.${format}`),
            theme: t(`share.themes.${theme}`),
            summary: summaryOf(subject, content, labels),
          })}
        />
      </View>

      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <CompactSegmented
              testID="share-format"
              label={t('share.formatLabel')}
              value={format}
              onChange={(value) => setShareOptions({ format: value })}
              options={SHARE_FORMATS.map((f) => ({
                value: f,
                label: t(`share.formats.${f}`),
                testID: `share-format-${f}`,
              }))}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {SHARE_THEME_KEYS.map((key) => {
              const selected = key === theme;
              return (
                <Pressable
                  key={key}
                  testID={`share-theme-${key}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={t('share.themeLabel', { name: t(`share.themes.${key}`) })}
                  hitSlop={6}
                  onPress={() => setShareOptions({ theme: key })}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: selected ? colors.textInverse : alpha.darkBorderStrong,
                    backgroundColor: SHARE_THEMES[key].bg,
                  }}
                />
              );
            })}
          </View>
          <Pressable
            testID="share-handle"
            accessibilityRole="switch"
            accessibilityState={{ checked: showHandle }}
            accessibilityLabel={t('share.handle')}
            hitSlop={6}
            onPress={() => setShareOptions({ showHandle: !showHandle })}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: showHandle ? colors.primary : alpha.darkBorder,
            }}
          >
            <Icon name="at" size={16} color={showHandle ? colors.onPrimary : colors.textInverse} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          {destinationsFor(format).map((dest, i) => {
            const accent = i === 0;
            const plain = dest === 'save' || dest === 'link';
            return (
              <Pressable
                key={dest}
                testID={`share-dest-${dest}`}
                accessibilityRole="button"
                accessibilityLabel={t(`share.destinations.${dest}`)}
                onPress={() => void send(dest)}
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: 'center',
                  gap: 6,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: accent
                      ? colors.primary
                      : plain
                        ? alpha.darkBorder
                        : colors.surface,
                  }}
                >
                  <Icon
                    name={DEST_ICONS[dest]}
                    size={22}
                    color={plain ? colors.textInverse : colors.text}
                  />
                </View>
                <Text
                  variant="micro"
                  tone="inverseMuted"
                  align="center"
                  numberOfLines={2}
                  style={{ lineHeight: 13 }}
                >
                  {t(`share.destinations.${dest}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

function summaryOf(subject: ShareSubject, c: ShareContent, l: PreviewLabels): string {
  switch (subject) {
    case 'map':
      return `${l.mapOverline}, ${c.map.countries} ${c.map.countriesUnit}. ${c.map.worldLine}`;
    case 'year':
      return `${l.yearOverline}: ${c.year.title}`;
    case 'trip':
      return [c.trip.title, c.trip.place, c.trip.period, c.trip.withText]
        .filter(Boolean)
        .join(', ');
    case 'retro':
      return `${l.retroOverline}: ${c.trip.title}`;
    case 'roteiro':
      return `${l.nextTrip}: ${c.roteiro.title}, ${c.roteiro.meta}`;
    case 'ach':
      return `${l.achOverline}: ${c.ach.title}, ${c.ach.meta}`;
  }
}
