import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { colors } from '../tokens/semantic';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { RadioGroup } from './RadioGroup';
import { Badge } from './Surface';
import { Text } from './Text';
import { TextField } from './TextField';

const renderWithTheme = (ui: ReactElement, preference: 'light' | 'dark' = 'light') =>
  render(<ThemeProvider preference={preference}>{ui}</ThemeProvider>);

describe('Button', () => {
  it('calls onPress', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Save" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled and busy while loading', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Save" loading onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Save' });
    await fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
    expect(button).toBeBusy();
    expect(screen.getByTestId('button-spinner')).toBeOnTheScreen();
  });
});

describe('TextField', () => {
  it('exposes the label to assistive tech and announces errors', async () => {
    await renderWithTheme(<TextField label="Title" hideLabel error="Required" />);

    expect(screen.getByLabelText('Title')).toBeOnTheScreen();
    expect(screen.queryByText('Title')).not.toBeOnTheScreen();
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('forwards text changes', async () => {
    const onChangeText = jest.fn();
    await renderWithTheme(<TextField label="Title" onChangeText={onChangeText} />);

    await fireEvent.changeText(screen.getByLabelText('Title'), 'Milk');

    expect(onChangeText).toHaveBeenCalledWith('Milk');
  });
});

describe('Checkbox', () => {
  it('toggles and reports its state', async () => {
    const onChange = jest.fn();
    await renderWithTheme(<Checkbox checked={false} onChange={onChange} label="Done" />);

    const checkbox = screen.getByRole('checkbox', { name: 'Done' });
    expect(checkbox).not.toBeChecked();
    await fireEvent.press(checkbox);

    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('RadioGroup', () => {
  it('marks the selected option and reports changes', async () => {
    const onChange = jest.fn();
    await renderWithTheme(
      <RadioGroup
        label="Theme"
        value="light"
        onChange={onChange}
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
      />,
    );

    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
    await fireEvent.press(screen.getByRole('radio', { name: 'Dark' }));

    expect(onChange).toHaveBeenCalledWith('dark');
  });
});

describe('theming', () => {
  function Probe() {
    const theme = useTheme();
    return <Text testID="probe">{theme.scheme}</Text>;
  }

  it('applies the requested scheme', async () => {
    await renderWithTheme(<Probe />, 'dark');
    expect(screen.getByTestId('probe')).toHaveTextContent('dark');
    expect(screen.getByTestId('probe')).toHaveStyle({ color: colors.dark.text });
  });

  it('colors badges with status tokens', async () => {
    await renderWithTheme(<Badge label="Synced" tone="success" />);
    expect(screen.getByText('Synced')).toHaveStyle({
      color: colors.light.status.success.foreground,
    });
  });
});
