import type { Photo as PhotoRow } from '@worlo/db';
import { useTranslation } from '@worlo/i18n';
import { alpha, colors, Icon, Photo, type PhotoProps } from '@worlo/ui';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { type UploadStatus, uploads, usePhotoUri } from '@/data/photos';

type Props = Omit<PhotoProps, 'uri' | 'children'> & {
  photo: PhotoRow;
  /** Upload state when the file is on this device (badge on the tile). */
  status?: UploadStatus | null;
  children?: ReactNode;
};

/** A real photo: this device's copy or a signed URL; placeholder tint otherwise. */
export function PhotoTile({ photo, status, children, testID, ...rest }: Props) {
  const { t } = useTranslation();
  const uri = usePhotoUri(photo);
  const badge = status && status !== 'done' ? status : null;
  return (
    <Photo uri={uri} testID={testID} {...rest}>
      {children}
      {badge ? (
        <Pressable
          testID={testID ? `${testID}-${badge}` : undefined}
          accessibilityRole={badge === 'failed' ? 'button' : 'image'}
          accessibilityLabel={t(`profile.photos.tile.${badge}`)}
          disabled={badge !== 'failed'}
          onPress={() => void uploads.retry([photo.id])}
          hitSlop={6}
          style={{
            position: 'absolute',
            right: 4,
            bottom: 4,
            width: 22,
            height: 22,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: badge === 'failed' ? colors.error : alpha.overlay,
          }}
        >
          <View style={{ opacity: badge === 'uploading' ? 0.7 : 1 }}>
            <Icon
              name={badge === 'failed' ? 'arrow-clockwise' : 'upload-simple'}
              size={12}
              color={colors.textInverse}
            />
          </View>
        </Pressable>
      ) : null}
    </Photo>
  );
}
