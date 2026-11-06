import type { Photo, PhotoFile, TripRow } from '@worlo/db';
import { countryAt } from '@worlo/ui';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useSyncExternalStore } from 'react';
import { useSync } from '@/features/sync/SyncProvider';
import { supabase } from '@/lib/supabase';
import { getCurrentUserId, repos } from './repositories';
import { useQuery } from './useQuery';

/**
 * Photos: picked files land in the app's documents folder and in SQLite
 * (`repos.photos.add`: metadata synced, file pending upload). A single uploader
 * (`uploads`, mounted by `PhotoUploader`) sends pending files to the private
 * `photos` bucket while online. Screens show a photo from this device's copy
 * when there is one, otherwise from a short-lived signed URL.
 */

export const PHOTOS_BUCKET = 'photos';
/** Signed URLs live 1h; we refresh them 5 min before. */
export const SIGNED_URL_TTL_S = 3600;
const SIGNED_URL_MARGIN_MS = 5 * 60_000;

type StorageClient = NonNullable<typeof supabase>['storage'];
type Bucket = ReturnType<StorageClient['from']>;

/** What the app needs of the Storage client (the real one is `supabase.storage`). */
export type PhotoStorage = { from(bucket: string): Pick<Bucket, 'upload' | 'createSignedUrls'> };

export const photoStorage = (): PhotoStorage | null => supabase?.storage ?? null;

// ── Reads ────────────────────────────────────────────────────────────────────

/** What I can show: my photos (any state) and other members' uploaded ones. */
export const isVisible = (photo: Photo, me = getCurrentUserId()) =>
  photo.userId === me || photo.uploaded;

/** All my photos, newest first (Perfil › Fotos). */
export function useMyPhotos(): Photo[] {
  return useQuery(() => {
    const me = getCurrentUserId();
    return repos.photos.list().filter((p) => p.userId === me);
  }, []);
}

/** Every photo I can show (mine + members' uploaded ones), newest first. */
export function useVisiblePhotos(): Photo[] {
  return useQuery(() => repos.photos.list().filter((p) => isVisible(p)), []);
}

/** A trip's photos: mine + the other members' uploaded ones. */
export function useTripPhotos(tripId: string | undefined): Photo[] {
  return useQuery(
    () => (tripId ? repos.photos.list({ tripId }).filter((p) => isVisible(p)) : []),
    [tripId],
  );
}

/** Real photo count when there are photos, else the trip's legacy number. */
export const tripPhotoCount = (trip: { photos: number }, photos: readonly Photo[]) =>
  photos.length > 0 ? photos.length : trip.photos;

export type UploadStatus = PhotoFile['state'];

/** This device's files, by photo id (one read for a whole grid). */
export function usePhotoFiles(): Map<string, PhotoFile> {
  return useQuery(() => {
    const ids = repos.photos.list().map((p) => p.id);
    const map = new Map<string, PhotoFile>();
    for (const id of ids) {
      const file = repos.photos.file(id);
      if (file) map.set(id, file);
    }
    return map;
  }, []);
}

// ── Local files ──────────────────────────────────────────────────────────────

const photosDir = () => new Directory(Paths.document, 'photos');

/** The picked file still exists (the OS or the user may have cleared it). */
export function fileExists(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    // No native module (tests, web): trust the database.
    return true;
  }
}

/** This device's copy of a photo, if it has one. */
export function localUriOf(photoId: string): string | null {
  const file = repos.photos.file(photoId);
  return file && fileExists(file.localUri) ? file.localUri : null;
}

export function readFileBytes(uri: string): Promise<Uint8Array> {
  return new File(uri).bytes();
}

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  webp: 'image/webp',
};

/** The file's real type: the picker re-encodes (quality < 1), so trust the extension first. */
export function mimeOf(uri: string, reported?: string | null): string {
  const ext = /\.([a-z0-9]+)(?:\?.*)?$/i.exec(uri)?.[1]?.toLowerCase();
  return (ext && EXT_MIME[ext]) || reported || 'image/jpeg';
}

/** Copies a picked file into documents/photos so it survives until (and after) the upload. */
function keepCopy(uri: string, mimeType: string): string {
  const dir = photosDir();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const target = new File(dir, name);
  new File(uri).copy(target);
  return target.uri;
}

// ── EXIF ─────────────────────────────────────────────────────────────────────

type Exif = Record<string, unknown>;
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** "2025:07:14 18:32:10" (EXIF) → ISO, read as local time of the device. */
export function exifDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m.map(Number) as number[];
  const date = new Date(y as number, (mo as number) - 1, d, h, mi, s);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Date and GPS from the picker's EXIF. Android flattens the tags (GPSLatitude +
 * GPSLatitudeRef); iOS nests them under "{GPS}" (Latitude + LatitudeRef).
 */
export function readExif(exif: Exif | null | undefined): {
  takenAt: string | null;
  lat: number | null;
  lng: number | null;
} {
  if (!exif) return { takenAt: null, lat: null, lng: null };
  const gps = (exif['{GPS}'] as Exif | undefined) ?? {};
  const exifDict = (exif['{Exif}'] as Exif | undefined) ?? {};
  const takenAt =
    exifDate(exif.DateTimeOriginal) ??
    exifDate(exifDict.DateTimeOriginal) ??
    exifDate(exif.DateTime) ??
    null;
  const signed = (value: number | null, ref: unknown, negative: string) =>
    value === null ? null : ref === negative ? -Math.abs(value) : value;
  const lat = signed(
    num(exif.GPSLatitude) ?? num(gps.Latitude),
    exif.GPSLatitudeRef ?? gps.LatitudeRef,
    'S',
  );
  const lng = signed(
    num(exif.GPSLongitude) ?? num(gps.Longitude),
    exif.GPSLongitudeRef ?? gps.LongitudeRef,
    'W',
  );
  // 0,0 is what some cameras write when they have no fix.
  if (lat === 0 && lng === 0) return { takenAt, lat: null, lng: null };
  return { takenAt, lat, lng };
}

// ── Picking ──────────────────────────────────────────────────────────────────

export type PickResult =
  | { status: 'added'; photos: Photo[] /** Put in a trip by GPS. */; organized: number }
  | { status: 'canceled' }
  | { status: 'denied' };

/** Adds picked assets: a kept copy + the metadata row (pending upload). */
export function importAssets(
  assets: readonly ImagePicker.ImagePickerAsset[],
  tripId: string | null = null,
): Photo[] {
  const added = assets
    .filter((a) => !a.type || a.type === 'image')
    .map((asset) => {
      const mimeType = mimeOf(asset.uri, asset.mimeType);
      const localUri = keepCopy(asset.uri, mimeType);
      const { takenAt, lat, lng } = readExif(asset.exif);
      return repos.photos.add({
        localUri,
        mimeType,
        tripId,
        width: asset.width || null,
        height: asset.height || null,
        takenAt,
        lat,
        lng,
      });
    });
  startBatch(added.map((p) => p.id));
  return added;
}

/**
 * Gallery (several at once) or camera. The gallery uses the system picker,
 * which needs no permission; the camera asks with the copy in app.config.ts.
 */
export async function pickPhotos({
  tripId = null,
  source = 'library',
  multiple = true,
}: {
  tripId?: string | null;
  source?: 'library' | 'camera';
  multiple?: boolean;
} = {}): Promise<PickResult> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    exif: true,
    quality: 0.85,
  };
  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    result = await ImagePicker.launchImageLibraryAsync({
      ...options,
      ...(multiple
        ? { allowsMultipleSelection: true, orderedSelection: true, selectionLimit: 0 }
        : {}),
    });
  }
  if (result.canceled || result.assets.length === 0) return { status: 'canceled' };
  const photos = importAssets(result.assets, tripId);
  const organized = tripId ? 0 : autoOrganizeIfOn(photos.map((p) => p.id));
  return { status: 'added', photos, organized };
}

/** Travel mode: the camera; one photo from the gallery where there is no camera (simulator). */
export async function takePhoto({ tripId = null }: { tripId?: string | null } = {}) {
  try {
    return await pickPhotos({ tripId, source: 'camera' });
  } catch {
    return pickPhotos({ tripId, source: 'library', multiple: false });
  }
}

// ── Organizing ───────────────────────────────────────────────────────────────

const yearOf = (iso: string | null) => (iso ? String(new Date(iso).getFullYear()) : null);

/**
 * The trip a photo belongs to by location: the trip in the photo's country
 * (point in country on the globe shapes), the one of the same year first.
 */
export function tripForPhoto(photo: Photo, trips: readonly TripRow[]): TripRow | null {
  if (photo.lat === null || photo.lng === null) return null;
  const country = countryAt([photo.lng, photo.lat]);
  if (!country) return null;
  const inCountry = trips.filter((t) => t.countryIso === country.id);
  const year = yearOf(photo.takenAt);
  return inCountry.find((t) => year && t.year === year) ?? inCountry[0] ?? null;
}

/** Trip suggested for photos without one: same year as most of them ("Mesma data"). */
export function suggestedTrip(photos: readonly Photo[], trips: readonly TripRow[]) {
  const counts = new Map<string, number>();
  for (const p of photos) {
    const y = yearOf(p.takenAt);
    if (y) counts.set(y, (counts.get(y) ?? 0) + 1);
  }
  const [year] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  return year ? (trips.find((t) => t.year === year) ?? null) : null;
}

/** Puts loose photos with GPS in their trip. Returns how many moved. */
export function autoOrganize(photoIds?: readonly string[]): number {
  const me = getCurrentUserId();
  const trips = repos.trips.list();
  const loose = repos.photos
    .list({ tripId: null })
    .filter((p) => p.userId === me && (!photoIds || photoIds.includes(p.id)));
  let moved = 0;
  for (const photo of loose) {
    const trip = tripForPhoto(photo, trips);
    if (trip) {
      repos.photos.assign(photo.id, trip.id);
      moved++;
    }
  }
  return moved;
}

function autoOrganizeIfOn(photoIds: readonly string[]) {
  return (repos.profile.get()?.autoOrganizePhotos ?? true) ? autoOrganize(photoIds) : 0;
}

/** Ending travel mode: the loose photos taken during it go to the trip it created. */
export function assignLivePhotos(log: readonly { photo?: string }[], tripId: string) {
  const me = getCurrentUserId();
  for (const entry of log) {
    const photo =
      entry.photo && !entry.photo.includes('://') ? repos.photos.get(entry.photo) : null;
    if (photo && !photo.deletedAt && !photo.tripId && photo.userId === me) {
      repos.photos.assign(photo.id, tripId);
    }
  }
}

/** A photo's caption (empty clears it). */
export function setPhotoCaption(photoId: string, caption: string) {
  repos.photos.setCaption(photoId, caption);
}

/** Moves photos to a trip (or back to "Sem viagem" with null). */
export function assignPhotos(photoIds: readonly string[], tripId: string | null) {
  for (const id of photoIds) repos.photos.assign(id, tripId);
}

// ── Import batch (the "Importando…" card) ────────────────────────────────────

let batch: readonly string[] = [];
const batchListeners = new Set<() => void>();

/** A new pick starts a batch, unless the previous one is still uploading. */
function startBatch(ids: readonly string[]) {
  if (ids.length === 0) return;
  const unfinished = batch.some((id) => {
    const state = repos.photos.file(id)?.state;
    return state && state !== 'done';
  });
  batch = unfinished ? [...batch, ...ids] : [...ids];
  for (const l of batchListeners) l();
}

/** Photo ids picked in this session's latest import (empty after a restart). */
export function useImportBatch(): readonly string[] {
  return useSyncExternalStore(
    (l) => {
      batchListeners.add(l);
      return () => batchListeners.delete(l);
    },
    () => batch,
  );
}

export function resetImportBatch() {
  batch = [];
  for (const l of batchListeners) l();
}

// ── Uploads ──────────────────────────────────────────────────────────────────

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Sends files to Storage one at a time, in the order they were picked:
 * uploading → bytes → upload (upsert, so a retry after a half-done try is safe)
 * → uploaded. A failure is recorded and the next file goes on.
 */
export async function uploadPending({
  storage,
  files = repos.photos.pendingUploads(),
  isOnline = () => true,
  readBytes = readFileBytes,
}: {
  storage: PhotoStorage;
  files?: readonly PhotoFile[];
  isOnline?: () => boolean;
  readBytes?: (uri: string) => Promise<Uint8Array>;
}): Promise<{ uploaded: number; failed: number }> {
  let uploaded = 0;
  let failed = 0;
  for (const file of files) {
    if (!isOnline()) break;
    const photo = repos.photos.get(file.photoId);
    if (!photo || photo.deletedAt) {
      repos.photos.setUploadState(file.photoId, 'failed', 'removed');
      continue;
    }
    repos.photos.setUploadState(file.photoId, 'uploading');
    try {
      const bytes = await readBytes(file.localUri);
      const { error } = await storage
        .from(PHOTOS_BUCKET)
        .upload(photo.storagePath, bytes, { contentType: file.mimeType, upsert: true });
      if (error) throw new Error(error.message);
      // The local copy stays as this device's cache: no signed URL, works offline.
      repos.photos.markUploaded(file.photoId);
      uploaded++;
    } catch (e) {
      repos.photos.setUploadState(file.photoId, 'failed', errorMessage(e));
      failed++;
    }
  }
  return { uploaded, failed };
}

/** Wait before retrying a file that failed `attempts` times: 2s, 4s, 8s… up to 1 min. */
export const retryDelay = (attempts: number) =>
  Math.min(60_000, 2_000 * 2 ** Math.max(0, attempts - 1));

/** Files never tried yet (a fresh pick), in order. */
const freshFiles = () => repos.photos.pendingUploads().filter((f) => f.state === 'pending');

/** Failed files the user asks to retry now, even past the automatic cap. */
const failedFiles = (photoIds?: readonly string[]) =>
  (photoIds ?? repos.photos.list().map((p) => p.id))
    .map((id) => repos.photos.file(id))
    .filter((f): f is PhotoFile => f?.state === 'failed' && f.lastError !== 'removed');

/**
 * The upload queue, one run at a time:
 * - `resume()` (app start, reconnect) and the backoff timer send everything
 *   pending, failed ones included (the repository stops after 5 attempts);
 * - `kick()` (a new pick) sends only files never tried, so it can't skip the
 *   backoff of failed ones;
 * - a run that leaves failures schedules the next try (2s, 4s… 1 min);
 * - offline: nothing runs and the timer is cancelled.
 */
export function createUploader({
  getStorage = photoStorage,
  readBytes = readFileBytes,
}: {
  getStorage?: () => PhotoStorage | null;
  readBytes?: (uri: string) => Promise<Uint8Array>;
} = {}) {
  let online = false;
  let running: Promise<void> | null = null;
  let next: (() => PhotoFile[])[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const scheduleRetry = () => {
    const left = repos.photos.pendingUploads().filter((f) => f.state === 'failed');
    if (!online || left.length === 0 || timer) return;
    const attempts = Math.max(...left.map((f) => f.attempts));
    timer = setTimeout(() => {
      timer = null;
      void run(() => repos.photos.pendingUploads());
    }, retryDelay(attempts));
  };

  const run = (select: () => PhotoFile[]): Promise<void> => {
    const storage = getStorage();
    if (!online || !storage) return Promise.resolve();
    if (running) {
      next.push(select);
      return running;
    }
    running = (async () => {
      try {
        await uploadPending({ storage, files: select(), isOnline: () => online, readBytes });
      } finally {
        running = null;
      }
      const queued = next;
      next = [];
      if (queued.length > 0) {
        await run(() => {
          const byId = new Map<string, PhotoFile>();
          for (const pick of queued) for (const f of pick()) byId.set(f.photoId, f);
          return [...byId.values()];
        });
        return;
      }
      scheduleRetry();
    })();
    return running;
  };

  return {
    setOnline(value: boolean) {
      const back = value && !online;
      online = value;
      if (!online) clearTimer();
      if (back) void run(() => repos.photos.pendingUploads());
    },
    /** Everything pending, failed ones included (start / reconnect). */
    resume: () => run(() => repos.photos.pendingUploads()),
    /** New picks only. */
    kick: () => run(freshFiles),
    /** "Tentar de novo": these (or all) failed files now. */
    retry: (photoIds?: readonly string[]) => run(() => failedFiles(photoIds)),
    /** A run killed with the app leaves files "uploading": put them back in the queue. */
    recover() {
      for (const p of repos.photos.list()) {
        if (repos.photos.file(p.id)?.state === 'uploading') {
          repos.photos.setUploadState(p.id, 'failed', 'interrupted');
        }
      }
    },
    stop() {
      online = false;
      next = [];
      clearTimer();
    },
    /** Waits for the current run (tests). */
    idle: () => running ?? Promise.resolve(),
  };
}

export const uploads = createUploader();

// ── Showing ──────────────────────────────────────────────────────────────────

/**
 * Signed URLs of the private bucket, requested in batches (all tiles that
 * mount in the same tick go in one `createSignedUrls`) and kept in memory
 * until shortly before they expire.
 */
export function createSignedUrlCache({
  getStorage = photoStorage,
  now = Date.now,
}: {
  getStorage?: () => PhotoStorage | null;
  now?: () => number;
} = {}) {
  const urls = new Map<string, { url: string; expiresAt: number }>();
  const queued = new Set<string>();
  const inFlight = new Set<string>();
  const listeners = new Set<() => void>();
  let version = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const emit = () => {
    version++;
    for (const l of listeners) l();
  };

  const get = (path: string) => {
    const entry = urls.get(path);
    return entry && entry.expiresAt - SIGNED_URL_MARGIN_MS > now() ? entry.url : null;
  };

  const flush = async () => {
    timer = null;
    const storage = getStorage();
    const paths = [...queued];
    queued.clear();
    if (!storage || paths.length === 0) return;
    for (const p of paths) inFlight.add(p);
    try {
      const { data } = await storage.from(PHOTOS_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_S);
      const expiresAt = now() + SIGNED_URL_TTL_S * 1000;
      for (const item of data ?? []) {
        if (item.path && item.signedUrl && !item.error) {
          urls.set(item.path, { url: item.signedUrl, expiresAt });
        }
      }
    } catch {
      // Next mount / reconnect asks again.
    } finally {
      for (const p of paths) inFlight.delete(p);
      emit();
    }
  };

  return {
    get,
    request(path: string) {
      if (get(path) || queued.has(path) || inFlight.has(path)) return;
      queued.add(path);
      if (!timer) timer = setTimeout(() => void flush(), 0);
    },
    flush,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    version: () => version,
    clear() {
      urls.clear();
      queued.clear();
      emit();
    },
  };
}

export const signedUrls = createSignedUrlCache();

/**
 * Where to load a photo from: this device's copy, else a signed URL (online,
 * uploaded photos only). Null = show the placeholder tile.
 */
export function usePhotoUri(photo: Photo | undefined | null): string | null {
  const { online } = useSync();
  useSyncExternalStore(signedUrls.subscribe, signedUrls.version);
  const local = useQuery(() => (photo ? localUriOf(photo.id) : null), [photo?.id]);
  const path = photo?.storagePath;
  const remote = !local && photo?.uploaded && path ? signedUrls.get(path) : null;
  const needsUrl = Boolean(!local && photo?.uploaded && path && !remote && online);
  useEffect(() => {
    if (needsUrl && path) signedUrls.request(path);
  }, [needsUrl, path]);
  return local ?? remote;
}

/** A live log entry's photo: a URL (legacy/demo) or a photo id. */
export function usePhotoRef(ref: string | undefined): string | null {
  const isUrl = Boolean(ref?.includes('://'));
  const photo = useQuery(() => (ref && !isUrl ? repos.photos.get(ref) : undefined), [ref, isUrl]);
  const uri = usePhotoUri(photo);
  return isUrl ? (ref ?? null) : uri;
}
