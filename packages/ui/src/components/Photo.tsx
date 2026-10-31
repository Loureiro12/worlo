import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { palette } from '../tokens/colors';
import { radius as radii } from '../tokens/layout';
import { Text } from './Text';

export type PhotoProps = {
  uri?: string | null;
  /** Placeholder color while the image loads (or when there is none). */
  tint?: string;
  width?: ViewStyle['width'];
  height?: ViewStyle['height'];
  aspectRatio?: number;
  radius?: number;
  /** Top scrim (README → "Scrim no topo de fotos"). */
  scrim?: boolean;
  /** Bottom fade to a color (Boas-vindas, retro). */
  fadeTo?: string;
  children?: ReactNode;
  style?: ViewStyle;
  /** Decorative by default. */
  accessibilityLabel?: string;
  testID?: string;
};

export function Photo({
  uri,
  tint = palette.coral100,
  width = '100%',
  height,
  aspectRatio,
  radius = radii.r16,
  scrim = false,
  fadeTo,
  children,
  style,
  accessibilityLabel,
  testID,
}: PhotoProps) {
  return (
    <View
      testID={testID}
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          width,
          height,
          aspectRatio,
          borderRadius: radius,
          backgroundColor: tint,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
          transition={200}
        />
      ) : null}
      {scrim && (
        <LinearGradient
          colors={['rgba(19,19,17,0.5)', 'rgba(19,19,17,0)']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120 }}
          pointerEvents="none"
        />
      )}
      {fadeTo && (
        <LinearGradient
          colors={['transparent', fadeTo]}
          locations={[0.45, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          pointerEvents="none"
        />
      )}
      {children}
    </View>
  );
}

/** Trip mosaic: 2fr/1fr × 2 rows, gap 4, height 176, third tile shows "+N". */
export function Mosaic({
  photos,
  extra,
  height = 176,
  radius = radii.r16,
}: {
  photos: readonly { uri?: string; tint?: string }[];
  extra?: number;
  height?: number;
  radius?: number;
}) {
  const [a, b] = photos;
  return (
    <View
      style={{ height, flexDirection: 'row', gap: 4, borderRadius: radius, overflow: 'hidden' }}
    >
      <Photo uri={a?.uri} tint={a?.tint} radius={0} height="100%" width={0} style={{ flex: 2 }} />
      <View style={{ flex: 1, gap: 4 }}>
        <Photo
          uri={b?.uri}
          tint={b?.tint ?? palette.coral300}
          radius={0}
          width="100%"
          style={{ flex: 1 }}
        />
        <View
          style={{
            flex: 1,
            backgroundColor: palette.cinza600,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {extra ? (
            <Text variant="h3" tone="inverse">
              {`+${extra}`}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
