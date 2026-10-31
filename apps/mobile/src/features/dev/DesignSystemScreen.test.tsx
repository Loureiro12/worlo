import { screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test-utils';
import { DesignSystemScreen } from './DesignSystemScreen';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));

describe('DesignSystemScreen', () => {
  it('renders every section of the catalogue', async () => {
    await renderWithProviders(<DesignSystemScreen />);
    for (const title of [
      'Cores',
      'Tipografia',
      'Botões',
      'Campos',
      'Seleção',
      'Cards',
      'Pessoas e status',
      'Estados',
      'Globo e marca',
    ]) {
      expect(screen.getByText(title)).toBeOnTheScreen();
    }
  });
});
