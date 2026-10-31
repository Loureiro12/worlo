import { fireEvent, screen, within } from '@testing-library/react-native';
import { palette } from '@worlo/ui';
import { Share, StyleSheet } from 'react-native';
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

const shareSpy = jest.spyOn(Share, 'share');

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
  shareSpy.mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
  mockParams = { subject: 'map' };
});

const previewStyle = () => StyleSheet.flatten(screen.getByTestId('share-preview').props.style);

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
    expect(screen.getByText('Fim do mundo')).toBeOnTheScreen();
    expect(screen.getByText('Patagônia · 2024')).toBeOnTheScreen();
  },
};

describe('ShareScreen (J)', () => {
  it('opens on the subject from the route', async () => {
    mockParams = { subject: 'trip', tripId: 'floripa' };
    await renderWithProviders(<ShareScreen />);
    expect(screen.getByTestId('share-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('share-subject-trip')).toBeSelected();
    expectSubject.trip();
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
      /viagens, 6 países e muita coisa boa$/,
    );
    expect(screen.getByTestId('share-preview-favorite')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('share-format-post'));
    expect(screen.getByTestId('share-preview-year-title')).toHaveTextContent(/viagens, 6 países$/);
    expect(screen.getByTestId('share-preview-favorite')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('share-format-square'));
    expect(screen.queryByTestId('share-preview-favorite')).toBeNull();
  });

  it('shows 4 itinerary days, 2 in 1:1', async () => {
    mockParams = { subject: 'roteiro', roteiroId: 'peru' };
    await renderWithProviders(<ShareScreen />);
    expect(screen.getAllByTestId('share-preview-day')).toHaveLength(4);
    expect(screen.getByText('DIA 1')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('share-format-square'));
    expect(screen.getAllByTestId('share-preview-day')).toHaveLength(2);
  });

  it('uses the achievement from the route', async () => {
    mockParams = { subject: 'ach', ach: 'Primeira viagem' };
    await renderWithProviders(<ShareScreen />);
    expect(screen.getByText('Primeira viagem')).toBeOnTheScreen();
    expect(screen.getByText('Rio de Janeiro · 2019')).toBeOnTheScreen();
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

  it('opens the native share sheet with the link', async () => {
    await renderWithProviders(<ShareScreen />);
    await fireEvent.press(screen.getByTestId('share-dest-whatsapp'));
    expect(shareSpy).toHaveBeenCalledWith({
      message: 'Meu mundo no Worlo: https://worlo.app/anaviaja',
    });
  });

  it('saves the image and copies the link with toasts', async () => {
    await renderWithProviders(<ShareScreen />);
    await fireEvent.press(screen.getByTestId('share-dest-save'));
    expect(screen.getByText('Imagem salva na galeria.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('share-dest-link'));
    expect(screen.getByText('Link copiado.')).toBeOnTheScreen();
    expect(shareSpy).not.toHaveBeenCalled();
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
