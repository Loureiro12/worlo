import * as ImagePicker from 'expo-image-picker';
import { communityApi } from './communityApi';
import { updateMe } from './profile';

export type AvatarResult = 'updated' | 'canceled' | 'denied' | 'offline';

/**
 * Foto do perfil: camera or gallery → square crop → public bucket (avatars are
 * shown to other people, so they live with the post photos) → `profiles.avatar_url`.
 */
export async function changeAvatar(source: 'camera' | 'library'): Promise<AvatarResult> {
  if (!communityApi.isOnline()) return 'offline';
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  };
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return 'denied';
  }
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return 'canceled';
  const path = await communityApi.uploadPhoto(asset.uri, asset.mimeType ?? undefined);
  updateMe({ avatar: communityApi.photoUrl(path) });
  return 'updated';
}
