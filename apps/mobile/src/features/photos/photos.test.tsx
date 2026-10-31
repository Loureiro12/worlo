import { renderHook, screen } from '@testing-library/react-native';
import type { Photo } from '@worlo/db';
import { signedUrls, usePhotoUri } from '@/data/photos';
import { repos, setCurrentUserId } from '@/data/repositories';
import { toTrip } from '@/data/trips';
import { DEMO_USER, demoId } from '@/mocks/demo';
import { userId } from '@/mocks/demoWorld';
import { Providers, renderWithProviders } from '@/test-utils';
import { TripPhotoGrid } from './TripPhotos';
import { fakeFiles, insertRemotePhoto } from './testing';

jest.mock('expo-file-system', () => require('@/features/photos/testing').fileSystemMock());

// Online, so photos without a local copy go for a signed URL.
let mockOnline = true;
jest.mock('@/features/sync/SyncProvider', () => ({
  ...jest.requireActual('@/features/sync/SyncProvider'),
  useSync: () => ({ status: 'idle', online: mockOnline, ready: true, retry: () => {} }),
}));

const FLORIPA = demoId('trip:floripa');
const MARINA = userId('Marina Costa');

beforeEach(() => {
  setCurrentUserId(DEMO_USER.id);
  mockOnline = true;
  fakeFiles.clear();
  signedUrls.clear();
  jest.restoreAllMocks();
});

const mine = (name: string): Photo => {
  const uri = `file:///docs/photos/${name}.jpg`;
  fakeFiles.set(uri, new Uint8Array([1]));
  return repos.photos.add({ localUri: uri, tripId: FLORIPA });
};

const remote = (id: string, uploaded = true) => {
  insertRemotePhoto({ id, userId: MARINA, tripId: FLORIPA, uploaded });
  return repos.photos.get(id) as Photo;
};

describe('usePhotoUri', () => {
  const uriOf = async (photo: Photo) =>
    (await renderHook(() => usePhotoUri(photo), { wrapper: Providers })).result.current;

  it('uses the local copy and never asks for a signed URL', async () => {
    const request = jest.spyOn(signedUrls, 'request');
    const photo = mine('a');
    expect(await uriOf(photo)).toBe('file:///docs/photos/a.jpg');
    expect(request).not.toHaveBeenCalled();
  });

  it("asks for a signed URL for someone else's uploaded photo", async () => {
    const request = jest.spyOn(signedUrls, 'request').mockImplementation(() => {});
    const photo = remote('00000000-0000-4000-8000-0000000000a1');
    expect(await uriOf(photo)).toBeNull();
    expect(request).toHaveBeenCalledWith(photo.storagePath);
  });

  it('offline and not on this device: no request, placeholder', async () => {
    mockOnline = false;
    const request = jest.spyOn(signedUrls, 'request');
    expect(await uriOf(remote('00000000-0000-4000-8000-0000000000a2'))).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it('a local copy that was deleted falls back to the signed URL once uploaded', async () => {
    const request = jest.spyOn(signedUrls, 'request').mockImplementation(() => {});
    const photo = mine('gone');
    repos.photos.markUploaded(photo.id);
    fakeFiles.clear();
    await uriOf(repos.photos.get(photo.id) as Photo);
    expect(request).toHaveBeenCalledWith(photo.storagePath);
  });
});

describe('TripPhotoGrid', () => {
  const floripa = () => {
    const row = repos.trips.get(FLORIPA);
    if (!row) throw new Error('demo trip missing');
    return toTrip(row);
  };

  it('keeps the legacy count and tiles while the trip has no real photos', async () => {
    await renderWithProviders(<TripPhotoGrid trip={floripa()} />);
    expect(screen.getByText('(42)')).toBeOnTheScreen();
    expect(screen.queryByTestId('trip-photo-0')).toBeNull();
  });

  it("shows my photos and the members' uploaded ones, not their pending ones", async () => {
    jest.spyOn(signedUrls, 'request').mockImplementation(() => {});
    mine('mine');
    remote('00000000-0000-4000-8000-0000000000b1');
    remote('00000000-0000-4000-8000-0000000000b2', false);
    await renderWithProviders(<TripPhotoGrid trip={floripa()} />);
    expect(screen.getByText('(2)')).toBeOnTheScreen();
    expect(screen.getByLabelText('2 fotos')).toBeOnTheScreen();
    expect(screen.getByTestId('trip-photo-1')).toBeOnTheScreen();
    expect(screen.queryByTestId('trip-photo-2')).toBeNull();
    // Mine waits for upload on this device: badge on its tile.
    expect(screen.getAllByLabelText('Esperando conexão pra enviar')).toHaveLength(1);
    expect(repos.photos.list({ tripId: FLORIPA }).some((p) => p.userId === DEMO_USER.id)).toBe(
      true,
    );
  });
});
