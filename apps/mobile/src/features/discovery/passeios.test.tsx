import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { resetStore, useStore } from '@/store';
import { renderWithProviders } from '@/test-utils';
import { AnuncieScreen, anuncieError } from './AnuncieScreen';
import { PasseioScreen } from './PasseioScreen';
import { PasseiosScreen } from './PasseiosScreen';

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
  replace: jest.fn(),
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
  mockParams = {};
});

const cardIds = () =>
  screen.queryAllByTestId(/^passeio-card-[a-z]+$/).map((el) => el.props.testID as string);

describe('PasseiosScreen (E1)', () => {
  it('lists every tour with price, meta and host', async () => {
    await renderWithProviders(<PasseiosScreen />);
    expect(screen.getByTestId('passeios-screen')).toBeOnTheScreen();
    expect(screen.getByText('Passeios e experiências')).toBeOnTheScreen();
    expect(cardIds()).toEqual([
      'passeio-card-tejo',
      'passeio-card-nata',
      'passeio-card-lagoinha',
      'passeio-card-fado',
      'passeio-card-valle',
    ]);
    expect(screen.getByText('a partir de € 45')).toBeOnTheScreen();
    expect(screen.getByText('Lisboa · 2h')).toBeOnTheScreen();
    expect(screen.getByText('(312)')).toBeOnTheScreen();
    expect(screen.getByText('por Rio Tejo Sailing')).toBeOnTheScreen();
  });

  it('filters by category chip', async () => {
    await renderWithProviders(<PasseiosScreen />);
    await fireEvent.press(screen.getByTestId('passeios-filter-culture'));
    expect(cardIds()).toEqual(['passeio-card-fado', 'passeio-card-valle']);
    await fireEvent.press(screen.getByTestId('passeios-filter-boat'));
    expect(cardIds()).toEqual(['passeio-card-tejo']);
    await fireEvent.press(screen.getByTestId('passeios-filter-all'));
    expect(cardIds()).toHaveLength(5);
  });

  it('searches name and place without accents, combined with the chip', async () => {
    await renderWithProviders(<PasseiosScreen />);
    await fireEvent.changeText(screen.getByTestId('passeios-search'), 'florianopolis');
    expect(cardIds()).toEqual(['passeio-card-lagoinha']);
    await fireEvent.changeText(screen.getByTestId('passeios-search'), 'lisboa');
    await fireEvent.press(screen.getByTestId('passeios-filter-food'));
    expect(cardIds()).toEqual(['passeio-card-nata']);
  });

  it('shows the empty state when nothing matches', async () => {
    await renderWithProviders(<PasseiosScreen />);
    await fireEvent.changeText(screen.getByTestId('passeios-search'), 'tóquio');
    expect(cardIds()).toEqual([]);
    expect(
      screen.getByText('Nenhum passeio com esse filtro. Tenta outra busca?'),
    ).toBeOnTheScreen();
  });

  it('shows "Reservado" on booked tours', async () => {
    useStore.getState().book('fado', { dateIndex: 1, people: 2 });
    await renderWithProviders(<PasseiosScreen />);
    expect(screen.getByTestId('passeio-card-booked-fado')).toBeOnTheScreen();
    expect(screen.queryByTestId('passeio-card-booked-tejo')).toBeNull();
  });

  it('saves and removes a tour with the heart', async () => {
    await renderWithProviders(<PasseiosScreen />);
    // "Vale Sagrado" is not in the mock saved list.
    await fireEvent.press(screen.getByTestId('passeio-card-save-valle'));
    expect(useStore.getState().saved.find((s) => s.id === 'pas-valle')).toMatchObject({
      name: 'Vale Sagrado em um dia',
      cat: 'Passeios',
      city: 'Cusco',
      flag: '🇵🇪',
    });
    expect(screen.getByText('Salvo nos seus lugares.')).toBeOnTheScreen();
    expect(screen.getByTestId('passeio-card-save-valle')).toHaveAccessibleName(
      'Remover dos salvos',
    );
    await fireEvent.press(screen.getByTestId('passeio-card-save-valle'));
    expect(useStore.getState().isSaved('pas-valle')).toBe(false);
    expect(screen.getByText('Removido dos salvos.')).toBeOnTheScreen();
  });

  it('opens a tour and the Anuncie screen', async () => {
    await renderWithProviders(<PasseiosScreen />);
    await fireEvent.press(screen.getByTestId('passeio-card-nata'));
    expect(mockRouter.push).toHaveBeenCalledWith('/passeio/nata');
    await fireEvent.press(screen.getByTestId('passeios-anuncie'));
    expect(mockRouter.push).toHaveBeenCalledWith('/anuncie');
  });

  it('is blocked offline and shows the skeleton while loading', async () => {
    useStore.getState().setDemo('offline');
    const view = await renderWithProviders(<PasseiosScreen />);
    expect(screen.getByText('Você está sem internet')).toBeOnTheScreen();
    await act(() => useStore.getState().setDemo('loading'));
    expect(screen.getByText('Carregando…')).toBeOnTheScreen();
    view.unmount();
  });
});

describe('PasseioScreen (E2)', () => {
  beforeEach(() => {
    mockParams = { id: 'tejo' };
  });

  it('renders the tour detail', async () => {
    await renderWithProviders(<PasseioScreen />);
    expect(screen.getByTestId('passeio-screen')).toBeOnTheScreen();
    expect(screen.getByText('Barco · Lisboa')).toBeOnTheScreen();
    expect(screen.getByText('Pôr do sol de veleiro no Tejo')).toBeOnTheScreen();
    expect(screen.getByText('· 312 avaliações')).toBeOnTheScreen();
    expect(screen.getByText('Negócio verificado')).toBeOnTheScreen();
    expect(screen.getByText('Vinho do Porto e petiscos')).toBeOnTheScreen();
    expect(screen.getByText('Doca de Santo Amaro, Alcântara')).toBeOnTheScreen();
    expect(screen.getByText('€ 45 por pessoa')).toBeOnTheScreen();
  });

  it('starts on sáb 7 with 2 people and multiplies the total', async () => {
    await renderWithProviders(<PasseioScreen />);
    expect(screen.getByTestId('passeio-total')).toHaveTextContent('€ 90');
    expect(screen.getByTestId('passeio-when')).toHaveTextContent('sáb, 7 nov · 2 pessoas');
    await fireEvent.press(screen.getByTestId('passeio-people-plus'));
    expect(screen.getByTestId('passeio-total')).toHaveTextContent('€ 135');
    for (let i = 0; i < 3; i++) await fireEvent.press(screen.getByTestId('passeio-people-minus'));
    expect(screen.getByTestId('passeio-total')).toHaveTextContent('€ 45');
    expect(screen.getByTestId('passeio-when')).toHaveTextContent('sáb, 7 nov · 1 pessoa');
    expect(screen.getByTestId('passeio-people-minus')).toBeDisabled();
  });

  it('caps people at 12 and formats thousands', async () => {
    mockParams = { id: 'valle' };
    await renderWithProviders(<PasseioScreen />);
    for (let i = 0; i < 12; i++) await fireEvent.press(screen.getByTestId('passeio-people-plus'));
    expect(screen.getByTestId('passeio-people-value')).toHaveTextContent('12');
    expect(screen.getByTestId('passeio-people-plus')).toBeDisabled();
    expect(screen.getByTestId('passeio-total')).toHaveTextContent('R$ 3.360');
  });

  it('keeps the date when tapping the sold-out day', async () => {
    await renderWithProviders(<PasseioScreen />);
    await fireEvent.press(screen.getByTestId('passeio-date-2'));
    expect(screen.getByText('Esse dia esgotou. Tenta outro?')).toBeOnTheScreen();
    expect(screen.getByTestId('passeio-date-2')).not.toBeChecked();
    expect(screen.getByTestId('passeio-date-1')).toBeChecked();
    expect(within(screen.getByTestId('passeio-date-2')).getByText('esgotado')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('passeio-date-4'));
    expect(screen.getByTestId('passeio-when')).toHaveTextContent('ter, 10 nov · 2 pessoas');
  });

  it('books once and turns the button into "Reservado"', async () => {
    await renderWithProviders(<PasseioScreen />);
    await fireEvent.press(screen.getByTestId('passeio-people-plus'));
    await fireEvent.press(screen.getByTestId('passeio-book'));
    expect(useStore.getState().bookings.tejo).toEqual({ dateIndex: 1, people: 3 });
    expect(screen.getByText('Reserva confirmada pra sáb, 7 nov. Bom passeio!')).toBeOnTheScreen();
    expect(screen.getByTestId('passeio-book')).toHaveAccessibleName('Reservado');
    await fireEvent.press(screen.getByTestId('passeio-book'));
    expect(screen.getByText('Você já reservou esse passeio.')).toBeOnTheScreen();
  });

  it('toggles the save from the hero heart', async () => {
    // The Tejo tour starts saved in the mocks.
    await renderWithProviders(<PasseioScreen />);
    expect(screen.getByTestId('passeio-save')).toHaveAccessibleName('Remover dos salvos');
    await fireEvent.press(screen.getByTestId('passeio-save'));
    expect(useStore.getState().isSaved('pas-tejo')).toBe(false);
    expect(screen.getByTestId('passeio-save')).toHaveAccessibleName('Salvar passeio');
    await fireEvent.press(screen.getByTestId('passeio-save'));
    expect(useStore.getState().isSaved('pas-tejo')).toBe(true);
  });

  it('is blocked offline', async () => {
    useStore.getState().setDemo('offline');
    await renderWithProviders(<PasseioScreen />);
    expect(screen.queryByTestId('passeio-screen')).toBeNull();
    expect(screen.getByText('Você está sem internet')).toBeOnTheScreen();
  });
});

describe('AnuncieScreen (E3)', () => {
  it('validates name → city → email in order', () => {
    const base = { name: '', type: 'guide' as const, city: '', desc: '', email: 'x' };
    expect(anuncieError(base)).toBe('name');
    expect(anuncieError({ ...base, name: 'Rio Tejo' })).toBe('city');
    expect(anuncieError({ ...base, name: 'Rio Tejo', city: 'Lisboa' })).toBe('email');
    expect(anuncieError({ ...base, name: 'Rio Tejo', city: 'Lisboa', email: 'a@b.pt' })).toBeNull();
  });

  it('shows one error at a time and then the success state', async () => {
    await renderWithProviders(<AnuncieScreen />);
    expect(screen.getByText('Anuncie seus passeios no Worlo')).toBeOnTheScreen();
    const submit = () => fireEvent.press(screen.getByTestId('anuncie-submit'));

    await submit();
    expect(screen.getByTestId('anuncie-error')).toHaveTextContent('Falta o nome do negócio.');
    await fireEvent.changeText(screen.getByTestId('anuncie-name'), 'Rio Tejo Sailing');
    expect(screen.queryByTestId('anuncie-error')).toBeNull();

    await submit();
    expect(screen.getByTestId('anuncie-error')).toHaveTextContent('Diga em qual cidade você atua.');
    await fireEvent.changeText(screen.getByTestId('anuncie-city'), 'Lisboa');
    await fireEvent.changeText(screen.getByTestId('anuncie-email'), 'contato@rio');
    await submit();
    expect(screen.getByTestId('anuncie-error')).toHaveTextContent('Confere o e-mail de contato.');

    await fireEvent.press(screen.getByTestId('anuncie-type-agency'));
    expect(screen.getByTestId('anuncie-type-agency')).toBeSelected();
    await fireEvent.changeText(screen.getByTestId('anuncie-email'), 'contato@riotejo.pt');
    await submit();
    expect(screen.getByTestId('anuncie-success')).toBeOnTheScreen();
    expect(screen.getByText('Recebemos seu cadastro.')).toBeOnTheScreen();
    expect(
      screen.getByText(
        /Rio Tejo Sailing e responde em até 2 dias úteis no e-mail contato@riotejo\.pt/,
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('anuncie-submit')).toHaveAccessibleName('Voltar para passeios');
    await submit();
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
