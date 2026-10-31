/**
 * Test doubles for photos (Jest only): an in-memory expo-file-system, picker
 * assets and a fake Storage bucket. Use from `jest.mock` factories:
 *
 *   jest.mock('expo-file-system', () => require('@/features/photos/testing').fileSystemMock());
 */
import type { Photo } from '@worlo/db';
import { schema } from '@worlo/db';
import type { ImagePickerAsset } from 'expo-image-picker';
import { dataEvents } from '@/data/events';
import type { PhotoStorage } from '@/data/photos';
import { db } from '@/lib/database';

/** uri → bytes of the fake file system (shared by every `fileSystemMock()`). */
export const fakeFiles = new Map<string, Uint8Array>();

export function fileSystemMock() {
  const join = (parts: unknown[]) =>
    parts.map((p) => (typeof p === 'string' ? p : (p as { uri: string }).uri)).join('/');
  class File {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get exists() {
      return fakeFiles.has(this.uri);
    }
    copy(target: { uri: string }) {
      const bytes = fakeFiles.get(this.uri);
      if (!bytes) throw new Error(`No such file: ${this.uri}`);
      fakeFiles.set(target.uri, bytes);
    }
    bytes() {
      const bytes = fakeFiles.get(this.uri);
      return bytes ? Promise.resolve(bytes) : Promise.reject(new Error('No such file'));
    }
    delete() {
      fakeFiles.delete(this.uri);
    }
  }
  class Directory {
    uri: string;
    exists = true;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    create() {}
  }
  return { File, Directory, Paths: { document: { uri: 'file:///docs' } } };
}

/** A picked image (and its file in the fake file system). */
export function asset(name: string, exif: Record<string, unknown> | null = null): ImagePickerAsset {
  const uri = `file:///picker/${name}.jpg`;
  fakeFiles.set(uri, new Uint8Array([name.length, 1, 2, 3]));
  return { uri, width: 4032, height: 3024, type: 'image', mimeType: 'image/jpeg', exif };
}

/** Android-style EXIF with a date and GPS. */
export const exif = (date: string, lat: number, lng: number) => ({
  DateTimeOriginal: date,
  GPSLatitude: Math.abs(lat),
  GPSLatitudeRef: lat < 0 ? 'S' : 'N',
  GPSLongitude: Math.abs(lng),
  GPSLongitudeRef: lng < 0 ? 'W' : 'E',
});

/** A Storage bucket that records calls; `fail` makes uploads of those paths fail. */
export function fakeStorage({ fail = new Set<string>() }: { fail?: Set<string> } = {}) {
  const upload = jest.fn(async (path: string, _body: unknown, _options: unknown) =>
    fail.has(path)
      ? { data: null, error: { message: 'Network request failed' } }
      : { data: { path }, error: null },
  );
  const createSignedUrls = jest.fn(async (paths: string[], _expiresIn: number) => ({
    data: paths.map((path) => ({ path, signedUrl: `https://signed.test/${path}`, error: null })),
    error: null,
  }));
  const from = jest.fn(() => ({ upload, createSignedUrls }));
  return { storage: { from } as unknown as PhotoStorage, upload, createSignedUrls, from };
}

/** Puts a photo row as a sync pull would (someone else's photo, or another device's). */
export function insertRemotePhoto(row: Partial<Photo> & Pick<Photo, 'id' | 'userId'>) {
  const stamp = '2026-01-01T00:00:00.000Z';
  db.insert(schema.photos)
    .values({
      createdAt: stamp,
      updatedAt: stamp,
      deletedAt: null,
      tripId: null,
      storagePath: `${row.userId}/${row.id}.jpg`,
      width: null,
      height: null,
      takenAt: null,
      lat: null,
      lng: null,
      caption: null,
      uploaded: true,
      ...row,
    })
    .run();
  dataEvents.emit();
}
