import {
  Avatar,
  AvatarStack,
  Button,
  Card,
  Chip,
  ChipRow,
  colors,
  DateChip,
  EmptyState,
  Fab,
  FactTile,
  FormError,
  Globe,
  HStack,
  IconButton,
  ListRow,
  LivePill,
  Logo,
  MoneyInput,
  Mosaic,
  PasswordStrength,
  ProgressBar,
  palette,
  RadioRow,
  Rating,
  Screen,
  ScreenHeader,
  SearchPill,
  SectionHeader,
  Segmented,
  StarRating,
  StatTile,
  StatusChip,
  Stepper,
  Text,
  TextArea,
  TextField,
  type TextVariant,
  TileGrid,
  ToggleRow,
  textVariants,
  VStack,
} from '@worlo/ui';
import { useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { img } from '@/lib/images';

/**
 * Living catalogue of @worlo/ui rendered with the real components. Dev/QA only
 * (route /design-system); copy is fixed on purpose and not translated.
 */
export function DesignSystemScreen() {
  const router = useRouter();
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a');
  const [toggle, setToggle] = useState(true);
  const [stars, setStars] = useState(4);
  const [people, setPeople] = useState(2);
  const [money, setMoney] = useState('');

  return (
    <Screen
      testID="design-system-screen"
      header={
        <ScreenHeader overline="Design system" onBack={() => router.back()} backLabel="Voltar" />
      }
    >
      <Section title="Cores">
        <HStack gap={8} wrap>
          {Object.entries(palette).map(([name, value]) => (
            <VStack key={name} gap={4} align="center" style={{ width: 64 }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  backgroundColor: value,
                  borderWidth: 1,
                  borderColor: colors.hairline,
                }}
              />
              <Text variant="micro" tone="muted" numberOfLines={1}>
                {name}
              </Text>
            </VStack>
          ))}
        </HStack>
      </Section>

      <Section title="Tipografia">
        {(Object.keys(textVariants) as TextVariant[]).map((variant) => (
          <Text key={variant} variant={variant} numberOfLines={1}>
            {variant}
          </Text>
        ))}
      </Section>

      <Section title="Botões">
        <Button label="Começar pelo meu mapa" />
        <Button label="Já tenho conta" variant="outline" />
        <HStack gap={8} wrap>
          <Button label="Ver todos" variant="ghost" iconRight="arrow-right" />
          <Button label="Convidar" variant="pill" />
          <Button label="Sair da conta" variant="destructive" size="md" />
        </HStack>
        <HStack gap={8} wrap>
          <Button label="Carregando" loading size="md" />
          <Button label="Desabilitado" disabled size="md" />
        </HStack>
        <HStack gap={8}>
          <IconButton icon="arrow-left" label="Voltar" />
          <IconButton icon="bell" label="Notificações" badge={3} size={44} />
          <IconButton icon="export" label="Compartilhar" tone="photo" />
          <IconButton icon="plus" label="Aproximar" tone="map" size={44} />
          <Fab label="Adicionar viagem" />
        </HStack>
      </Section>

      <Section title="Campos">
        <SearchPill
          label="Buscar"
          placeholder="Busque destinos, lugares, pessoas"
          onPressAsButton={() => {}}
        />
        <TextField label="E-mail" icon="envelope-simple" placeholder="voce@email.com" />
        <TextField label="Senha" icon="lock-simple" password value="abcdefgh12" />
        <PasswordStrength password="abcdefgh12" labels={['Fraca', 'Boa', 'Forte']} />
        <TextField label="Com erro" invalid value="ana@" />
        <FormError message="Confere o e-mail, parece incompleto." />
        <TextArea
          label="Diário"
          maxLength={500}
          value="Chegamos tarde, mas valeu cada minuto."
          onChangeText={() => {}}
        />
        <MoneyInput label="Valor" currency="R$" value={money} onChangeText={setMoney} />
      </Section>

      <Section title="Seleção">
        <ChipRow>
          <Chip label="Tudo" selected />
          <Chip label="Praias" icon="sun-horizon" />
          <Chip label="+ Dia" dashed />
        </ChipRow>
        <Segmented
          label="Exemplo"
          value={seg}
          onChange={setSeg}
          options={[
            { value: 'a', label: 'Realizadas' },
            { value: 'b', label: 'Quero ir' },
            { value: 'c', label: 'Roteiros' },
          ]}
        />
        <RadioRow label="Português (Brasil)" checked onPress={() => {}} />
        <ToggleRow label="Lembranças de viagem" value={toggle} onChange={setToggle} />
        <StarRating value={stars} onChange={setStars} starLabel={(n) => `${n} estrelas`} />
        <Stepper
          value={people}
          onChange={setPeople}
          label="Pessoas"
          decrementLabel="Menos"
          incrementLabel="Mais"
        />
        <HStack gap={8}>
          <DateChip
            weekday="sex"
            day="6"
            month="nov"
            selected
            onPress={() => {}}
            accessibilityLabel="sex 6 nov"
          />
          <DateChip
            weekday="sáb"
            day="7"
            month="nov"
            selected={false}
            onPress={() => {}}
            accessibilityLabel="sáb 7 nov"
          />
          <DateChip
            weekday="dom"
            day="8"
            month="nov"
            selected={false}
            soldOut
            soldOutLabel="esgotado"
            onPress={() => {}}
            accessibilityLabel="dom 8 nov esgotado"
          />
        </HStack>
      </Section>

      <Section title="Cards">
        <ListRow
          title="Passeio de barco pelo Tejo"
          meta="Lisboa · 2h · a partir de € 35"
          thumbUri={img('tejo', 160, 160)}
          trailing={<Rating value="4,8" />}
          onPress={() => {}}
        />
        <Mosaic
          photos={[{ uri: img('floripa-a', 400, 400) }, { uri: img('floripa-b', 200, 200) }]}
          extra={39}
        />
        <HStack gap={8}>
          <StatTile value="6" label="países" />
          <StatTile value="3,1%" label="do mundo" />
        </HStack>
        <TileGrid>
          <FactTile icon="coins" label="Moeda" value="Euro (€)" sub="Cartão aceito em quase tudo" />
          <FactTile
            icon="church"
            label="Religião"
            value="Católica (~80%)"
            tip="Estimativa a partir de censos recentes."
          />
        </TileGrid>
        <Card surface="dark" radius={24}>
          <Text variant="overline" tone="accentOnDark">
            Há um ano
          </Text>
          <Text variant="h3" tone="inverse">
            Você estava em Florianópolis
          </Text>
        </Card>
        <ProgressBar value={0.75} label="Progresso" />
      </Section>

      <Section title="Pessoas e status">
        <HStack gap={8}>
          <Avatar name="Ana Ribeiro" isMe />
          <Avatar name="Marina Costa" />
          <Avatar name="João Pereira" colorIndex={1} />
          <AvatarStack
            label="Marina, João e Bia"
            ringColor={colors.background}
            people={[
              { name: 'Marina Costa' },
              { name: 'João Pereira', colorIndex: 1 },
              { name: 'Bia Souza', colorIndex: 2 },
            ]}
          />
        </HStack>
        <HStack gap={8} wrap>
          <StatusChip kind="visited" label="Visitado" />
          <StatusChip kind="planned" label="Em planejamento" />
          <StatusChip kind="wishlist" label="Quero ir" />
          <StatusChip kind="verified" label="Verificado" />
        </HStack>
      </Section>

      <Section title="Estados">
        <EmptyState
          icon="suitcase-rolling"
          title="Nenhuma viagem por aqui ainda"
          text="Guarde a primeira e veja seu mapa começar a acender."
          action={{ label: 'Adicionar viagem', onPress: () => {} }}
        />
        <EmptyState
          dashed
          title="Dia livre, por enquanto."
          text="Adicione uma parada ou deixe pra decidir lá."
        />
        <LivePill label="Viajando · Dia 2 · Vale Sagrado" onPress={() => {}} />
      </Section>

      <Section title="Globo e marca" dark>
        <Logo onDark />
        <View style={{ alignItems: 'center' }}>
          <Globe
            width={310}
            height={310}
            visited={['076', '620', '250']}
            wishlist={['392']}
            planned={['604']}
            autoRotate={0.15}
          />
        </View>
      </Section>
    </Screen>
  );
}

function Section({
  title,
  children,
  dark = false,
}: {
  title: string;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <Card surface={dark ? 'dark' : 'surface'} radius={24} padding={16} gap={14}>
      <SectionHeader title={title} onDark={dark} />
      {children}
    </Card>
  );
}
