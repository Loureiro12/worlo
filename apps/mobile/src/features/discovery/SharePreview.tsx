import {
  AvatarStack,
  fontFamily,
  Globe,
  Icon,
  LogoPin,
  Photo,
  palette,
  shadow,
  Text,
  type TextProps,
} from '@worlo/ui';
import { type ReactNode, useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { useScreenActive } from '@/lib/useScreenActive';
import type { ShareSubject } from '@/navigation/routes';
import type { ShareFormat } from '@/store/slices/discovery';
import type { PictureRef } from './exportImage';
import { PREVIEW_SIZE, type PreviewTheme, type ShareContent } from './shareContent';

/**
 * The image being shared (02_SCREENS → J → Preview). Drawn at prototype size
 * (232×412 / 290×362 / 300×300) with font scaling off: it is a picture, so its
 * layout must not reflow with the system text size. Every line is limited and
 * shrinks to fit instead of being cut.
 */
export function SharePreview({
  subject,
  format,
  theme,
  showHandle,
  content,
  labels,
  accessibilityLabel,
  scale = 1,
  pictureRef,
}: {
  subject: ShareSubject;
  format: ShareFormat;
  theme: PreviewTheme;
  showHandle: boolean;
  content: ShareContent;
  labels: PreviewLabels;
  accessibilityLabel: string;
  scale?: number;
  /** The picture to export: without the rounded corners and the shadow of the screen. */
  pictureRef?: PictureRef;
}) {
  const size = PREVIEW_SIZE[format];
  return (
    <View
      testID="share-preview"
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{
        width: size.width,
        height: size.height,
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: theme.bg,
        boxShadow: shadow.sharePreview,
        transform: scale === 1 ? undefined : [{ scale }],
      }}
    >
      <View
        ref={pictureRef}
        collapsable={false}
        style={{ flex: 1, padding: 16, gap: 10, backgroundColor: theme.bg }}
      >
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <LogoPin width={14} color={theme.fg} dot={theme.pin} />
            <P
              color={theme.fg}
              style={{
                fontFamily: fontFamily.title800,
                fontSize: 14,
                lineHeight: 18,
                letterSpacing: -0.28,
              }}
            >
              Worlo
            </P>
          </View>
          {showHandle ? (
            <P testID="share-preview-handle" color={theme.muted} style={tiny(10, 700)}>
              {content.handle}
            </P>
          ) : null}
        </View>

        <View style={{ flex: 1, minHeight: 0 }}>
          {subject === 'map' && <MapBody theme={theme} content={content} labels={labels} />}
          {subject === 'year' && (
            <YearBody theme={theme} content={content} labels={labels} format={format} />
          )}
          {subject === 'trip' && <TripBody theme={theme} content={content} />}
          {subject === 'retro' && <RetroBody theme={theme} content={content} labels={labels} />}
          {subject === 'roteiro' && <RoteiroBody theme={theme} content={content} labels={labels} />}
          {subject === 'ach' && <AchBody theme={theme} content={content} labels={labels} />}
        </View>

        <P color={theme.muted} align="center" style={tiny(9, 600)}>
          {`worlo.app/${content.user}`}
        </P>
      </View>
    </View>
  );
}

export type PreviewLabels = {
  mapOverline: string;
  yearOverline: string;
  retroOverline: string;
  bestMoment: string;
  nextTrip: string;
  achOverline: string;
};

type BodyProps = { theme: PreviewTheme; content: ShareContent; labels: PreviewLabels };

/** Preview text: fixed size (no font scaling), one line, shrinks to fit. */
function P({ lines = 1, style, ...rest }: TextProps & { lines?: number }) {
  return (
    <Text
      allowFontScaling={false}
      numberOfLines={lines}
      adjustsFontSizeToFit
      minimumFontScale={0.6}
      style={style}
      {...rest}
    />
  );
}

const tiny = (fontSize: number, weight: 600 | 700 | 800) => ({
  fontFamily:
    weight === 800 ? fontFamily.ui800 : weight === 700 ? fontFamily.ui700 : fontFamily.ui600,
  fontSize,
  lineHeight: fontSize + 4,
});

const big = (fontSize: number, lineHeight: number) => ({
  fontFamily: fontFamily.title800,
  fontSize,
  lineHeight,
  letterSpacing: -fontSize * 0.01,
});

function Overline({ children, color }: { children: string; color: string }) {
  return (
    <P color={color} style={{ ...tiny(10, 700), letterSpacing: 1.4, textTransform: 'uppercase' }}>
      {children}
    </P>
  );
}

function MapBody({ theme, content, labels }: BodyProps) {
  const active = useScreenActive();
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!box || box.width !== width || box.height !== height) setBox({ width, height });
  };
  const globe = box ?? { width: 200, height: 150 };
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <Overline color={theme.accent}>{labels.mapOverline}</Overline>
      <View style={{ flex: 1, minHeight: 0 }} onLayout={onLayout}>
        {globe.height > 0 ? (
          <Globe
            paused={!active}
            width={globe.width}
            height={globe.height}
            visited={content.map.visited}
            markers={false}
            interactive={false}
            autoRotate={0.12}
            scale={1.05}
            initialRotation={[45, -10]}
            glow={theme.bg === palette.carvao}
          />
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <P testID="share-preview-countries" color={theme.fg} style={big(40, 42)}>
          {content.map.countries}
        </P>
        <P color={theme.fg} style={tiny(13, 700)}>
          {content.map.countriesUnit}
        </P>
      </View>
      <P color={theme.muted} style={tiny(11, 600)}>
        {content.map.worldLine}
      </P>
      <P style={{ fontSize: 15, lineHeight: 20, letterSpacing: 2 }}>{content.map.flags}</P>
    </View>
  );
}

function Stat({ n, l, theme, size }: { n: string; l: string; theme: PreviewTheme; size: number }) {
  return (
    <View
      style={{
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: size >= 22 ? 10 : 6,
        borderRadius: 10,
        backgroundColor: theme.card,
      }}
    >
      <P color={theme.fg} style={big(size, size + 4)}>
        {n}
      </P>
      <P lines={2} color={theme.muted} style={tiny(10, 600)}>
        {l}
      </P>
    </View>
  );
}

function YearBody({ theme, content, labels, format }: BodyProps & { format: ShareFormat }) {
  const story = format === 'story';
  const [a, b, c, d] = content.year.stats;
  const stats = [a, b, c, d].filter((s): s is { n: string; l: string } => Boolean(s));
  const statSize = story ? 22 : 18;
  return (
    <View style={{ flex: 1, gap: 10 }}>
      <Overline color={theme.accent}>{labels.yearOverline}</Overline>
      <P
        testID="share-preview-year-title"
        lines={3}
        color={theme.fg}
        style={big(story ? 28 : 24, story ? 30 : 26)}
      >
        {content.year.title}
      </P>
      {story ? (
        <View style={{ gap: 6 }}>
          {[stats.slice(0, 2), stats.slice(2, 4)].map((row) => (
            <View key={row.map((s) => s.l).join()} style={{ flexDirection: 'row', gap: 6 }}>
              {row.map((s) => (
                <Stat key={s.l} {...s} theme={theme} size={statSize} />
              ))}
            </View>
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {stats.map((s) => (
            <Stat key={s.l} {...s} theme={theme} size={statSize} />
          ))}
        </View>
      )}
      {format !== 'square' && content.year.favorite ? (
        <Photo
          testID="share-preview-favorite"
          uri={content.year.favoriteImg}
          tint={palette.linha}
          radius={12}
          style={{ flex: 1, minHeight: 0, justifyContent: 'flex-end', padding: 8 }}
        >
          <View
            style={{
              alignSelf: 'flex-start',
              maxWidth: '100%',
              paddingVertical: 4,
              paddingHorizontal: 8,
              borderRadius: 999,
              backgroundColor: palette.branco,
            }}
          >
            <P color={palette.carvao} style={tiny(10, 700)}>
              {content.year.favorite}
            </P>
          </View>
        </Photo>
      ) : null}
    </View>
  );
}

function TripBody({ theme, content }: Omit<BodyProps, 'labels'>) {
  const trip = content.trip;
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <Photo uri={trip.img} tint={palette.linha} radius={12} style={{ flex: 1, minHeight: 0 }} />
      <Overline color={theme.accent}>{trip.place}</Overline>
      <P lines={2} color={theme.fg} style={big(24, 26)}>
        {trip.title}
      </P>
      <P color={theme.muted} style={tiny(11, 600)}>
        {trip.period}
      </P>
      {trip.withText ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AvatarStack people={trip.people} size={22} ringColor={theme.bg} label={trip.withText} />
          <View style={{ flex: 1 }}>
            <P color={theme.fg} style={tiny(11, 700)}>
              {trip.withText}
            </P>
          </View>
        </View>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          paddingTop: 4,
          borderTopWidth: 1,
          borderTopColor: theme.line,
        }}
      >
        {trip.stats.map((s) => (
          <View key={s.l} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
            <P color={theme.fg} style={{ ...big(15, 20), letterSpacing: 0 }}>
              {s.n}
            </P>
            <P color={theme.muted} style={tiny(10, 600)}>
              {s.l}
            </P>
          </View>
        ))}
      </View>
    </View>
  );
}

function RetroBody({ theme, content, labels }: BodyProps) {
  const trip = content.trip;
  const [p0, p1, p2] = trip.collage;
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <Overline color={theme.accent}>{labels.retroOverline}</Overline>
      <P lines={2} color={theme.fg} style={big(24, 26)}>
        {trip.title}
      </P>
      <View style={{ flex: 1, minHeight: 0, flexDirection: 'row', gap: 4 }}>
        <Photo uri={p0} tint={palette.linha} radius={12} width={0} style={{ flex: 1.3 }} />
        <View style={{ flex: 1, gap: 4 }}>
          <Photo uri={p1} tint={palette.coral300} radius={12} style={{ flex: 1 }} />
          <Photo uri={p2} tint={palette.linha} radius={12} style={{ flex: 1 }} />
        </View>
      </View>
      {trip.best ? (
        <Card theme={theme}>
          <Icon name="star" weight="fill" size={16} color={theme.pin} />
          <View style={{ flex: 1 }}>
            <P
              color={theme.muted}
              style={{ ...tiny(9, 700), letterSpacing: 1.1, textTransform: 'uppercase' }}
            >
              {labels.bestMoment}
            </P>
            <P lines={2} color={theme.fg} style={tiny(12, 700)}>
              {trip.best}
            </P>
          </View>
        </Card>
      ) : null}
    </View>
  );
}

function Card({ theme, children }: { theme: PreviewTheme; children: ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: theme.card,
      }}
    >
      {children}
    </View>
  );
}

function RoteiroBody({ theme, content, labels }: BodyProps) {
  const rot = content.roteiro;
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <Photo uri={rot.img} tint={palette.linha} radius={12} height="30%" />
      <Overline color={theme.accent}>{labels.nextTrip}</Overline>
      <P lines={2} color={theme.fg} style={big(22, 25)}>
        {rot.title}
      </P>
      <P color={theme.muted} style={tiny(11, 600)}>
        {rot.meta}
      </P>
      <View style={{ flex: 1, minHeight: 0, overflow: 'hidden', gap: 4 }}>
        {rot.days.map((d) => (
          <View
            key={d.n}
            testID="share-preview-day"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 6,
              paddingHorizontal: 8,
              borderRadius: 8,
              backgroundColor: theme.card,
            }}
          >
            <P color={theme.accent} style={{ ...tiny(10, 800), width: 34 }}>
              {d.n}
            </P>
            <View style={{ flex: 1 }}>
              <P color={theme.fg} style={tiny(11, 600)}>
                {d.label}
              </P>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function AchBody({ theme, content, labels }: BodyProps) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: theme.pin,
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0px 0px 0px 10px ${theme.card}`,
        }}
      >
        <Icon name={content.ach.icon} size={46} color={theme.onPin} />
      </View>
      <Overline color={theme.accent}>{labels.achOverline}</Overline>
      <P lines={2} align="center" color={theme.fg} style={{ ...big(28, 30), letterSpacing: -0.56 }}>
        {content.ach.title}
      </P>
      <P align="center" color={theme.muted} style={tiny(12, 600)}>
        {content.ach.meta}
      </P>
    </View>
  );
}
