import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { getItinerary, getLive, startLive } from '@/data/planning';
import { repos } from '@/data/repositories';
import { asset } from '@/features/photos/testing';
import { timeIn } from '@/lib/places';
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
  /** Travel mode starts only when asked (Roteiro › Iniciar viagem › Começar agora). */
  const open = async () => {
    startLive(PERU);
    await renderWithProviders(<LiveScreen />);
  };
  const gallery = (...names: string[]) =>
    picker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: names.map((n) => asset(n)),
    });

  it('does not start the trip by itself: it waits for "Começar agora"', async () => {
    expect(live()).toMatchObject({ on: false, itineraryId: PERU, day: 2 });
    await renderWithProviders(<LiveScreen />);
    expect(screen.getByTestId('live-not-started')).toBeOnTheScreen();
    expect(live().on).toBe(false);
    await fireEvent.press(screen.getByText('Começar agora'));
    expect(live().on).toBe(true);
    expect(repos.planning.currentSession()).toMatchObject({
      id: demoId('live:peru'),
      active: true,
    });
    expect(screen.getByText('🇵🇪 Cusco e Machu Picchu')).toBeOnTheScreen();
    expect(screen.getByText('Dia 2 · Vale Sagrado')).toBeOnTheScreen();
    expect(screen.getByText('Você está em Cusco, Peru')).toBeOnTheScreen();
  });

  it("shows the destination's local time, from its time zone", async () => {
    await open();
    // The itinerary is "Cusco, Peru" → America/Lima.
    expect(screen.getByTestId('live-local-time')).toHaveTextContent(
      `Hora local${timeIn('America/Lima', new Date())}`,
    );
  });

  it('starts with an empty record and invented nothing', async () => {
    await open();
    const log = within(screen.getByTestId('live-log'));
    expect(log.getByText('Nada registrado nesse dia ainda.')).toBeOnTheScreen();
    expect(screen.getByText('Salvo no aparelho')).toBeOnTheScreen();
    expect(screen.queryByText(/San Blas|Marina|17°C|Check-in/)).toBeNull();
  });

  it('switches day with the bars, which say they can be tapped', async () => {
    await open();
    expect(screen.getByTestId('live-day-hint')).toHaveTextContent(
      'Toque num dia pra ver o plano e os registros dele.',
    );
    await fireEvent.press(screen.getByLabelText('Dia 1, Lima → Cusco'));
    expect(live().day).toBe(1);
    expect(screen.getByText('Dia 1 · Lima → Cusco')).toBeOnTheScreen();
    expect(screen.getByTestId('live-progress')).toHaveTextContent('3 de 3 feitos');
    await fireEvent.press(screen.getByTestId('live-day-4'));
    expect(
      screen.getByText('Dia livre. Toque em + pra adicionar o que for fazendo.'),
    ).toBeOnTheScreen();
  });

  it('toggles plan items, marking the current one and logging completion', async () => {
    await open();
    expect(screen.getByTestId('live-progress')).toHaveTextContent('0 de 1 feitos');
    expect(screen.getByText('Agora · 08:00')).toBeOnTheScreen();
    const item = screen.getByTestId('live-plan-0');
    expect(item).toHaveProp('accessibilityRole', 'checkbox');
    await fireEvent.press(item);
    expect(live().done['1-0']).toBe(true);
    expect(screen.getByTestId('live-progress')).toHaveTextContent('1 de 1 feitos');
    expect(live().log[0]).toMatchObject({ text: 'concluiu Vale Sagrado em um dia.', day: 2 });
    await fireEvent.press(item);
    expect(live().done['1-0']).toBe(false);
    expect(live().log).toHaveLength(1);
  });

  it('"+" adds an experience to the day: shortcut or typed freely', async () => {
    await open();
    expect(screen.queryByTestId('live-checkin')).toBeNull();
    await fireEvent.press(screen.getByTestId('live-add'));
    await fireEvent.press(screen.getByTestId('activity-group-food'));
    await fireEvent.press(screen.getByTestId('activity-kind-lunch'));
    expect(screen.getByTestId('activity-title')).toHaveDisplayValue('Almoço');
    await fireEvent.changeText(screen.getByTestId('activity-note'), 'Mercado de Pisac');
    await fireEvent.press(screen.getByTestId('live-add-sheet-save'));
    const day2 = getItinerary(PERU)?.days[1]?.items ?? [];
    expect(day2.at(-1)).toMatchObject({
      title: 'Almoço',
      time: '12:30',
      icon: 'fork-knife',
      note: 'Mercado de Pisac',
    });
    expect(live().log[0]).toMatchObject({ type: 'activity', text: 'adicionou Almoço.', day: 2 });
    expect(screen.getByText('Almoço entrou no Dia 2.')).toBeOnTheScreen();

    // Anything goes: a relative's house is not in any catalog.
    await fireEvent.press(screen.getByTestId('live-add'));
    await fireEvent.press(screen.getByTestId('live-add-sheet-save'));
    expect(screen.getByText('Diga o que você vai fazer.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('activity-title'), 'Visitar a tia Lúcia');
    await fireEvent.changeText(screen.getByTestId('activity-time'), '19h');
    await fireEvent.press(screen.getByTestId('live-add-sheet-save'));
    expect(getItinerary(PERU)?.days[1]?.items.at(-1)).toMatchObject({
      title: 'Visitar a tia Lúcia',
      time: '19:00',
    });
  });

  it('keeps what was being typed if the sheet (or the app) closes', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('live-add'));
    await fireEvent.changeText(screen.getByTestId('activity-title'), 'Feira de artesanato');
    await fireEvent.press(
      screen.getByTestId('live-add-sheet-overlay', { includeHiddenElements: true }),
    );
    await fireEvent.press(screen.getByTestId('live-add'));
    expect(screen.getByTestId('activity-title')).toHaveDisplayValue('Feira de artesanato');
  });

  it('expense requires an amount and adds to spent', async () => {
    await open();
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
      day: 2,
    });
  });

  it('notes are kept on the day they were written', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('live-note'));
    await submit();
    expect(screen.getByText('Escreva alguma coisa.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('live-text'), 'Que dia lindo');
    await submit();
    expect(logOf('note')).toMatchObject({ detail: 'Que dia lindo', day: 2 });
    expect(screen.getByText('“Que dia lindo”')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('live-day-1'));
    expect(screen.queryByText('“Que dia lindo”')).toBeNull();
    await fireEvent.press(screen.getByTestId('live-day-2'));
    expect(screen.getByText('“Que dia lindo”')).toBeOnTheScreen();
  });

  it('adds photos from the gallery, each with its caption, to the day', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('live-photo'));
    gallery('pisac', 'mercado');
    await fireEvent.press(screen.getByTestId('live-photo-gallery'));
    await waitFor(() => expect(screen.getAllByTestId('live-picked-photo')).toHaveLength(2));
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByTestId('live-caption-0'), 'Pôr do sol em Pisac');
    await submit();
    const photos = live().log.filter((l) => l.type === 'photo');
    expect(photos).toHaveLength(2);
    expect(photos.every((p) => p.day === 2)).toBe(true);
    const withCaption = photos.find((p) => p.detail === 'Pôr do sol em Pisac');
    expect(repos.photos.get(withCaption?.photo ?? '')?.caption).toBe('Pôr do sol em Pisac');
    expect(screen.getByText('2 fotos salvas no Dia 2.')).toBeOnTheScreen();
  });

  it('the camera still works; nothing picked asks for a photo', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('live-photo'));
    await submit();
    expect(screen.getByText('Escolha ao menos uma foto.')).toBeOnTheScreen();
    picker.launchCameraAsync.mockResolvedValueOnce({ canceled: true, assets: null });
    await fireEvent.press(screen.getByTestId('live-photo-camera'));
    expect(screen.queryByTestId('live-picked-photo')).toBeNull();
    picker.requestCameraPermissionsAsync.mockResolvedValueOnce({ granted: false } as never);
    await fireEvent.press(screen.getByTestId('live-photo-camera'));
    expect(
      await screen.findByText('Sem acesso à câmera. Libere nos ajustes do aparelho.'),
    ).toBeOnTheScreen();
    shoot();
    await fireEvent.press(screen.getByTestId('live-photo-camera'));
    await waitFor(() => expect(screen.getAllByTestId('live-picked-photo')).toHaveLength(1));
    await submit();
    expect(logOf('photo')).toMatchObject({ text: 'tirou uma foto em Cusco.', day: 2 });
  });

  it('ending builds the trip from what was really recorded, day by day', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('live-plan-0'));
    await fireEvent.press(screen.getByTestId('live-add'));
    await fireEvent.changeText(screen.getByTestId('activity-title'), 'Feira de Pisac');
    await fireEvent.press(screen.getByTestId('live-add-sheet-save'));
    await fireEvent.press(screen.getByTestId('live-photo'));
    gallery('pisac');
    await fireEvent.press(screen.getByTestId('live-photo-gallery'));
    await waitFor(() => expect(screen.getAllByTestId('live-picked-photo')).toHaveLength(1));
    await fireEvent.changeText(screen.getByTestId('live-caption-0'), 'Ruínas');
    await submit();
    const photoId = logOf('photo')?.photo ?? '';

    await fireEvent.press(screen.getByTestId('live-end'));
    expect(screen.getByText('Encerrar a viagem?')).toBeOnTheScreen();
    // 4 days · 1 photo · places: the 3 stops already done on Day 1 (seeded
    // session) + the one done now + the activity added with "+".
    expect(live().done).toMatchObject({ '0-0': true, '0-1': true, '0-2': true, '1-0': true });
    expect(screen.getByTestId('live-end-days')).toHaveTextContent(/^4/);
    expect(screen.getByTestId('live-end-photos')).toHaveTextContent(/^1/);
    expect(screen.getByTestId('live-end-places')).toHaveTextContent(/^5/);
    await fireEvent.press(screen.getByText('Encerrar e criar viagem'));

    expect(live().on).toBe(false);
    const trip = repos.trips.list()[0];
    expect(trip).toMatchObject({
      title: 'Cusco e Machu Picchu',
      country: 'Peru',
      countryIso: '604',
      days: 4,
      photos: 1,
      places: 5,
      companions: [],
    });
    expect(repos.photos.get(photoId)?.tripId).toBe(trip?.id);
    const details = trip?.details as
      | { days: { label: string; items: Record<string, unknown>[] }[] }
      | undefined;
    const days = details?.days ?? [];
    const day2 = days.find((d) => d.label === 'Dia 2 · Vale Sagrado');
    expect(day2?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Vale Sagrado em um dia', extra: '✓' }),
        expect.objectContaining({ title: 'Feira de Pisac' }),
        expect.objectContaining({ note: 'Ruínas', photos: [photoId] }),
      ]),
    );
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
