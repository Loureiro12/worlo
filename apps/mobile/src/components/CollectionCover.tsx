import { palette } from '@worlo/ui';
import { Image } from 'expo-image';
import { View } from 'react-native';
import { img } from '@/lib/images';

const tints = [palette.coral100, palette.coral300, palette.linha, palette.coral100];

/** 2×2 mosaic of the first items of a collection (Salvos, Coleções, sheet). */
export function CollectionCover({
  ids,
  size,
  radius = 10,
}: {
  ids: readonly string[];
  size: number;
  radius?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: 'hidden',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 3,
        backgroundColor: palette.linha,
      }}
    >
      {[0, 1, 2, 3].map((i) => {
        const id = ids[i];
        const tile = (size - 3) / 2;
        return (
          <View key={i} style={{ width: tile, height: tile, backgroundColor: tints[i] }}>
            {id ? (
              <Image
                source={{ uri: img(id, 120, 120) }}
                style={{ width: tile, height: tile }}
                contentFit="cover"
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
