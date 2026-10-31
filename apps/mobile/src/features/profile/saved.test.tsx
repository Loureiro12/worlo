import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { repos } from '@/data/repositories';
import { createCollection, isSaved } from '@/data/saved';
import { demoId } from '@/mocks/demo';
import { routes } from '@/navigation/routes';
import { resetStore } from '@/store';
import { renderWithProviders } from '@/test-utils';
import { CollectionScreen } from './CollectionScreen';
import { CollectionsScreen } from './CollectionsScreen';
import { SavedScreen } from './SavedScreen';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() };
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

/** A demo collection (`c1`…) as stored in SQLite. */
const collection = (key: string) =>
  repos.saved.collections().find((c) => c.id === demoId(`collection:${key}`));
const savedRefs = () => repos.saved.items().map((i) => i.refId);

describe('SavedScreen', () => {
  it('summarizes places and cities and groups them by city', async () => {
    await renderWithProviders(<SavedScreen />);
    expect(screen.getByTestId('saved-screen')).toBeOnTheScreen();
    expect(screen.getByText('8 lugares em 4 cidades')).toBeOnTheScreen();
    expect(screen.getByText('🇵🇹 Lisboa · 4')).toBeOnTheScreen();
    expect(screen.getByText('🇯🇵 Kyoto · 2')).toBeOnTheScreen();
    // Item meta: category · meta, rating and "em N coleções".
    const item = within(screen.getByTestId('saved-item-sv-kiyomizu'));
    expect(item.getByText('Atrações · Templo · abre às 6h')).toBeOnTheScreen();
    expect(item.getByText('· em 2 coleções')).toBeOnTheScreen();
  });

  it('filters by category and shows the empty category message', async () => {
    await renderWithProviders(<SavedScreen />);
    await fireEvent.press(screen.getByTestId('saved-filter-Hospedagem'));
    expect(screen.getByTestId('saved-item-sv-ryokan')).toBeOnTheScreen();
    expect(screen.queryByTestId('saved-item-sv-kiyomizu')).toBeNull();
    expect(screen.getByText('🇯🇵 Kyoto · 1')).toBeOnTheScreen();

    await act(() => {
      for (const item of repos.saved.items().filter((x) => x.category === 'Passeios')) {
        repos.saved.toggle({ refId: item.refId });
      }
    });
    await fireEvent.press(screen.getByTestId('saved-filter-Passeios'));
    expect(screen.getByText('Nada salvo nessa categoria.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('saved-filter-all'));
    expect(screen.getByTestId('saved-item-sv-kiyomizu')).toBeOnTheScreen();
  });

  it('removes from saved and from every collection, with an info toast', async () => {
    await renderWithProviders(<SavedScreen />);
    expect(collection('c2')?.itemIds).toContain('sv-kiyomizu');
    await fireEvent.press(screen.getByTestId('saved-remove-sv-kiyomizu'));
    expect(isSaved('sv-kiyomizu')).toBe(false);
    expect(savedRefs()).toHaveLength(7);
    expect(collection('c2')?.itemIds).not.toContain('sv-kiyomizu');
    expect(collection('c3')?.itemIds).not.toContain('sv-kiyomizu');
    expect(screen.queryByTestId('saved-item-sv-kiyomizu')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('Removido dos salvos.');
    expect(screen.getByText('7 lugares em 4 cidades')).toBeOnTheScreen();
  });

  it('opens the collection sheet for an item and toggles a collection', async () => {
    await renderWithProviders(<SavedScreen />);
    await fireEvent.press(screen.getByTestId('saved-collect-sv-ryokan'));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Comer em Lisboa' }));
    expect(collection('c1')?.itemIds).toContain('sv-ryokan');
    // Toggling again takes it out (still saved).
    await fireEvent.press(screen.getByTestId('collection-option-c1'));
    expect(collection('c1')?.itemIds).not.toContain('sv-ryokan');
    expect(isSaved('sv-ryokan')).toBe(true);
  });

  it('creates a collection with the item as its first place, persisted in SQLite', async () => {
    await renderWithProviders(<SavedScreen />);
    await fireEvent.press(screen.getByTestId('saved-collect-sv-ryokan'));
    await fireEvent.changeText(screen.getByTestId('new-collection-input'), 'Ryokans');
    await fireEvent.press(screen.getByTestId('create-collection'));
    const created = repos.saved.collections().find((c) => c.name === 'Ryokans');
    expect(created?.itemIds).toEqual(['sv-ryokan']);
    expect(screen.getByRole('alert')).toHaveTextContent('Coleção "Ryokans" criada.');
    // New collections (uuid) show up in the sheet and on the screen.
    expect(screen.getByTestId(`collection-option-${created?.id}`)).toBeChecked();
    expect(screen.getByTestId(`saved-collection-${created?.id}`)).toBeOnTheScreen();
  });

  it('navigates to the collections and to one collection', async () => {
    await renderWithProviders(<SavedScreen />);
    await fireEvent.press(screen.getByTestId('saved-see-collections'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.collections);
    await fireEvent.press(screen.getByTestId('saved-collection-c3'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.collection(demoId('collection:c3')));
  });

  it('shows the first-use empty state', async () => {
    for (const item of repos.saved.items()) repos.saved.toggle({ refId: item.refId });
    await renderWithProviders(<SavedScreen />);
    expect(screen.getByText('Você ainda não salvou nenhum lugar.')).toBeOnTheScreen();
    expect(
      screen.getByText('Toque no marcador de qualquer lugar pra guardar aqui.'),
    ).toBeOnTheScreen();
  });
});

describe('CollectionsScreen', () => {
  it('lists collections with counts and opens one', async () => {
    await renderWithProviders(<CollectionsScreen />);
    expect(screen.getByText('Mirantes pelo mundo')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Pra ir com a Marina, 1 lugar' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('collections-item-c2'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.collection(demoId('collection:c2')));
  });

  it('creates a new collection from the dashed tile', async () => {
    await renderWithProviders(<CollectionsScreen />);
    await fireEvent.press(screen.getByTestId('collections-new'));
    await fireEvent.changeText(screen.getByTestId('new-collection-input'), 'Praias');
    await fireEvent.press(screen.getByTestId('create-collection'));
    expect(repos.saved.collections().at(-1)).toMatchObject({ name: 'Praias', itemIds: [] });
    expect(screen.getByText('Praias')).toBeOnTheScreen();
  });
});

describe('CollectionScreen', () => {
  it('shows the summary and removes an item from the collection', async () => {
    mockParams = { id: demoId('collection:c3') };
    await renderWithProviders(<CollectionScreen />);
    expect(screen.getByText('Japão 2027')).toBeOnTheScreen();
    expect(screen.getByTestId('collection-summary')).toHaveTextContent('3 lugares · 2 cidades');
    await fireEvent.press(screen.getByTestId('collection-remove-sv-ichiran'));
    expect(collection('c3')?.itemIds).not.toContain('sv-ichiran');
    // Still saved: only left the collection.
    expect(isSaved('sv-ichiran')).toBe(true);
    expect(screen.getByTestId('collection-summary')).toHaveTextContent('2 lugares · 1 cidade');
    expect(screen.getByRole('alert')).toHaveTextContent('Tirado da coleção.');
  });

  it('adds from saved through the sheet, listing only items outside the collection', async () => {
    mockParams = { id: demoId('collection:c4') };
    await renderWithProviders(<CollectionScreen />);
    await fireEvent.press(screen.getByTestId('collection-add'));
    expect(screen.queryByTestId('collection-pick-pas-tejo')).toBeNull();
    await fireEvent.press(screen.getByTestId('collection-pick-sv-ryokan'));
    expect(collection('c4')?.itemIds).toEqual(['pas-tejo', 'sv-ryokan']);
    expect(screen.queryByTestId('collection-pick-sv-ryokan')).toBeNull();
  });

  it('shows the dashed empty state for an empty collection', async () => {
    const created = createCollection('Vazia');
    mockParams = { id: created.id };
    await renderWithProviders(<CollectionScreen />);
    expect(screen.getByText('Coleção vazia, por enquanto.')).toBeOnTheScreen();
    expect(screen.getByTestId('collection-summary')).toHaveTextContent('0 lugares · 0 cidades');
  });

  it('handles an unknown collection id', async () => {
    mockParams = { id: 'nope' };
    await renderWithProviders(<CollectionScreen />);
    expect(screen.getByText('Essa coleção não existe mais.')).toBeOnTheScreen();
  });
});
