import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { getItinerary, getLive } from '@/data/planning';
import { repos } from '@/data/repositories';
import { asset } from '@/features/photos/testing';
import { demoId } from '@/mocks/demo';
import { resetStore } from '@/store';
import { renderWithProviders } from '@/test-utils';
import { LiveScreen } from './LiveScreen';
import {
  copyDays,
  formatMoneyFlex,
  tripFromLive,
  withDay,
  withoutStop,
  withStop,
} from './planning';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
}));

jest.mock('expo-file-system', () => require('@/features/photos/testing').fileSystemMock());
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
}));
const picker = jest.mocked(ImagePicker);
const shoot = () =>
  picker.launchCameraAsync.mockResolvedValueOnce({ canceled: false, assets: [asset('pisac')] });

const PERU = demoId('itinerary:peru');
/** Travel mode as persisted in SQLite (session + logs, newest first). */
const live = () => getLive();
const logOf = (type: string) => live().log.find((l) => l.type === type);
const submit = () => fireEvent.press(screen.getByTestId('live-sheet-submit'));

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
});

describe('LiveScreen', () => {
  it('turns travel mode on when opened and shows the current day', async () => {
    expect(live()).toMatchObject({ on: false, itineraryId: PERU, day: 2 });
    await renderWithProviders(<LiveScreen />);
    expect(live().on).toBe(true);
    expect(repos.planning.currentSession()).toMatchObject({
      id: demoId('live:peru'),
      active: true,
    });
    expect(screen.getByTestId('live-screen')).toBeOnTheScreen();
    expect(screen.getByText('🇵🇪 Cusco e Machu Picchu')).toBeOnTheScreen();
    expect(screen.getByText('Dia 2 · Vale Sagrado')).toBeOnTheScreen();
    expect(screen.getByText('Você está em Cusco, Peru')).toBeOnTheScreen();
  });

  it('starts with an empty log and invented nothing', async () => {
    await renderWithProviders(<LiveScreen />);
    const log = within(screen.getByTestId('live-log'));
    expect(log.getByText(/Nada registrado ainda/)).toBeOnTheScreen();
    expect(screen.getByText('Salvo no aparelho')).toBeOnTheScreen();
    expect(screen.queryByText(/San Blas|Marina|17°C/)).toBeNull();
  });

  it('shows an empty state when there is no itinerary to travel with', async () => {
    for (const it of repos.planning.itineraries()) repos.planning.remove(it.id);
    await renderWithProviders(<LiveScreen />);
    expect(screen.getByText('Nenhum roteiro pra viajar.')).toBeOnTheScreen();
  });

  it('switches day with the day bars', async () => {
    await renderWithProviders(<LiveScreen />);
    await fireEvent.press(screen.getByLabelText('Dia 1, Lima → Cusco'));
    expect(live().day).toBe(1);
    expect(screen.getByText('Dia 1 · Lima → Cusco')).toBeOnTheScreen();
    expect(screen.getByTestId('live-progress')).toHaveTextContent('3 de 3 feitos');
    await fireEvent.press(screen.getByTestId('live-day-4'));
    expect(
      screen.getByText('Dia livre. Faça check-in onde for, a gente monta o registro.'),
    ).toBeOnTheScreen();
  });

  it('toggles plan items, marking the current one and logging completion', async () => {
    await renderWithProviders(<LiveScreen />);
    expect(screen.getByTestId('live-progress')).toHaveTextContent('0 de 1 feitos');
    expect(screen.getByText('Agora · 08:00')).toBeOnTheScreen();
    const item = screen.getByTestId('live-plan-0');
    expect(item).toHaveProp('accessibilityRole', 'checkbox');
    await fireEvent.press(item);
    expect(live().done['1-0']).toBe(true);
    expect(screen.getByTestId('live-progress')).toHaveTextContent('1 de 1 feitos');
    expect(screen.getByText('Feito')).toBeOnTheScreen();
    expect(live().log[0]?.text).toBe('concluiu Vale Sagrado em um dia.');
    expect(live().log).toHaveLength(1);
    const rows = within(screen.getByTestId('live-log'));
    expect(rows.getByText(/concluiu Vale Sagrado/)).toBeOnTheScreen();
    await fireEvent.press(item);
    expect(live().done['1-0']).toBe(false);
    expect(live().log).toHaveLength(1);
  });

  it('check-in requires a place, then logs it with the rating', async () => {
    await renderWithProviders(<LiveScreen />);
    await fireEvent.press(screen.getByTestId('live-checkin'));
    expect(screen.getByText('Fazer check-in')).toBeOnTheScreen();
    await submit();
    expect(screen.getByText('Escolha onde você está.')).toBeOnTheScreen();
    expect(live().log).toHaveLength(0);
    await fireEvent.press(screen.getByTestId('live-near-0'));
    expect(screen.queryByText('Escolha onde você está.')).toBeNull();
    await fireEvent.press(screen.getByLabelText('4 de 5 estrelas'));
    await submit();
    expect(live().log[0]).toMatchObject({
      type: 'checkin',
      author: 'me',
      text: 'fez check-in em Vale Sagrado em um dia. ★★★★',
    });
    expect(screen.getByText('Check-in em Vale Sagrado em um dia.')).toBeOnTheScreen();
  });

  it('check-in also takes a place typed by hand', async () => {
    await renderWithProviders(<LiveScreen />);
    await fireEvent.press(screen.getByTestId('live-checkin'));
    await fireEvent.changeText(screen.getByTestId('live-place'), 'Café da esquina');
    await submit();
    expect(live().log[0]?.text).toBe('fez check-in em Café da esquina.');
  });

  it('expense requires an amount and adds to spent', async () => {
    await renderWithProviders(<LiveScreen />);
    await fireEvent.press(screen.getByTestId('live-expense'));
    await submit();
    expect(screen.getByText('Quanto foi?')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Valor em reais'), '12,50');
    await fireEvent.press(screen.getByTestId('live-cat-transport'));
    await submit();
    expect(live().spent).toBeCloseTo(12.5);
    expect(live().log[0]).toMatchObject({
      type: 'expense',
      text: 'gastou R$ 12,50 em transporte.',
    });
    expect(repos.planning.logs(demoId('live:peru'))[0]?.amount).toBeCloseTo(12.5);
    // a second expense adds up
    await fireEvent.press(screen.getByTestId('live-expense'));
    await fireEvent.changeText(screen.getByLabelText('Valor em reais'), '10');
    await submit();
    expect(live().spent).toBeCloseTo(22.5);
    expect(screen.getByText('Gasto anotado.')).toBeOnTheScreen();
  });

  it('note requires text; photo caption is optional', async () => {
    await renderWithProviders(<LiveScreen />);
    await fireEvent.press(screen.getByTestId('live-note'));
    await submit();
    expect(screen.getByText('Escreva alguma coisa.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('live-text'), 'Que dia lindo');
    await submit();
    expect(logOf('note')).toMatchObject({ detail: 'Que dia lindo' });
    expect(screen.getByText('“Que dia lindo”')).toBeOnTheScreen();

    shoot();
    await fireEvent.press(screen.getByTestId('live-photo'));
    await submit();
    await waitFor(() => expect(logOf('photo')).toBeDefined());
    expect(picker.launchCameraAsync).toHaveBeenCalledWith(expect.objectContaining({ exif: true }));
    expect(logOf('photo')).toMatchObject({ text: 'tirou uma foto em Cusco.' });
    // The entry points at the picked photo (loose: the Peru trip doesn't exist yet).
    const photo = repos.photos.get(logOf('photo')?.photo ?? '');
    expect(photo).toMatchObject({ tripId: null, uploaded: false });
    expect(repos.photos.file(photo?.id ?? '')?.state).toBe('pending');
    expect(live().log).toHaveLength(2);
    expect(screen.getByText('Foto salva na viagem.')).toBeOnTheScreen();
    expect(screen.getByTestId('live-log-photo')).toBeOnTheScreen();
  });

  it('keeps the photo sheet open when the camera is canceled or denied', async () => {
    await renderWithProviders(<LiveScreen />);
    picker.launchCameraAsync.mockResolvedValueOnce({ canceled: true, assets: null });
    await fireEvent.press(screen.getByTestId('live-photo'));
    await submit();
    expect(logOf('photo')).toBeUndefined();
    expect(screen.getByTestId('live-sheet-submit')).toBeOnTheScreen();

    picker.requestCameraPermissionsAsync.mockResolvedValueOnce({ granted: false } as never);
    await submit();
    expect(
      await screen.findByText('Sem acesso à câmera. Libere nos ajustes do aparelho.'),
    ).toBeOnTheScreen();
    expect(repos.photos.list()).toHaveLength(0);
  });

  it('ending the trip moves the photos taken in travel mode into the new trip', async () => {
    await renderWithProviders(<LiveScreen />);
    shoot();
    await fireEvent.press(screen.getByTestId('live-photo'));
    await submit();
    await waitFor(() => expect(logOf('photo')).toBeDefined());
    const photoId = logOf('photo')?.photo ?? '';
    await fireEvent.press(screen.getByTestId('live-end'));
    await fireEvent.press(screen.getByText('Encerrar e criar viagem'));
    const trip = repos.trips.list()[0];
    expect(trip?.title).toBe('Cusco e Machu Picchu');
    expect(repos.photos.get(photoId)?.tripId).toBe(trip?.id);
  });

  it('ending the trip creates a past trip, lights Peru and opens the trip', async () => {
    await renderWithProviders(<LiveScreen />);
    await fireEvent.press(screen.getByTestId('live-end'));
    expect(screen.getByText('Encerrar a viagem?')).toBeOnTheScreen();
    // Only what this trip logged: 4 days, no photos, no check-ins.
    expect(screen.getByTestId('live-end-days')).toHaveTextContent(/^4/);
    expect(screen.getByTestId('live-end-photos')).toHaveTextContent(/^0/);
    expect(screen.getByTestId('live-end-places')).toHaveTextContent(/^0/);
    await fireEvent.press(screen.getByText('Encerrar e criar viagem'));
    expect(live().on).toBe(false);
    const trip = repos.trips.list()[0];
    expect(trip).toMatchObject({
      title: 'Cusco e Machu Picchu',
      place: 'Cusco',
      country: 'Peru',
      days: 4,
      photos: 0,
      places: 0,
      countryIso: '604',
      companions: [],
    });
    expect(repos.world.visitedMap()['604']).toBeDefined();
    expect(mockRouter.replace).toHaveBeenCalledWith(`/trip/${trip?.id}`);
    expect(screen.getByText('Viagem encerrada. O Peru acendeu no seu mapa.')).toBeOnTheScreen();
  });
});

describe('planning helpers', () => {
  it('formats money with up to two decimals', () => {
    expect(formatMoneyFlex(1710)).toBe('R$ 1.710');
    expect(formatMoneyFlex(18.24)).toBe('R$ 18,24');
    expect(formatMoneyFlex(12.5, 'S/')).toBe('S/ 12,50');
  });

  it('builds the past trip total from costs + spent', () => {
    const it = getItinerary(PERU);
    if (!it) throw new Error('missing itinerary');
    const trip = tripFromLive(it, { days: 4, photos: 6, places: 4 }, 100, new Date(2026, 9, 1));
    expect(trip).toMatchObject({ total: 'R$ 1.810', period: 'out 2026', year: '2026' });
  });

  it('edits days and stops without touching the input', () => {
    const stop = { time: '09:00', icon: 'map-pin' as const, title: 'A', note: '', cost: 0 };
    const days = [{ label: 'Um', items: [stop] }];
    expect(withDay(days, 'Dois')).toEqual([...days, { label: 'Dois', items: [] }]);
    expect(withStop(days, 0, { ...stop, title: 'B' })[0]?.items.map((s) => s.title)).toEqual([
      'A',
      'B',
    ]);
    expect(withStop(days, 5, stop)).toEqual(days);
    expect(withoutStop(days, 0, 0)).toEqual([{ label: 'Um', items: [] }]);
    expect(days[0]?.items).toHaveLength(1);
    const copy = copyDays(days);
    expect(copy).toEqual(days);
    expect(copy[0]?.items[0]).not.toBe(stop);
  });
});
