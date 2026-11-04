import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import type { ComponentRef, RefObject } from 'react';
import { PixelRatio, type View } from 'react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';

/** Width of the exported picture, in real pixels (what Stories and feeds expect). */
export const EXPORT_WIDTH = 1080;

type Size = { width: number; height: number };

/** The view holding the picture. */
export type PictureRef = RefObject<ComponentRef<typeof View> | null>;

/** Renders the preview to a temporary PNG. `captureRef` sizes are divided by the pixel ratio. */
function capture(view: PictureRef, size: Size): Promise<string> {
  const ratio = PixelRatio.get();
  return captureRef(view, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
    width: EXPORT_WIDTH / ratio,
    height: Math.round((EXPORT_WIDTH * size.height) / size.width) / ratio,
  });
}

/** Opens the system share sheet with the picture. */
export async function shareImage(view: PictureRef, size: Size): Promise<void> {
  const uri = await capture(view, size);
  try {
    await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
  } finally {
    releaseCapture(uri);
  }
}

/** Saves the picture to the gallery, asking only for write access. */
export async function saveImage(view: PictureRef, size: Size): Promise<'saved' | 'denied'> {
  const { granted } = await requestPermissionsAsync(true, []);
  if (!granted) return 'denied';
  const uri = await capture(view, size);
  try {
    await Asset.create(uri);
    return 'saved';
  } finally {
    releaseCapture(uri);
  }
}
