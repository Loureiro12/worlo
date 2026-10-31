import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { resetImportBatch, uploads } from '@/data/photos';
import { toPrefs, updatePrefs } from '@/data/profile';
import { repos, setCurrentUserId } from '@/data/repositories';
import { asset, exif, fakeFiles } from '@/features/photos/testing';
import { DEMO_USER, demoId } from '@/mocks/demo';
import { routes } from '@/navigation/routes';
import { resetStore } from '@/store';
import { renderWithProviders } from '@/test-utils';
import { PhotosScreen } from './PhotosScreen';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
}));
jest.mock('expo-file-system', () => require('@/features/photos/testing').fileSystemMock());
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
}));

const picker = jest.mocked(ImagePicker);
const LISBOA = demoId('trip:lisboa');
const lisbonPhoto = (name: string) => asset(name, exif('2024:05:02 10:00:00', 38.72, -9.14));
const loosePhoto = (name: string) => asset(name, { DateTimeOriginal: '2024:07:12 09:00:00' });

beforeEach(() => {
  resetStore();
  resetImportBatch();
  fakeFiles.clear();
  jest.clearAllMocks();
  setCurrentUserId(DEMO_USER.id);
});

const legacyTotal = () => repos.trips.list().reduce((sum, t) => sum + t.photos, 0);

const importPhotos = async (...assets: ImagePicker.ImagePickerAsset[]) => {
  picker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: false, assets });
  await fireEvent.press(screen.getByTestId('photos-start'));
  await waitFor(() => expect(repos.photos.list()).toHaveLength(assets.length));
};

describe('PhotosScreen', () => {
  it('shows the legacy counts and the idle card before any photo', async () => {
    await renderWithProviders(<PhotosScreen />);
    expect(screen.getByTestId('photos-screen')).toBeOnTheScreen();
    const trips = repos.trips.list().length;
    expect(screen.getByText(`${legacyTotal()} fotos em ${trips} viagens`)).toBeOnTheScreen();
    expect(screen.getByTestId('photos-import-idle')).toBeOnTheScreen();
    expect(screen.queryByTestId('photos-loose')).toBeNull();
    expect(screen.getByTestId('photos-trip-lisboa')).toHaveTextContent(/118 fotos/);
  });

  it('imports from the gallery: organizes by GPS, groups loose ones, waits to upload', async () => {
    await renderWithProviders(<PhotosScreen />);
    await importPhotos(lisbonPhoto('a'), loosePhoto('b'), loosePhoto('c'));
    expect(await screen.findByText('1 foto foi pra viagem certa.')).toBeOnTheScreen();
    // Jest has no backend: offline, so the batch waits on the device.
    expect(screen.getByTestId('photos-import-failed')).toBeOnTheScreen();
    expect(
      screen.getByText('0 de 3 fotos foram enviadas. O resto ficou guardado no aparelho.'),
    ).toBeOnTheScreen();
    const loose = within(screen.getByTestId('photos-loose'));
    expect(loose.getByText('(2)')).toBeOnTheScreen();
    expect(loose.getAllByLabelText('Esperando conexão pra enviar')).toHaveLength(2);
    // Real photos replace the legacy count of that trip.
    expect(screen.getByTestId('photos-trip-lisboa')).toHaveTextContent(/1 foto$/);
  });

  it('follows the uploads to "Pronto" with the batch summary', async () => {
    await renderWithProviders(<PhotosScreen />);
    await importPhotos(lisbonPhoto('a'), loosePhoto('b'));
    for (const f of repos.photos.pendingUploads()) repos.photos.markUploaded(f.photoId);
    expect(await screen.findByTestId('photos-import-done')).toBeOnTheScreen();
    expect(
      screen.getByText('2 fotos novas: 1 já estão nas viagens, 1 ficaram sem viagem.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Importação concluída.')).toBeOnTheScreen();
  });

  it('shows a failed upload on its tile and retries it from there', async () => {
    const retry = jest.spyOn(uploads, 'retry').mockResolvedValue();
    await renderWithProviders(<PhotosScreen />);
    await importPhotos(loosePhoto('b'));
    const [photo] = repos.photos.list();
    repos.photos.setUploadState(photo?.id ?? '', 'failed', 'Network request failed');
    await fireEvent.press(await screen.findByTestId('photos-loose-0-failed'));
    expect(retry).toHaveBeenCalledWith([photo?.id]);
  });

  it('links the loose photos to a trip from the sheet (same year suggested)', async () => {
    await renderWithProviders(<PhotosScreen />);
    await importPhotos(loosePhoto('b'), loosePhoto('c'));
    await fireEvent.press(screen.getByTestId('photos-assign'));
    expect(screen.getByText('Associar 2 fotos')).toBeOnTheScreen();
    expect(screen.getByText('Tiradas em 12 de jul. de 2024')).toBeOnTheScreen();
    // 2024 trips: Lisboa and Patagônia; the first one is suggested.
    expect(screen.getByTestId('photos-assign-lisboa')).toHaveTextContent(/Mesma data/);
    await fireEvent.press(screen.getByTestId('photos-assign-patagonia'));
    expect(repos.photos.list({ tripId: demoId('trip:patagonia') })).toHaveLength(2);
    expect(screen.getByText(/^2 fotos foram pra /)).toBeOnTheScreen();
    expect(screen.queryByTestId('photos-loose')).toBeNull();
  });

  it('turning "Organizar por localização" on files the loose photos with GPS', async () => {
    updatePrefs({ autoOrganizePhotos: false });
    await renderWithProviders(<PhotosScreen />);
    await importPhotos(lisbonPhoto('a'), loosePhoto('b'));
    expect(repos.photos.list({ tripId: null })).toHaveLength(2);
    await fireEvent.press(screen.getByRole('switch', { name: 'Organizar por localização' }));
    expect(toPrefs(repos.profile.get()).autoOrganizePhotos).toBe(true);
    expect(repos.photos.list({ tripId: LISBOA })).toHaveLength(1);
    expect(screen.getByText('1 foto foi pra viagem certa.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('switch', { name: 'Organizar por localização' }));
    expect(toPrefs(repos.profile.get()).autoOrganizePhotos).toBe(false);
  });

  it('opens a trip', async () => {
    await renderWithProviders(<PhotosScreen />);
    await fireEvent.press(screen.getByTestId('photos-trip-floripa'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.trip(demoId('trip:floripa')));
  });
});
