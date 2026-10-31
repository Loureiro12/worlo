import { fireEvent, screen } from '@testing-library/react-native';
import { resetStore, useStore } from '@/store';
import { renderWithProviders } from '@/test-utils';
import { SaveToCollectionSheet } from './SaveToCollectionSheet';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

beforeEach(() => resetStore());

describe('SaveToCollectionSheet', () => {
  it('toggles the item in a collection', async () => {
    await renderWithProviders(
      <SaveToCollectionSheet
        visible
        onClose={() => {}}
        itemId="sv-ryokan"
        itemName="Ryokan Yachiyo"
      />,
    );
    const option = screen.getByRole('checkbox', { name: 'Comer em Lisboa' });
    expect(option).not.toBeChecked();
    await fireEvent.press(option);
    expect(useStore.getState().collections.find((c) => c.id === 'c1')?.ids).toContain('sv-ryokan');
  });

  it('requires a name to create a collection, then creates it with the item', async () => {
    await renderWithProviders(
      <SaveToCollectionSheet visible onClose={() => {}} itemId="sv-ryokan" />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Criar' }));
    expect(screen.getByLabelText('Nome da nova coleção')).toHaveProp('aria-invalid', true);

    await fireEvent.changeText(screen.getByLabelText('Nome da nova coleção'), 'Ryokans');
    await fireEvent.press(screen.getByRole('button', { name: 'Criar' }));
    const created = useStore.getState().collections.at(-1);
    expect(created).toMatchObject({ name: 'Ryokans', ids: ['sv-ryokan'] });
    expect(screen.getByRole('alert')).toHaveTextContent('Coleção "Ryokans" criada.');
  });
});
