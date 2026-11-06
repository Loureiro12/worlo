import { act, fireEvent, screen } from '@testing-library/react-native';
import { schema } from '@worlo/db';
import { eq } from 'drizzle-orm';
import { Linking } from 'react-native';
import { dataEvents } from '@/data/events';
import { repos, setCurrentUserId } from '@/data/repositories';
import { isSaved } from '@/data/saved';
import { db } from '@/lib/database';
import { DEMO_USER } from '@/mocks/demo';
import type { Tour } from '@/mocks/types';
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
/** The team sets each tour's booking page in the catalog (Supabase dashboard). */
const setTourBookingUrl = (key: string, bookingUrl: string) => {
  const id = `passeios:${key}`;
  const row = db.select().from(schema.catalog).where(eq(schema.catalog.id, id)).get();
  db.update(schema.catalog)
    .set({ data: { ...(row?.data as Tour), bookingUrl } })
    .where(eq(schema.catalog.id, id))
    .run();
  dataEvents.emit();
};

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
  mockParams = {};
  setCurrentUserId(DEMO_USER.id);
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

  it('saves and removes a tour with the heart', async () => {
    await renderWithProviders(<PasseiosScreen />);
    // "Vale Sagrado" is not in the mock saved list.
    await fireEvent.press(screen.getByTestId('passeio-card-save-valle'));
    expect(repos.saved.items().find((s) => s.refId === 'pas-valle')).toMatchObject({
      name: 'Vale Sagrado em um dia',
      category: 'Passeios',
      city: 'Cusco',
      flag: '🇵🇪',
    });
    expect(screen.getByText('Salvo nos seus lugares.')).toBeOnTheScreen();
    expect(screen.getByTestId('passeio-card-save-valle')).toHaveAccessibleName(
      'Remover dos salvos',
    );
    await fireEvent.press(screen.getByTestId('passeio-card-save-valle'));
    expect(isSaved('pas-valle')).toBe(false);
    expect(screen.getByText('Removido dos salvos.')).toBeOnTheScreen();
  });

  it('shows the tours stored in the catalog (SQLite), live', async () => {
    await renderWithProviders(<PasseiosScreen />);
    expect(screen.getByText('Pôr do sol de veleiro no Tejo')).toBeOnTheScreen();
    // A content edit pulled from Supabase lands in the catalog table.
    const row = db
      .select()
      .from(schema.catalog)
      .where(eq(schema.catalog.id, 'passeios:tejo'))
      .get();
    await act(() => {
      db.update(schema.catalog)
        .set({ data: { ...(row?.data as Tour), name: 'Veleiro no Tejo ao entardecer' } })
        .where(eq(schema.catalog.id, 'passeios:tejo'))
        .run();
      dataEvents.emit();
    });
    expect(screen.getByText('Veleiro no Tejo ao entardecer')).toBeOnTheScreen();
    expect(screen.queryByText('Pôr do sol de veleiro no Tejo')).toBeNull();
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
    expect(screen.getByTestId('passeio-total')).toHaveTextContent('€ 45');
  });

  it('"Reservar" opens the supplier\'s booking page, no booking inside Worlo', async () => {
    setTourBookingUrl('tejo', 'https://barcos.example.com/reservar?tour=tejo');
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderWithProviders(<PasseioScreen />);
    expect(screen.queryByTestId('passeio-date-0')).toBeNull();
    expect(screen.queryByTestId('passeio-people')).toBeNull();
    expect(screen.getByTestId('passeio-external-note')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('passeio-book'));
    expect(open).toHaveBeenCalledWith('https://barcos.example.com/reservar?tour=tejo');
    open.mockRestore();
  });

  it('without a booking link the button says so and does nothing', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderWithProviders(<PasseioScreen />);
    expect(screen.getByTestId('passeio-book')).toBeDisabled();
    expect(screen.getByText('Reserva pelo fornecedor em breve')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('passeio-book'));
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it('toggles the save from the hero heart', async () => {
    // The Tejo tour starts saved in the mocks.
    await renderWithProviders(<PasseioScreen />);
    expect(screen.getByTestId('passeio-save')).toHaveAccessibleName('Remover dos salvos');
    await fireEvent.press(screen.getByTestId('passeio-save'));
    expect(isSaved('pas-tejo')).toBe(false);
    expect(screen.getByTestId('passeio-save')).toHaveAccessibleName('Salvar passeio');
    await fireEvent.press(screen.getByTestId('passeio-save'));
    expect(isSaved('pas-tejo')).toBe(true);
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
    const base = { name: '', type: 'guide' as const, city: '', desc: '', email: 'x', link: '' };
    expect(anuncieError(base)).toBe('name');
    expect(anuncieError({ ...base, name: 'Rio Tejo' })).toBe('city');
    expect(anuncieError({ ...base, name: 'Rio Tejo', city: 'Lisboa' })).toBe('email');
    const ok = { ...base, name: 'Rio Tejo', city: 'Lisboa', email: 'a@b.pt' };
    expect(anuncieError(ok)).toBeNull();
    // The booking link is optional, but has to be a web link.
    expect(anuncieError({ ...ok, link: 'rio-tejo.pt' })).toBe('link');
    expect(anuncieError({ ...ok, link: 'https://rio-tejo.pt/reservar' })).toBeNull();
  });

  it('sends the booking link with the sign-up', async () => {
    await renderWithProviders(<AnuncieScreen />);
    await fireEvent.changeText(screen.getByTestId('anuncie-name'), 'Barcos do Tejo');
    await fireEvent.changeText(screen.getByTestId('anuncie-city'), 'Lisboa');
    await fireEvent.changeText(screen.getByTestId('anuncie-email'), 'oi@barcos.pt');
    await fireEvent.changeText(screen.getByTestId('anuncie-link'), 'https://barcos.pt/reservar');
    await fireEvent.press(screen.getByTestId('anuncie-submit'));
    expect(repos.businesses.mine()[0]).toMatchObject({
      name: 'Barcos do Tejo',
      bookingUrl: 'https://barcos.pt/reservar',
    });
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
    expect(repos.businesses.mine()).toMatchObject([
      {
        name: 'Rio Tejo Sailing',
        type: 'agency',
        city: 'Lisboa',
        email: 'contato@riotejo.pt',
        status: 'review',
      },
    ]);
    expect(screen.getByTestId('anuncie-submit')).toHaveAccessibleName('Voltar para passeios');
    await submit();
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
