import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { palette } from '@worlo/ui';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { PixelRatio, StyleSheet } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { repos } from '@/data/repositories';
import { computeAchievements } from '@/features/profile/achievements';
import { demoId } from '@/mocks/demo';
import type { ShareSubject } from '@/navigation/routes';
import { resetStore, useStore } from '@/store';
import type { ShareFormat } from '@/store/slices/discovery';
import { renderWithProviders } from '@/test-utils';
import { destinationsFor, ShareScreen } from './ShareScreen';
import { PREVIEW_SIZE, SHARE_THEMES } from './shareContent';

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
  canGoBack: jest.fn(() => true),
};
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
  mockParams = { subject: 'map' };
});

const previewStyle = () => StyleSheet.flatten(screen.getByTestId('share-preview').props.style);

const ACH_TITLES: Record<string, string> = {
  firstTrip: 'Primeira viagem',
  fiveCountries: '5 países',
  endOfWorld: 'Fim do mundo',
  twentyCities: '20 cidades',
  threeContinents: '3 continentes',
};
const pt = (id: string | undefined) => ACH_TITLES[id ?? ''] ?? '';
const unlockedAchievements = () =>
  computeAchievements({
    trips: repos.trips.list(),
    visitedMap: repos.world.visitedMap(),
  }).flatMap((a) => (a.unlocked ? [a] : []));

const SUBJECTS: ShareSubject[] = ['map', 'year', 'trip', 'retro', 'roteiro', 'ach'];
const FORMATS: ShareFormat[] = ['story', 'post', 'square'];

/** One distinctive line per subject (02_SCREENS → J). */
const expectSubject: Record<ShareSubject, () => void> = {
  map: () => {
    expect(screen.getByText('Meu mundo até agora')).toBeOnTheScreen();
    expect(screen.getByTestId('share-preview-countries')).toHaveTextContent('6');
    expect(screen.getByText(/% do mundo · \d+ cidades · \d+ viagens/)).toBeOnTheScreen();
  },
  year: () => {
    expect(screen.getByText('Minha vida em viagens')).toBeOnTheScreen();
    expect(screen.getByText('dias viajando')).toBeOnTheScreen();
  },
  trip: () => {
    expect(screen.getByText('Inverno em Floripa')).toBeOnTheScreen();
    expect(screen.getByText('com Marina e João')).toBeOnTheScreen();
    expect(screen.getByText('12 – 17 jul 2025')).toBeOnTheScreen();
  },
  retro: () => {
    expect(screen.getByText('Retrospectiva · 2025')).toBeOnTheScreen();
    expect(screen.getByText('Melhor momento')).toBeOnTheScreen();
    expect(screen.getByText('Pôr do sol na Lagoa da Conceição')).toBeOnTheScreen();
  },
  roteiro: () => {
    expect(screen.getByText('Próxima viagem')).toBeOnTheScreen();
    expect(screen.getByText('Cusco e Machu Picchu')).toBeOnTheScreen();
  },
  ach: () => {
    expect(screen.getByText('Conquista desbloqueada')).toBeOnTheScreen();
    // Without a route param: the latest one the account really unlocked.
    const latest = unlockedAchievements().at(-1);
    expect(screen.getByText(pt(latest?.id))).toBeOnTheScreen();
    if (latest?.meta) expect(screen.getByText(latest.meta)).toBeOnTheScreen();
  },
};

describe('ShareScreen (J)', () => {
  it('opens on the subject from the route', async () => {
    mockParams = { subject: 'trip', tripId: demoId('trip:floripa') };
    await renderWithProviders(<ShareScreen />);
    expect(screen.getByTestId('share-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('share-subject-trip')).toBeSelected();
    expectSubject.trip();
  });

  it('draws the trip of the route from SQLite', async () => {
    const id = demoId('trip:patagonia');
    repos.trips.update(id, { title: 'Patagônia sem pressa' });
    mockParams = { subject: 'trip', tripId: id };
    await renderWithProviders(<ShareScreen />);
    expect(screen.getByText('Patagônia sem pressa')).toBeOnTheScreen();
    expect(screen.queryByText('Inverno em Floripa')).toBeNull();
  });

  it('falls back to the map for an unknown subject', async () => {
    mockParams = { subject: 'nope' };
    await renderWithProviders(<ShareScreen />);
    expect(screen.getByTestId('share-subject-map')).toBeSelected();
  });

  describe.each(FORMATS)('format %s', (format) => {
    it.each(SUBJECTS)('renders %s with logo, handle and link', async (subject) => {
      useStore.getState().setShareOptions({ format });
      mockParams = { subject };
      await renderWithProviders(<ShareScreen />);
      expect(previewStyle()).toMatchObject(PREVIEW_SIZE[format]);
      const preview = within(screen.getByTestId('share-preview'));
      expect(preview.getByText('Worlo')).toBeOnTheScreen();
      expect(preview.getByText('@anaviaja')).toBeOnTheScreen();
      expect(preview.getByText('worlo.app/anaviaja')).toBeOnTheScreen();
      expectSubject[subject]();
    });
  });

  it('adapts "Meu mundo" per format', async () => {
    mockParams = { subject: 'year' };
    await renderWithProviders(<ShareScreen />);
    expect(screen.getByTestId('share-preview-year-title')).toHaveTextContent(
      /via(gem|gens), \d+ país(es)? e muita coisa boa$/,
    );
    expect(screen.getByTestId('share-preview-favorite')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('share-format-post'));
    expect(screen.getByTestId('share-preview-year-title')).toHaveTextContent(
      /via(gem|gens), \d+ país(es)?$/,
    );
    expect(screen.getByTestId('share-preview-favorite')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('share-format-square'));
    expect(screen.queryByTestId('share-preview-favorite')).toBeNull();
  });

  it('shows 4 itinerary days, 2 in 1:1', async () => {
    mockParams = { subject: 'roteiro', roteiroId: demoId('itinerary:peru') };
    await renderWithProviders(<ShareScreen />);
    expect(screen.getAllByTestId('share-preview-day')).toHaveLength(4);
    expect(screen.getByText('DIA 1')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('share-format-square'));
    expect(screen.getAllByTestId('share-preview-day')).toHaveLength(2);
  });

  it('uses the achievement from the route', async () => {
    mockParams = { subject: 'ach', ach: 'firstTrip' };
    await renderWithProviders(<ShareScreen />);
    expect(screen.getByText('Primeira viagem')).toBeOnTheScreen();
    const first = unlockedAchievements().find((a) => a.id === 'firstTrip');
    expect(screen.getByText(first?.meta ?? '')).toBeOnTheScreen();
  });

  it('switches subject with the chips', async () => {
    await renderWithProviders(<ShareScreen />);
    await fireEvent.press(screen.getByTestId('share-subject-ach'));
    expect(screen.getByTestId('share-subject-ach')).toBeSelected();
    expectSubject.ach();
  });

  it('switches theme and remembers it', async () => {
    await renderWithProviders(<ShareScreen />);
    expect(previewStyle().backgroundColor).toBe(palette.carvao);
    expect(screen.getByTestId('share-theme-dark')).toBeChecked();
    await fireEvent.press(screen.getByTestId('share-theme-coral'));
    expect(previewStyle().backgroundColor).toBe(palette.coral);
    expect(screen.getByTestId('share-theme-coral')).toBeChecked();
    await fireEvent.press(screen.getByTestId('share-theme-sand'));
    expect(previewStyle().backgroundColor).toBe(palette.areia);
    expect(useStore.getState().shareOptions.theme).toBe('sand');
    expect(SHARE_THEMES.sand.card).toBe(palette.branco);
  });

  it('describes the preview as an image', async () => {
    await renderWithProviders(<ShareScreen />);
    expect(
      screen.getByRole('image', {
        name: /Prévia da imagem \(Story 9:16, tema Carvão\): Meu mundo até agora, 6 países/,
      }),
    ).toBeOnTheScreen();
  });

  it('toggles the @username', async () => {
    await renderWithProviders(<ShareScreen />);
    expect(screen.getByTestId('share-handle')).toBeChecked();
    await fireEvent.press(screen.getByTestId('share-handle'));
    expect(screen.queryByTestId('share-preview-handle')).toBeNull();
    expect(screen.getByText('worlo.app/anaviaja')).toBeOnTheScreen();
    expect(screen.getByTestId('share-handle')).not.toBeChecked();
    await fireEvent.press(screen.getByTestId('share-handle'));
    expect(screen.getByTestId('share-preview-handle')).toHaveTextContent('@anaviaja');
  });

  it('lists destinations per format', async () => {
    expect(destinationsFor('story')).toEqual(['stories', 'tiktok', 'whatsapp', 'save', 'link']);
    expect(destinationsFor('post')).toEqual(['feed', 'x', 'whatsapp', 'save', 'link']);
    expect(destinationsFor('square')).toEqual(destinationsFor('post'));
    await renderWithProviders(<ShareScreen />);
    expect(screen.getByLabelText('Stories')).toBeOnTheScreen();
    expect(screen.getByLabelText('TikTok')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Feed')).toBeNull();
    await fireEvent.press(screen.getByTestId('share-format-post'));
    expect(previewStyle()).toMatchObject({ width: 290, height: 362 });
    expect(screen.getByLabelText('Feed')).toBeOnTheScreen();
    expect(screen.getByLabelText('X')).toBeOnTheScreen();
    expect(screen.queryByLabelText('TikTok')).toBeNull();
    expect(screen.getByLabelText('Salvar imagem')).toBeOnTheScreen();
    expect(screen.getByLabelText('Copiar link')).toBeOnTheScreen();
  });

  it('shares the rendered 1080 px picture through the system sheet', async () => {
    await renderWithProviders(<ShareScreen />);
    await fireEvent.press(screen.getByTestId('share-dest-whatsapp'));
    await waitFor(() =>
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        'file:///tmp/share.png',
        expect.objectContaining({ mimeType: 'image/png' }),
      ),
    );
    const options = jest.mocked(captureRef).mock.calls[0]?.[1];
    expect((options?.width ?? 0) * PixelRatio.get()).toBeCloseTo(1080);
    expect((options?.height ?? 0) * PixelRatio.get()).toBeCloseTo(1918);
  });

  it('saves the picture to the gallery and copies the link', async () => {
    await renderWithProviders(<ShareScreen />);
    await fireEvent.press(screen.getByTestId('share-dest-save'));
    expect(await screen.findByText('Imagem salva na galeria.')).toBeOnTheScreen();
    expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalledWith(true, []);
    expect(MediaLibrary.Asset.create).toHaveBeenCalledWith('file:///tmp/share.png');
    await fireEvent.press(screen.getByTestId('share-dest-link'));
    expect(await screen.findByText('Link copiado.')).toBeOnTheScreen();
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });

  it('says so when the gallery is denied or the picture fails', async () => {
    await renderWithProviders(<ShareScreen />);
    jest
      .mocked(MediaLibrary.requestPermissionsAsync)
      .mockResolvedValueOnce({ granted: false } as never);
    await fireEvent.press(screen.getByTestId('share-dest-save'));
    expect(await screen.findByText('Sem permissão pra salvar na galeria.')).toBeOnTheScreen();
    expect(MediaLibrary.Asset.create).not.toHaveBeenCalled();

    jest.mocked(captureRef).mockRejectedValueOnce(new Error('no view'));
    await fireEvent.press(screen.getByTestId('share-dest-whatsapp'));
    expect(await screen.findByText('Não deu pra gerar a imagem. Tente de novo.')).toBeOnTheScreen();
  });

  it('hides the achievement card when nothing is unlocked', async () => {
    for (const trip of repos.trips.list()) repos.trips.remove(trip.id);
    for (const iso of Object.keys(repos.world.visitedMap())) repos.world.toggleVisited(iso);
    await renderWithProviders(<ShareScreen />);
    expect(screen.queryByTestId('share-subject-ach')).toBeNull();
  });

  it('closes', async () => {
    await renderWithProviders(<ShareScreen />);
    await fireEvent.press(screen.getByTestId('header-back'));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('renders in English and Spanish', async () => {
    const en = await renderWithProviders(<ShareScreen />, { language: 'en' });
    expect(screen.getByText('My world so far')).toBeOnTheScreen();
    expect(screen.getByText('countries')).toBeOnTheScreen();
    en.unmount();
    await renderWithProviders(<ShareScreen />, { language: 'es' });
    expect(screen.getByText('Mi mundo hasta ahora')).toBeOnTheScreen();
  });
});
