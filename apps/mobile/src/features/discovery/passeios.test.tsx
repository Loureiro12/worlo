import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { schema } from '@worlo/db';
import { eq } from 'drizzle-orm';
import { bookTour, cancelBooking } from '@/data/bookings';
import { dataEvents } from '@/data/events';
import { repos, setCurrentUserId } from '@/data/repositories';
import { isSaved } from '@/data/saved';
import { db } from '@/lib/database';
import { dateParts } from '@/lib/format';
import { DEMO_USER } from '@/mocks/demo';
import { Day } from '@/mocks/demoWorld';
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
// Booking is an online RPC; the fake server below answers like book_tour / cancel_booking.
jest.mock('@/data/bookings', () => ({
  ...jest.requireActual('@/data/bookings'),
  bookTour: jest.fn(),
  cancelBooking: jest.fn(),
}));

const PRICE = { tejo: 45, fado: 38 } as Record<string, number>;
const bookingRow = (slotId: string, people: number, status = 'confirmed') => {
  const slot = repos.tours.slot(slotId);
  if (!slot) throw new Error(`no slot ${slotId}`);
  const now = new Date().toISOString();
  return {
    id: `booking-${slot.tourId}`,
    user_id: DEMO_USER.id,
    tour_id: slot.tourId,
    slot_id: slot.id,
    date: slot.date,
    people,
    total: (PRICE[slot.tourId] ?? 0) * people,
    currency: '€',
    status,
    cancelled_at: status === 'cancelled' ? now : null,
    reminded_at: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
};
const book = (slotId: string, people: number) =>
  repos.bookings.applyBooking(bookingRow(slotId, people));
/** The tour's open dates (from the demo world: day +1 … +6, the 3rd sold out). */
const slotsOf = (tourId: string) => repos.tours.slots(tourId, '0000-00-00');
/** "sáb, 7 nov" for the date `i` days after tomorrow. */
const dateLabel = (i: number) => {
  const { weekday, day, month } = dateParts(new Day(i + 1).toISODate(), 'pt-BR');
  return `${weekday}, ${day} ${month}`;
};

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
  mockParams = {};
  setCurrentUserId(DEMO_USER.id);
  jest.mocked(bookTour).mockImplementation(async (slotId, people) => {
    const booking = book(slotId, people);
    return booking ? { ok: true, booking } : { ok: false, reason: 'error' };
  });
  jest.mocked(cancelBooking).mockImplementation(async (id) => {
    const current = repos.bookings.get(id);
    const booking =
      current &&
      repos.bookings.applyBooking(bookingRow(current.slotId, current.people, 'cancelled'));
    return booking ? { ok: true, booking } : { ok: false, reason: 'error' };
  });
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
    await act(() => {
      book(slotsOf('fado')[1]?.id ?? '', 2);
    });
    await renderWithProviders(<PasseiosScreen />);
    expect(screen.getByTestId('passeio-card-booked-fado')).toBeOnTheScreen();
    expect(screen.queryByTestId('passeio-card-booked-tejo')).toBeNull();
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
    expect(screen.getByText('€ 45 por pessoa')).toBeOnTheScreen();
  });

  it('shows the next open dates from the server, the sold-out one dimmed', async () => {
    await renderWithProviders(<PasseioScreen />);
    for (let i = 0; i < 6; i++) {
      const { weekday, day } = dateParts(new Day(i + 1).toISODate(), 'pt-BR');
      expect(within(screen.getByTestId(`passeio-date-${i}`)).getByText(weekday)).toBeOnTheScreen();
      expect(within(screen.getByTestId(`passeio-date-${i}`)).getByText(day)).toBeOnTheScreen();
    }
    expect(screen.queryByTestId('passeio-date-6')).toBeNull();
    expect(screen.getByTestId('passeio-date-2')).toHaveAccessibleName(`${dateLabel(2)}, esgotado`);
  });

  it('starts on the 2nd date with 2 people and multiplies the total', async () => {
    await renderWithProviders(<PasseioScreen />);
    expect(screen.getByTestId('passeio-total')).toHaveTextContent('€ 90');
    expect(screen.getByTestId('passeio-when')).toHaveTextContent(`${dateLabel(1)} · 2 pessoas`);
    await fireEvent.press(screen.getByTestId('passeio-people-plus'));
    expect(screen.getByTestId('passeio-total')).toHaveTextContent('€ 135');
    for (let i = 0; i < 3; i++) await fireEvent.press(screen.getByTestId('passeio-people-minus'));
    expect(screen.getByTestId('passeio-total')).toHaveTextContent('€ 45');
    expect(screen.getByTestId('passeio-when')).toHaveTextContent(`${dateLabel(1)} · 1 pessoa`);
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
    expect(screen.getByTestId('passeio-when')).toHaveTextContent(`${dateLabel(4)} · 2 pessoas`);
  });

  it('books on the server, then shows "Reservado" and the booking sheet to cancel', async () => {
    await renderWithProviders(<PasseioScreen />);
    await fireEvent.press(screen.getByTestId('passeio-people-plus'));
    await fireEvent.press(screen.getByTestId('passeio-book'));
    const slot = slotsOf('tejo')[1];
    expect(bookTour).toHaveBeenCalledWith(slot?.id, 3, expect.any(Boolean));
    expect(repos.bookings.forTour('tejo')).toMatchObject({ people: 3, total: 135 });
    expect(repos.tours.slot(slot?.id ?? '')?.booked).toBe(3);
    expect(
      screen.getByText(`Reserva confirmada pra ${dateLabel(1)}. Bom passeio!`),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('passeio-book')).toHaveAccessibleName('Reservado');
    expect(screen.getByTestId('passeio-people-plus')).toBeDisabled();

    await fireEvent.press(screen.getByTestId('passeio-book'));
    expect(screen.getByTestId('booking-sheet')).toBeOnTheScreen();
    expect(screen.getByText(`${dateLabel(1)} · 3 pessoas · € 135`)).toBeOnTheScreen();
    expect(
      screen.getByText('O pagamento é feito direto com Rio Tejo Sailing, no dia do passeio.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('booking-cancel'));
    expect(cancelBooking).toHaveBeenCalledWith('booking-tejo', expect.any(Boolean));
    expect(screen.getByText('Reserva cancelada. As vagas voltaram pro passeio.')).toBeOnTheScreen();
    expect(screen.getByTestId('passeio-book')).toHaveAccessibleName('Reservar');
    expect(repos.tours.slot(slot?.id ?? '')?.booked).toBe(0);
  });

  it('opens on the booked date and people', async () => {
    await act(() => {
      book(slotsOf('tejo')[4]?.id ?? '', 5);
    });
    await renderWithProviders(<PasseioScreen />);
    expect(screen.getByTestId('passeio-date-4')).toBeChecked();
    expect(screen.getByTestId('passeio-when')).toHaveTextContent(`${dateLabel(4)} · 5 pessoas`);
    expect(screen.getByTestId('passeio-total')).toHaveTextContent('€ 225');
  });

  it('explains when the server refuses or there are fewer seats left', async () => {
    jest.mocked(bookTour).mockResolvedValueOnce({ ok: false, reason: 'soldOut' });
    await renderWithProviders(<PasseioScreen />);
    await fireEvent.press(screen.getByTestId('passeio-book'));
    expect(screen.getByText('Esse dia esgotou. Tenta outro?')).toBeOnTheScreen();
    expect(screen.getByTestId('passeio-book')).toHaveAccessibleName('Reservar');

    const slot = slotsOf('tejo')[1];
    await act(() => {
      db.update(schema.tourSlots)
        .set({ booked: 11 })
        .where(eq(schema.tourSlots.id, slot?.id ?? ''))
        .run();
      dataEvents.emit();
    });
    jest.mocked(bookTour).mockClear();
    await fireEvent.press(screen.getByTestId('passeio-book'));
    expect(screen.getByText('Só sobrou 1 vaga nesse dia.')).toBeOnTheScreen();
    expect(bookTour).not.toHaveBeenCalled();
  });

  it('says so when the tour has no open dates', async () => {
    db.delete(schema.tourSlots).where(eq(schema.tourSlots.tourId, 'tejo')).run();
    await renderWithProviders(<PasseioScreen />);
    expect(screen.getByTestId('passeio-no-dates')).toBeOnTheScreen();
    expect(screen.getByTestId('passeio-book')).toBeDisabled();
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
