/** A7 · Cadastro da viagem (onboarding, Nova viagem, Novo destino, Editar). */
const tripForm = {
  overline: {
    onboarding: 'Passo 2 de 2',
    newPast: 'Nova viagem',
    newFuture: 'Novo destino',
    edit: 'Editar',
  },
  title: {
    past: 'Conta uma viagem que você fez',
    future: 'Pra onde você quer ir?',
    edit: 'Editar viagem',
  },
  sub: {
    past: 'Só o destino e o nome já bastam. O resto você completa quando quiser.',
    future: 'Salve o destino agora. Memórias e gastos ficam pra quando a viagem acontecer.',
    edit: 'Quem colabora também pode editar essas informações.',
  },
  kind: {
    label: 'Tipo de cadastro',
    past: 'Já fui',
    future: 'Quero ir',
  },
  dest: 'Destino',
  destPlaceholder: 'Para onde vamos?',
  name: {
    past: 'Nome da viagem',
    future: 'Nome do destino',
  },
  namePlaceholder: {
    past: 'Inverno em Floripa',
    future: 'Cerejeiras no Japão',
  },
  errors: {
    dest: 'Falta dizer pra onde foi.',
    name: 'Dá um nome pra essa viagem.',
  },
  collab: {
    past: 'Quem foi com você',
    future: 'Quem vai com você',
    remove: 'Remover {{name}}',
    inviteLink: 'Convidar por link',
    linkCopied: 'Link de convite copiado. Quem entrar vira colaborador.',
  },
  when: 'Quando foi',
  whenPlaceholder: 'Julho de 2025',
  tripType: 'Tipo de viagem',
  types: {
    solo: 'Sozinho(a)',
    couple: 'Casal',
    family: 'Família',
    friends: 'Amigos',
    work: 'Trabalho',
  },
  food: 'Gastronomia',
  foodPlaceholder: 'O que você comeu de melhor?',
  shopping: 'Compras',
  shoppingPlaceholder: 'Trouxe alguma coisa de lá?',
  experiences: 'Outras experiências',
  exp: {
    beach: 'Praia',
    trail: 'Trilha',
    museum: 'Museu',
    show: 'Show',
    boat: 'Barco',
    nightlife: 'Vida noturna',
    party: 'Festa local',
  },
  photosTitle: 'Fotos dessa viagem',
  photosText: 'Você pode importar depois, no seu perfil.',
  save: {
    past: 'Salvar no meu mapa',
    future: 'Salvar destino',
    edit: 'Salvar alterações',
  },
  toasts: {
    pastSaved: 'Viagem salva no seu mapa.',
    pastInvited: 'Viagem salva. Convite enviado pra {{names}}.',
    futureSaved: 'Destino salvo. Bora?',
    futureInvited: 'Destino salvo. Convite enviado pra {{names}}.',
    updated: 'Viagem atualizada.',
    updatedInvited: 'Viagem atualizada. Convite enviado pra {{names}}.',
  },
  defaults: {
    period: 'Data a definir',
    savedNow: 'Salvo agora',
    destNote: 'Destino: {{dest}}',
  },
};

export default tripForm;
