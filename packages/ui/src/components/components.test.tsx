import { act, fireEvent, screen } from '@testing-library/react-native';
import { Keyboard, Pressable } from 'react-native';
import { renderUi } from '../test-utils';
import { colors } from '../tokens/colors';
import { Avatar, AvatarStack } from './Avatar';
import { StatusChip } from './Badges';
import { Button } from './Button';
import { Card, FactTile, ListRow, ProgressBar, SectionHeader } from './Cards';
import {
  EmptyState,
  FullScreenState,
  LivePill,
  OfflineBanner,
  Sheet,
  ToastProvider,
  useToast,
} from './Feedback';
import { IconButton } from './IconButton';
import {
  FormError,
  MoneyInput,
  PasswordStrength,
  parseMoney,
  passwordStrength,
  SearchPill,
  TextArea,
  TextField,
} from './Inputs';
import { Screen, ScreenHeader, TabBar } from './Layout';
import { Chip, DateChip, RadioRow, Segmented, StarRating, Stepper, Toggle } from './Selection';
import { Text } from './Text';

describe('Button', () => {
  it('fires onPress and exposes its label', async () => {
    const onPress = jest.fn();
    await renderUi(<Button label="Começar pelo meu mapa" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Começar pelo meu mapa' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled (and not pressable) when disabled or loading', async () => {
    const onPress = jest.fn();
    await renderUi(
      <>
        <Button label="Continuar" disabled onPress={onPress} />
        <Button label="Salvar" loading onPress={onPress} />
      </>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeBusy();
    expect(screen.getByTestId('button-spinner')).toBeOnTheScreen();
  });

  it('uses carvão text on the coral primary (contrast rule)', async () => {
    await renderUi(<Button label="Reservar" />);
    expect(screen.getByText('Reservar')).toHaveStyle({ color: colors.onPrimary });
  });
});

describe('IconButton', () => {
  it('announces the badge count with its label', async () => {
    await renderUi(<IconButton icon="bell" label="Notificações" badge={3} />);
    expect(screen.getByRole('button', { name: 'Notificações, 3' })).toBeOnTheScreen();
  });
});

describe('inputs', () => {
  it('labels the field and flags it invalid', async () => {
    await renderUi(
      <>
        <TextField label="E-mail" icon="envelope-simple" invalid />
        <FormError message="Confere o e-mail, parece incompleto." />
      </>,
    );
    expect(screen.getByLabelText('E-mail')).toHaveProp('aria-invalid', true);
    expect(screen.getByRole('alert')).toHaveTextContent('Confere o e-mail, parece incompleto.');
  });

  it('toggles password visibility', async () => {
    await renderUi(
      <TextField
        label="Senha"
        password
        passwordToggleLabels={['Mostrar senha', 'Ocultar senha']}
      />,
    );
    expect(screen.getByLabelText('Senha')).toHaveProp('secureTextEntry', true);
    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(screen.getByLabelText('Senha')).toHaveProp('secureTextEntry', false);
  });

  it('renders the search pill as a button that opens search', async () => {
    const onOpen = jest.fn();
    await renderUi(
      <SearchPill label="Buscar" placeholder="Busque destinos" onPressAsButton={onOpen} />,
    );
    await fireEvent.press(screen.getByRole('search', { name: 'Buscar' }));
    expect(onOpen).toHaveBeenCalled();
  });

  it('counts characters in a textarea', async () => {
    await renderUi(
      <TextArea label="Texto" maxLength={500} value="Olá mundo" onChangeText={() => {}} />,
    );
    expect(screen.getByText('9/500')).toBeOnTheScreen();
  });

  it('only accepts digits, dot and comma in money fields', async () => {
    const onChange = jest.fn();
    await renderUi(<MoneyInput label="Valor" currency="R$" value="" onChangeText={onChange} />);
    await fireEvent.changeText(screen.getByLabelText('Valor'), 'R$ 1.234,5a');
    expect(onChange).toHaveBeenCalledWith('1.234,5');
    expect(parseMoney('1.234,50')).toBe(1234.5);
  });

  it('rates password strength in 3 levels', async () => {
    expect([
      passwordStrength(''),
      passwordStrength('abc'),
      passwordStrength('abcdefgh'),
      passwordStrength('abcdefgh12'),
    ]).toEqual([0, 1, 2, 3]);
    await renderUi(<PasswordStrength password="abcdefgh12" labels={['Fraca', 'Boa', 'Forte']} />);
    expect(screen.getByLabelText('Forte')).toBeOnTheScreen();
  });
});

describe('selection', () => {
  it('chip and segmented expose the selected state', async () => {
    const onChange = jest.fn();
    await renderUi(
      <>
        <Chip label="Praias" selected />
        <Segmented
          label="Viagens"
          value="past"
          onChange={onChange}
          options={[
            { value: 'past', label: 'Realizadas' },
            { value: 'wish', label: 'Quero ir' },
          ]}
        />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Praias' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Realizadas' })).toBeSelected();
    await fireEvent.press(screen.getByRole('tab', { name: 'Quero ir' }));
    expect(onChange).toHaveBeenCalledWith('wish');
  });

  it('radio, toggle and stars report their state', async () => {
    const onToggle = jest.fn();
    const onRate = jest.fn();
    await renderUi(
      <>
        <RadioRow label="Português (Brasil)" checked onPress={() => {}} />
        <Toggle label="Lembranças" value={false} onChange={onToggle} />
        <StarRating value={2} onChange={onRate} starLabel={(n) => `${n} estrelas`} />
      </>,
    );
    expect(screen.getByRole('radio', { name: 'Português (Brasil)' })).toBeChecked();
    await fireEvent.press(screen.getByRole('switch', { name: 'Lembranças' }));
    expect(onToggle).toHaveBeenCalledWith(true);
    await fireEvent.press(screen.getByRole('radio', { name: '5 estrelas' }));
    expect(onRate).toHaveBeenCalledWith(5);
  });

  it('stepper stays within bounds', async () => {
    const onChange = jest.fn();
    await renderUi(
      <Stepper
        value={1}
        min={1}
        max={12}
        onChange={onChange}
        label="Pessoas"
        decrementLabel="Menos"
        incrementLabel="Mais"
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Menos' }));
    expect(onChange).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Mais' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('marks sold-out dates as disabled', async () => {
    await renderUi(
      <DateChip
        weekday="dom"
        day="8"
        month="nov"
        selected={false}
        soldOut
        soldOutLabel="esgotado"
        onPress={() => {}}
        accessibilityLabel="dom, 8 nov, esgotado"
      />,
    );
    expect(screen.getByRole('radio', { name: 'dom, 8 nov, esgotado' })).toBeDisabled();
    expect(screen.getByText('esgotado')).toBeOnTheScreen();
  });
});

describe('people and status', () => {
  it('derives initials and names the stack', async () => {
    await renderUi(
      <>
        <Avatar name="Marina Costa" />
        <AvatarStack
          label="Marina e João"
          ringColor={colors.surface}
          people={[{ name: 'Marina Costa' }, { name: 'João Pereira' }]}
        />
        <StatusChip kind="visited" label="Visitado" />
      </>,
    );
    expect(screen.getAllByText('MC')).toHaveLength(2);
    expect(screen.getByLabelText('Marina e João')).toBeOnTheScreen();
    expect(screen.getByLabelText('Visitado')).toBeOnTheScreen();
  });
});

describe('cards', () => {
  it('list rows and cards are pressable with readable names', async () => {
    const onRow = jest.fn();
    const onCard = jest.fn();
    await renderUi(
      <>
        <ListRow title="Torre de Belém" meta="Monumento · € 8" onPress={onRow} />
        <Card onPress={onCard} accessibilityLabel="Há um ano">
          <Text>Você estava em Florianópolis</Text>
        </Card>
        <SectionHeader title="Passeios em destaque" action="Ver todos" onAction={onCard} />
      </>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Torre de Belém, Monumento · € 8' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Há um ano' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Ver todos' }));
    expect(onRow).toHaveBeenCalled();
    expect(onCard).toHaveBeenCalledTimes(2);
  });

  it('fact tiles open their tooltip', async () => {
    await renderUi(
      <FactTile
        label="Religião"
        value="Católica (~80%)"
        tip="Estimativa a partir de censos."
        tipLabel="Sobre esse dado"
      />,
    );
    expect(screen.queryByText('Estimativa a partir de censos.')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Sobre esse dado' }));
    expect(screen.getByText('Estimativa a partir de censos.')).toBeOnTheScreen();
  });

  it('progress bar reports its value', async () => {
    await renderUi(<ProgressBar value={0.75} label="Progresso do roteiro" />);
    expect(
      screen.getByRole('progressbar', { name: 'Progresso do roteiro' }),
    ).toHaveAccessibilityValue({ now: 75 });
  });
});

describe('feedback', () => {
  it('sheet shows its title and closes from the overlay', async () => {
    const onClose = jest.fn();
    await renderUi(
      <Sheet
        visible
        onClose={onClose}
        title="Adicionar uma viagem"
        testID="add-sheet"
        closeLabel="Fechar"
      >
        <Text>Viagem que já aconteceu</Text>
      </Sheet>,
    );
    expect(screen.getByText('Adicionar uma viagem')).toBeOnTheScreen();
    // The sheet is modal, so the overlay is hidden from screen readers (they use
    // the escape gesture → onRequestClose); touch users tap it.
    await fireEvent.press(screen.getByTestId('add-sheet-overlay', { includeHiddenElements: true }));
    expect(onClose).toHaveBeenCalled();
  });

  it('toasts disappear after 2.4s', async () => {
    jest.useFakeTimers();
    function Trigger() {
      const toast = useToast();
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="salvar"
          onPress={() => toast.show('Viagem salva no seu mapa.')}
        />
      );
    }
    await renderUi(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'salvar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Viagem salva no seu mapa.');
    await act(async () => {
      jest.advanceTimersByTime(2400);
    });
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    jest.useRealTimers();
  });

  it('empty, offline and error states expose their actions', async () => {
    const onAction = jest.fn();
    await renderUi(
      <>
        <EmptyState
          icon="suitcase-rolling"
          title="Nenhuma viagem por aqui ainda"
          action={{ label: 'Adicionar viagem', onPress: onAction }}
        />
        <OfflineBanner
          message="Sem conexão · mostrando o que está salvo"
          retryLabel="Tentar"
          onRetry={onAction}
        />
        <LivePill label="Viajando · Dia 2 · Vale Sagrado" onPress={onAction} />
      </>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar viagem' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Viajando · Dia 2 · Vale Sagrado' }));
    expect(onAction).toHaveBeenCalledTimes(3);
  });

  it('error state shows the support code', async () => {
    await renderUi(
      <FullScreenState
        kind="error"
        title="Algo deu errado do nosso lado"
        text="Seus dados estão seguros."
        retryLabel="Tentar de novo"
        onRetry={() => {}}
        code="Código WRL-503"
      />,
    );
    expect(screen.getByText('Código WRL-503')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
  });
});

describe('layout', () => {
  it('screen renders its header and content; back button is named', async () => {
    const onBack = jest.fn();
    await renderUi(
      <Screen header={<ScreenHeader overline="Nova viagem" onBack={onBack} backLabel="Voltar" />}>
        <Text>Conteúdo</Text>
      </Screen>,
    );
    expect(screen.getByText('Nova viagem')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('tab bar marks the active tab', async () => {
    const onPress = jest.fn();
    await renderUi(
      <TabBar
        items={[
          { key: 'explore', label: 'Explorar', icon: 'compass', active: true, onPress },
          { key: 'map', label: 'Mapa', icon: 'globe-hemisphere-west', active: false, onPress },
        ]}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Explorar' })).toBeSelected();
    await fireEvent.press(screen.getByRole('tab', { name: 'Mapa' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('hides the CTA bar while the keyboard is open, unless it holds the input', async () => {
    const listeners: Record<string, (() => void)[]> = {};
    jest.spyOn(Keyboard, 'addListener').mockImplementation((event, cb) => {
      listeners[event] = [...(listeners[event] ?? []), cb as () => void];
      return { remove: () => {} } as ReturnType<typeof Keyboard.addListener>;
    });
    const emit = (event: string) =>
      act(async () => {
        for (const cb of listeners[event] ?? []) cb();
      });
    await renderUi(
      <>
        <Screen bottomBar={<Text>Salvar no meu mapa</Text>}>
          <Text>Form</Text>
        </Screen>
        <Screen bottomBarWithKeyboard bottomBar={<Text>Escreva um comentário</Text>}>
          <Text>Post</Text>
        </Screen>
      </>,
    );
    expect(screen.getByText('Salvar no meu mapa')).toBeOnTheScreen();
    await emit('keyboardWillShow');
    expect(screen.queryByText('Salvar no meu mapa')).not.toBeOnTheScreen();
    expect(screen.getByText('Escreva um comentário')).toBeOnTheScreen();
    await emit('keyboardWillHide');
    expect(screen.getByText('Salvar no meu mapa')).toBeOnTheScreen();
  });
});
