import * as ImagePicker from 'expo-image-picker';
import { communityApi } from './communityApi';
import { updateMe } from './profile';
import { world } from './world';

export type PickedImage =
  | { status: 'picked'; url: string }
  | { status: 'canceled' | 'denied' | 'offline' };

/**
 * Camera or gallery → crop → public bucket (`post-photos/<me>/…`): images other
 * people see (profile photo, covers). Resolves the public URL.
 */
export async function pickAndUpload(
  source: 'camera' | 'library',
  aspect: [number, number],
): Promise<PickedImage> {
  if (!communityApi.isOnline()) return { status: 'offline' };
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 0.8,
  };
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };
  }
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return { status: 'canceled' };
  const path = await communityApi.uploadPhoto(asset.uri, asset.mimeType ?? undefined);
  return { status: 'picked', url: communityApi.photoUrl(path) };
}

export type AvatarResult = 'updated' | 'canceled' | 'denied' | 'offline';

/** Foto do perfil: square crop. */
export async function changeAvatar(source: 'camera' | 'library'): Promise<AvatarResult> {
  const result = await pickAndUpload(source, [1, 1]);
  if (result.status !== 'picked') return result.status;
  updateMe({ avatar: result.url });
  return 'updated';
}

/** Capa de um "Quero ir": from the gallery, wide crop. */
export async function changeWishCover(wishId: string): Promise<AvatarResult> {
  const result = await pickAndUpload('library', [16, 9]);
  if (result.status !== 'picked') return result.status;
  world.setFutureCover(wishId, result.url);
  return 'updated';
}
