import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { pendingErrorReports } from '@/lib/errorLog';
import { renderWithProviders } from '@/test-utils';
import { AppErrorBoundary } from './AppErrorBoundary';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { replace: (href: string) => mockReplace(href) } }));

let mockFail = true;
function Flaky() {
  if (mockFail) throw new Error('days is undefined');
  return <Text>Roteiro</Text>;
}

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    mockFail = true;
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('shows a recoverable screen instead of closing the app, and records why', async () => {
    await renderWithProviders(
      <AppErrorBoundary>
        <Flaky />
      </AppErrorBoundary>,
    );
    expect(screen.getByText('Algo deu errado nesta tela')).toBeOnTheScreen();
    expect(pendingErrorReports().at(-1)).toMatchObject({
      fatal: true,
      message: 'days is undefined',
      context: expect.stringMatching(/^render/),
    });

    mockFail = false;
    await fireEvent.press(screen.getByText('Tentar de novo'));
    expect(screen.getByText('Roteiro')).toBeOnTheScreen();
  });

  it('can go back to the start', async () => {
    await renderWithProviders(
      <AppErrorBoundary>
        <Flaky />
      </AppErrorBoundary>,
    );
    mockFail = false;
    await fireEvent.press(screen.getByText('Voltar pro início'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
