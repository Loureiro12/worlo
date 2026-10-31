import * as ImagePicker from 'expo-image-picker';
import { asset, exif, fakeFiles, fakeStorage } from '@/features/photos/testing';
import { DEMO_USER, demoId } from '@/mocks/demo';
import {
  autoOrganize,
  createSignedUrlCache,
  createUploader,
  pickPhotos,
  readExif,
  resetImportBatch,
  retryDelay,
  SIGNED_URL_TTL_S,
  takePhoto,
  uploadPending,
} from './photos';
import { updatePrefs } from './profile';
import { repos, setCurrentUserId } from './repositories';

jest.mock('expo-file-system', () => require('@/features/photos/testing').fileSystemMock());
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));

const picker = jest.mocked(ImagePicker);
const LISBOA = { lat: 38.72, lng: -9.14 };
const PARIS = { lat: 48.86, lng: 2.35 };

beforeEach(() => {
  setCurrentUserId(DEMO_USER.id); // AuthProvider's job in the app
  jest.clearAllMocks();
  fakeFiles.clear();
  resetImportBatch();
});

const picked = (...assets: ImagePicker.ImagePickerAsset[]) =>
  picker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: false, assets });

describe('picking', () => {
  it('copies each picked file, adds the rows and leaves them pending upload', async () => {
    picked(
      asset('a', exif('2024:05:02 10:00:00', LISBOA.lat, LISBOA.lng)),
      asset('b', { DateTimeOriginal: '2023:09:10 18:30:00' }),
    );
    const result = await pickPhotos();
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        allowsMultipleSelection: true,
        exif: true,
        mediaTypes: ['images'],
      }),
    );
    if (result.status !== 'added') throw new Error(result.status);
    expect(result.photos).toHaveLength(2);
    const [a, b] = result.photos;
    expect(a).toMatchObject({ userId: DEMO_USER.id, lat: 38.72, lng: -9.14, uploaded: false });
    expect(a?.storagePath).toBe(`${DEMO_USER.id}/${a?.id}.jpg`);
    expect(b).toMatchObject({ lat: null, lng: null, tripId: null });
    // Kept copies in documents/photos, not the picker's temporary files.
    const files = repos.photos.pendingUploads();
    expect(files.map((f) => f.photoId)).toEqual([a?.id, b?.id]);
    for (const f of files) {
      expect(f.localUri).toMatch(/^file:\/\/\/docs\/photos\/.+\.jpg$/);
      expect(fakeFiles.has(f.localUri)).toBe(true);
    }
  });

  it('organizes by location when the preference is on (GPS → trip of that country)', async () => {
    picked(
      asset('lisboa', exif('2024:05:02 10:00:00', LISBOA.lat, LISBOA.lng)),
      asset('paris', exif('2023:04:01 12:00:00', PARIS.lat, PARIS.lng)),
      asset('sea', exif('2023:04:01 12:00:00', -20, -30)),
    );
    const result = await pickPhotos();
    if (result.status !== 'added') throw new Error(result.status);
    expect(result.organized).toBe(2);
    const [lisboa, paris, sea] = result.photos.map((p) => repos.photos.get(p.id));
    expect(lisboa?.tripId).toBe(demoId('trip:lisboa'));
    expect(paris?.tripId).toBe(demoId('trip:paris'));
    expect(sea?.tripId).toBeNull();
  });

  it('leaves photos loose when the preference is off, until asked', async () => {
    updatePrefs({ autoOrganizePhotos: false });
    picked(asset('lisboa', exif('2024:05:02 10:00:00', LISBOA.lat, LISBOA.lng)));
    const result = await pickPhotos();
    if (result.status !== 'added') throw new Error(result.status);
    expect(result.organized).toBe(0);
    expect(repos.photos.list({ tripId: null })).toHaveLength(1);
    expect(autoOrganize()).toBe(1);
    expect(repos.photos.list({ tripId: demoId('trip:lisboa') })).toHaveLength(1);
  });

  it('adds nothing when the picker is canceled', async () => {
    picker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: true, assets: null });
    expect(await pickPhotos()).toEqual({ status: 'canceled' });
    expect(repos.photos.list()).toHaveLength(0);
  });

  it('asks for the camera and stops when denied; falls back to the gallery without a camera', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValueOnce({ granted: false } as never);
    expect(await takePhoto()).toEqual({ status: 'denied' });
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();

    picker.requestCameraPermissionsAsync.mockResolvedValueOnce({ granted: true } as never);
    picker.launchCameraAsync.mockRejectedValueOnce(new Error('Camera not available'));
    picked(asset('fallback'));
    const result = await takePhoto({ tripId: demoId('trip:lisboa') });
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.not.objectContaining({ allowsMultipleSelection: true }),
    );
    if (result.status !== 'added') throw new Error(result.status);
    expect(result.photos[0]?.tripId).toBe(demoId('trip:lisboa'));
  });
});

describe('readExif', () => {
  it('reads Android flat tags and iOS {GPS} dictionaries', () => {
    expect(readExif(exif('2025:07:14 18:32:10', -27.6, -48.5))).toEqual({
      takenAt: new Date(2025, 6, 14, 18, 32, 10).toISOString(),
      lat: -27.6,
      lng: -48.5,
    });
    expect(
      readExif({
        '{Exif}': { DateTimeOriginal: '2024:01:02 03:04:05' },
        '{GPS}': { Latitude: 38.7, LatitudeRef: 'N', Longitude: 9.1, LongitudeRef: 'W' },
      }),
    ).toMatchObject({ lat: 38.7, lng: -9.1 });
    expect(readExif({ GPSLatitude: 0, GPSLongitude: 0 })).toMatchObject({ lat: null, lng: null });
    expect(readExif(null)).toEqual({ takenAt: null, lat: null, lng: null });
  });
});

describe('uploads', () => {
  const pickThree = async () => {
    picked(asset('one'), asset('two'), asset('three'));
    const result = await pickPhotos();
    if (result.status !== 'added') throw new Error(result.status);
    return result.photos;
  };

  it('uploads pending files in order, marks them uploaded and keeps the local copy', async () => {
    const photos = await pickThree();
    const { storage, upload, from } = fakeStorage();
    expect(await uploadPending({ storage })).toEqual({ uploaded: 3, failed: 0 });
    expect(from).toHaveBeenCalledWith('photos');
    expect(upload.mock.calls.map((c) => c[0])).toEqual(photos.map((p) => p.storagePath));
    expect(upload.mock.calls[0]?.[2]).toEqual({ contentType: 'image/jpeg', upsert: true });
    for (const p of photos) {
      expect(repos.photos.get(p.id)?.uploaded).toBe(true);
      const file = repos.photos.file(p.id);
      expect(file?.state).toBe('done');
      expect(fakeFiles.has(file?.localUri ?? '')).toBe(true);
    }
    expect(repos.photos.pendingUploads()).toHaveLength(0);
  });

  it('records a failure and goes on with the next file', async () => {
    const [one, two] = await pickThree();
    const { storage } = fakeStorage({ fail: new Set([two?.storagePath ?? '']) });
    expect(await uploadPending({ storage })).toEqual({ uploaded: 2, failed: 1 });
    expect(repos.photos.file(one?.id ?? '')?.state).toBe('done');
    expect(repos.photos.file(two?.id ?? '')).toMatchObject({
      state: 'failed',
      attempts: 1,
      lastError: 'Network request failed',
    });
    expect(repos.photos.get(two?.id ?? '')?.uploaded).toBe(false);
  });

  describe('queue', () => {
    beforeEach(() =>
      jest.useFakeTimers({ doNotFake: ['setImmediate', 'queueMicrotask', 'nextTick'] }),
    );
    afterEach(() => jest.useRealTimers());

    it('does nothing offline and resumes everything when back online', async () => {
      await pickThree();
      const { storage, upload } = fakeStorage();
      const uploader = createUploader({ getStorage: () => storage });
      await uploader.kick();
      expect(upload).not.toHaveBeenCalled();
      uploader.setOnline(true);
      await uploader.idle();
      expect(upload).toHaveBeenCalledTimes(3);
      uploader.stop();
    });

    it('retries failures with backoff and stops after 5 attempts', async () => {
      const [, two] = await pickThree();
      const path = two?.storagePath ?? '';
      const { storage, upload } = fakeStorage({ fail: new Set([path]) });
      const uploader = createUploader({ getStorage: () => storage });
      uploader.setOnline(true);
      await uploader.idle();
      const triesOf = () => upload.mock.calls.filter((c) => c[0] === path).length;
      expect(triesOf()).toBe(1);
      for (let attempt = 1; attempt < 5; attempt++) {
        await jest.advanceTimersByTimeAsync(retryDelay(attempt) - 1);
        expect(triesOf()).toBe(attempt);
        await jest.advanceTimersByTimeAsync(1);
        await uploader.idle();
        expect(triesOf()).toBe(attempt + 1);
      }
      expect(repos.photos.file(two?.id ?? '')?.attempts).toBe(5);
      await jest.advanceTimersByTimeAsync(10 * 60_000);
      expect(triesOf()).toBe(5);
      // The screen's "Tentar de novo" still can.
      await uploader.retry([two?.id ?? '']);
      expect(triesOf()).toBe(6);
      uploader.stop();
    });

    it('puts files left "uploading" by a killed run back in the queue', async () => {
      const [one] = await pickThree();
      repos.photos.setUploadState(one?.id ?? '', 'uploading');
      const uploader = createUploader({ getStorage: () => fakeStorage().storage });
      uploader.recover();
      expect(repos.photos.pendingUploads().map((f) => f.photoId)).toContain(one?.id);
    });
  });
});

describe('signed URLs', () => {
  beforeEach(() =>
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'queueMicrotask', 'nextTick'] }),
  );
  afterEach(() => jest.useRealTimers());

  it('asks once for every path requested in the same tick and caches until expiry', async () => {
    let now = 0;
    const { storage, createSignedUrls } = fakeStorage();
    const cache = createSignedUrlCache({ getStorage: () => storage, now: () => now });
    cache.request('u/a.jpg');
    cache.request('u/b.jpg');
    cache.request('u/a.jpg');
    await jest.runOnlyPendingTimersAsync();
    expect(createSignedUrls).toHaveBeenCalledTimes(1);
    expect(createSignedUrls).toHaveBeenCalledWith(['u/a.jpg', 'u/b.jpg'], SIGNED_URL_TTL_S);
    expect(cache.get('u/a.jpg')).toBe('https://signed.test/u/a.jpg');

    cache.request('u/a.jpg');
    await jest.runOnlyPendingTimersAsync();
    expect(createSignedUrls).toHaveBeenCalledTimes(1);

    now = SIGNED_URL_TTL_S * 1000; // expired
    expect(cache.get('u/a.jpg')).toBeNull();
    cache.request('u/a.jpg');
    await jest.runOnlyPendingTimersAsync();
    expect(createSignedUrls).toHaveBeenCalledTimes(2);
  });
});
