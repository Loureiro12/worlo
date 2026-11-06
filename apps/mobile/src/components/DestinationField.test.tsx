import { act, fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';
import type { Place } from '@/lib/places';
import { renderWithProviders } from '@/test-utils';
import { DestinationField } from './DestinationField';

function Harness({ onPick }: { onPick: (p: Place | null) => void }) {
  const [value, setValue] = useState('');
  return (
    <DestinationField
      testID="dest"
      label="Destino"
      value={value}
      onChangeText={setValue}
      onPick={onPick}
    />
  );
}

describe('DestinationField', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('suggests places, takes a pick or the typed text, and closes when leaving the field', async () => {
    const onPick = jest.fn();
    await renderWithProviders(<Harness onPick={onPick} />);
    await fireEvent.changeText(screen.getByTestId('dest'), 'kyot');
    await fireEvent(screen.getByTestId('dest'), 'focus');
    await act(() => jest.advanceTimersByTime(200));
    expect(await screen.findByTestId('dest-option-0')).toHaveTextContent(/Quioto/);
    await fireEvent.press(screen.getByTestId('dest-option-0'));
    expect(screen.getByTestId('dest')).toHaveDisplayValue('Quioto, Japão');
    expect(onPick).toHaveBeenLastCalledWith(expect.objectContaining({ countryId: '392' }));

    await fireEvent.changeText(screen.getByTestId('dest'), 'Casa da vó');
    expect(screen.getByTestId('dest-results')).toBeOnTheScreen();
    await fireEvent(screen.getByTestId('dest'), 'blur');
    await act(() => jest.advanceTimersByTime(250));
    expect(screen.queryByTestId('dest-results')).toBeNull();
    expect(onPick).toHaveBeenLastCalledWith(null);
  });
});
