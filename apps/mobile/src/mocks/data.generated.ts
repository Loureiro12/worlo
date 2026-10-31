// Generated from design_handoff_worlo_app/prototype (Worlo App.dc.html, mock data block).
// Regenerate instead of editing by hand if the prototype changes.
import type {
  Activity,
  City,
  CityTab,
  CityTabKey,
  Collection,
  Comment,
  Country,
  CountryId,
  CountryPage,
  Experience,
  Expert,
  Friend,
  Future,
  Invite,
  Itinerary,
  Notification,
  PlaceInfo,
  PlaceTip,
  PlaceToKnow,
  Popular,
  Post,
  Recommendation,
  Region,
  SavedItem,
  Suggestion,
  SuggestionKey,
  Tour,
  Traveler,
  Trip,
  TripDetails,
} from './types';

export const CENTROIDS: Record<CountryId, [number, number]> = {
  '152': [-71, -33],
  '250': [2.5, 46.6],
  '352': [-18.6, 64.9],
  '380': [12.5, 42.8],
  '392': [138, 36.5],
  '484': [-102, 23.6],
  '504': [-6.5, 31.8],
  '604': [-75, -9.5],
  '620': [-8, 39.6],
  '076': [-52, -11],
  '032': [-64, -35],
};

export const COUNTRIES: Record<CountryId, Country> = {
  '152': {
    name: 'Chile',
    flag: '🇨🇱',
    capital: 'Santiago',
    lang: 'Espanhol',
    cur: 'Peso (CLP)',
    hist: 'Você: 2 dias em Santiago · 2024',
  },
  '250': {
    name: 'França',
    flag: '🇫🇷',
    capital: 'Paris',
    lang: 'Francês',
    cur: 'Euro (€)',
    hist: 'Você: Primeira vez em Paris · mai 2023',
  },
  '352': {
    name: 'Islândia',
    flag: '🇮🇸',
    capital: 'Reykjavík',
    lang: 'Islandês',
    cur: 'Coroa (ISK)',
    best: 'set – mar',
  },
  '380': {
    name: 'Itália',
    flag: '🇮🇹',
    capital: 'Roma',
    lang: 'Italiano',
    cur: 'Euro (€)',
    hist: 'Você: Roma e Florença · 2023',
  },
  '392': {
    name: 'Japão',
    flag: '🇯🇵',
    capital: 'Tóquio',
    lang: 'Japonês',
    cur: 'Iene (¥)',
    best: 'mar – mai',
  },
  '484': {
    name: 'México',
    flag: '🇲🇽',
    capital: 'Cid. do México',
    lang: 'Espanhol',
    cur: 'Peso (MXN)',
    best: 'out – nov',
  },
  '504': {
    name: 'Marrocos',
    flag: '🇲🇦',
    capital: 'Rabat',
    lang: 'Árabe, berbere',
    cur: 'Dirham (MAD)',
    best: 'mar – mai',
  },
  '604': {
    name: 'Peru',
    flag: '🇵🇪',
    capital: 'Lima',
    lang: 'Espanhol, quíchua',
    cur: 'Sol (PEN)',
    hist: 'Roteiro em andamento: Cusco e Machu Picchu',
  },
  '620': {
    name: 'Portugal',
    flag: '🇵🇹',
    capital: 'Lisboa',
    lang: 'Português',
    cur: 'Euro (€)',
    hist: 'Você: Lisboa sem pressa · out 2024',
  },
  '076': {
    name: 'Brasil',
    flag: '🇧🇷',
    capital: 'Brasília',
    lang: 'Português',
    cur: 'Real (R$)',
    hist: 'Você: 3 viagens · 5 cidades · desde 2019',
  },
  '032': {
    name: 'Argentina',
    flag: '🇦🇷',
    capital: 'Buenos Aires',
    lang: 'Espanhol',
    cur: 'Peso (ARS)',
    hist: 'Você: Patagônia de carro · mar 2024',
  },
};

export const DEFAULT_VISITED: Record<CountryId, string[]> = {
  '152': ['2024'],
  '250': ['2023'],
  '380': ['2023'],
  '620': ['2024'],
  '076': ['2019', '2022', '2025'],
  '032': ['2024'],
};

export const CITIES: City[] = [
  {
    n: 'Florianópolis',
    c: [-48.55, -27.6],
    ph: 42,
  },
  {
    n: 'Rio de Janeiro',
    c: [-43.2, -22.9],
    ph: 61,
  },
  {
    n: 'São Paulo',
    c: [-46.6, -23.5],
  },
  {
    n: 'Lisboa',
    c: [-9.14, 38.72],
    ph: 118,
  },
  {
    n: 'Porto',
    c: [-8.61, 41.15],
    ph: 20,
  },
  {
    n: 'El Calafate',
    c: [-72.27, -50.34],
    ph: 203,
  },
  {
    n: 'Santiago',
    c: [-70.67, -33.45],
  },
  {
    n: 'Paris',
    c: [2.35, 48.86],
    ph: 96,
  },
  {
    n: 'Roma',
    c: [12.5, 41.9],
    ph: 54,
  },
  {
    n: 'Florença',
    c: [11.25, 43.77],
  },
  {
    n: 'Cusco',
    c: [-71.97, -13.53],
  },
];

export const TRIPS: Trip[] = [
  {
    id: 'floripa',
    title: 'Inverno em Floripa',
    place: 'Florianópolis',
    country: 'Brasil',
    flag: '🇧🇷',
    period: '12 – 17 jul 2025',
    year: '2025',
    days: 6,
    photos: 42,
    places: 6,
    collab: [
      {
        name: 'Marina Costa',
        status: 'ok',
      },
      {
        name: 'João Pereira',
        status: 'ok',
      },
    ],
    people: '',
    total: 'R$ 4.860',
    tint: '#F0A38A',
  },
  {
    id: 'lisboa',
    title: 'Lisboa sem pressa',
    place: 'Lisboa',
    country: 'Portugal',
    flag: '🇵🇹',
    period: '3 – 10 out 2024',
    year: '2024',
    days: 7,
    photos: 118,
    places: 14,
    collab: [
      {
        name: 'Marina Costa',
        status: 'ok',
      },
    ],
    people: '',
    total: '€ 1.940',
    tint: '#FAD9CE',
  },
  {
    id: 'patagonia',
    title: 'Patagônia de carro',
    place: 'El Calafate',
    country: 'Argentina',
    flag: '🇦🇷',
    period: '2 – 12 mar 2024',
    year: '2024',
    days: 10,
    photos: 203,
    places: 9,
    collab: [
      {
        name: 'João Pereira',
        status: 'ok',
      },
      {
        name: 'Bia Souza',
        status: 'ok',
      },
      {
        name: 'Caio Ramos',
        status: 'pending',
      },
    ],
    people: '',
    total: 'US$ 2.300',
    tint: '#CFC9C4',
  },
  {
    id: 'paris',
    title: 'Primeira vez em Paris',
    place: 'Paris',
    country: 'França',
    flag: '🇫🇷',
    period: '18 – 25 mai 2023',
    year: '2023',
    days: 7,
    photos: 96,
    places: 11,
    collab: [],
    people: '',
    total: '€ 2.150',
    tint: '#FAD9CE',
  },
];

export const FRIENDS: Friend[] = [
  {
    name: 'Marina Costa',
    ini: 'MC',
    handle: '@marinaporai',
  },
  {
    name: 'João Pereira',
    ini: 'JP',
    handle: '@joaop',
  },
  {
    name: 'Bia Souza',
    ini: 'BS',
    handle: '@biasouza',
  },
  {
    name: 'Caio Ramos',
    ini: 'CR',
    handle: '@caioramos',
  },
  {
    name: 'Rafael Lima',
    ini: 'RL',
    handle: '@rafa.mundo',
  },
  {
    name: 'Lúcia Martins',
    ini: 'LM',
    handle: '@luciam',
  },
];

export const TRIP_ACTIVITY: Record<string, Activity[]> = {
  floripa: [
    {
      who: 'Marina Costa',
      text: 'adicionou 12 fotos no Dia 2',
      when: 'ontem',
    },
    {
      who: 'João Pereira',
      text: 'lançou R$ 210 no Bar do Arante',
      when: 'há 3 dias',
    },
  ],
  patagonia: [
    {
      who: 'Bia Souza',
      text: 'escreveu no diário do Dia 4',
      when: 'há 1 semana',
    },
  ],
};

export const INVITES: Record<string, Invite> = {
  jeri: {
    id: 'jeri',
    kind: 'past',
    from: 'Bia Souza',
    title: 'Réveillon em Jeri',
    place: 'Jericoacoara',
    country: 'Brasil',
    flag: '🇧🇷',
    period: '29 dez 2025 – 3 jan 2026',
    year: '2025',
    days: 6,
    photos: 87,
    places: 7,
    total: 'R$ 3.900',
    others: ['Caio Ramos'],
    note: 'Ana, coloquei você na nossa viagem! Sobe aquelas fotos do pôr do sol na Duna.',
  },
  seul: {
    id: 'seul',
    kind: 'future',
    from: 'Rafael Lima',
    title: 'Seul e Tóquio',
    place: 'Seul e Tóquio',
    flag: '🇰🇷',
    period: 'out 2027 · 12 dias',
    others: ['Lúcia Martins'],
    note: 'Bora montar esse roteiro juntos? Já coloquei uns lugares em Seul.',
  },
};

export const NOTIFS: Notification[] = [
  {
    id: 'n1',
    group: 'Hoje',
    type: 'invite',
    inv: 'jeri',
    time: 'há 20 min',
  },
  {
    id: 'n2',
    group: 'Hoje',
    type: 'activity',
    who: 'Marina Costa',
    text: 'adicionou 12 fotos em Inverno em Floripa.',
    time: 'há 2 h',
    trip: 'floripa',
    badge: 'images',
  },
  {
    id: 'n3',
    group: 'Hoje',
    type: 'invite',
    inv: 'seul',
    time: 'há 5 h',
  },
  {
    id: 'n4',
    group: 'Hoje',
    type: 'memory',
    text: 'Há um ano você estava em Florianópolis. Reviva a viagem.',
    time: 'há 8 h',
    trip: 'floripa',
  },
  {
    id: 'n5',
    group: 'Esta semana',
    type: 'accepted',
    who: 'Marina Costa',
    text: 'aceitou seu convite pra Lisboa sem pressa.',
    time: 'seg',
    trip: 'lisboa',
    badge: 'check',
  },
  {
    id: 'n6',
    group: 'Esta semana',
    type: 'pending',
    who: 'Caio Ramos',
    text: 'ainda não respondeu seu convite pra Patagônia de carro.',
    time: 'dom',
    trip: 'patagonia',
    badge: 'hourglass',
  },
  {
    id: 'n7',
    group: 'Esta semana',
    type: 'community',
    who: '128 viajantes',
    text: 'confirmaram sua dica sobre o elétrico 28 em Lisboa.',
    time: 'sáb',
    badge: 'seal-check',
  },
  {
    id: 'n8',
    group: 'Esta semana',
    type: 'reminder',
    text: 'Faltam 30 dias pra Cusco e Machu Picchu. Seu roteiro tem um dia livre.',
    time: 'sex',
    badge: 'map-trifold',
  },
  {
    id: 'n9',
    group: 'Esta semana',
    type: 'follow',
    who: 'Rafael Lima',
    text: 'começou a seguir você.',
    time: 'qui',
    badge: 'user-plus',
  },
];

export const TRIP_DETAILS: Record<string, TripDetails> = {
  floripa: {
    places: [
      {
        name: 'Lagoa da Conceição',
        cat: 'Passeio · pôr do sol',
        stars: '5,0',
      },
      {
        name: 'Praia do Campeche',
        cat: 'Praia',
        stars: '5,0',
      },
      {
        name: 'Ribeirão da Ilha',
        cat: 'Gastronomia · ostras',
        stars: '4,0',
      },
      {
        name: 'Mercado Público',
        cat: 'Compras',
        stars: '4,0',
      },
    ],
    diary: {
      text: 'Chegamos tarde, mas valeu cada minuto da vista do mirante. Voltaria amanhã.',
      meta: 'Dia 2 · com Marina e João',
    },
    best: 'Pôr do sol na Lagoa da Conceição',
    days: [
      {
        label: 'Dia 1 · sáb, 12 jul',
        items: [
          {
            time: '15:40',
            icon: 'airplane-landing',
            title: 'Chegada em Floripa',
            note: 'Voo atrasou 40 min. Uber até o Campeche.',
          },
          {
            time: '19:30',
            icon: 'fork-knife',
            title: 'Jantar no Bar do Arante',
            note: 'Peixe grelhado na praia.',
            extra: 'R$ 210 · ★ 4',
          },
        ],
      },
      {
        label: 'Dia 2 · dom, 13 jul',
        items: [
          {
            time: '08:00',
            icon: 'person-simple-hike',
            title: 'Trilha da Lagoinha do Leste',
            note: '2h de subida, vista absurda lá de cima.',
            extra: '12 fotos',
          },
          {
            time: '17:20',
            icon: 'sun-horizon',
            title: 'Pôr do sol na Lagoa',
            note: 'Melhor momento da viagem.',
            extra: '8 fotos · ★ 5',
          },
        ],
      },
      {
        label: 'Dia 3 · seg, 14 jul',
        items: [
          {
            time: '12:00',
            icon: 'fork-knife',
            title: 'Ostras no Ribeirão da Ilha',
            note: 'Gratinadas e ao bafo. Vale a fila.',
            extra: 'R$ 180 · ★ 4',
          },
          {
            time: '16:00',
            icon: 'shopping-bag',
            title: 'Mercado Público',
            note: 'Renda de bilro e cachaça pra levar.',
            extra: 'R$ 140',
          },
        ],
      },
    ],
    money: {
      total: 4860,
      cur: 'R$',
      cats: [
        {
          name: 'Hospedagem',
          val: 1950,
          color: '#131311',
        },
        {
          name: 'Comida',
          val: 1320,
          color: '#E45B33',
        },
        {
          name: 'Passeios',
          val: 680,
          color: '#F0A38A',
        },
        {
          name: 'Transporte',
          val: 570,
          color: '#67615A',
        },
        {
          name: 'Compras',
          val: 340,
          color: '#CFC9C4',
        },
      ],
      items: [
        {
          icon: 'bed',
          name: 'Pousada Vila do Campeche',
          meta: 'Hospedagem · 5 noites',
          val: 'R$ 1.950',
          receipt: true,
        },
        {
          icon: 'fork-knife',
          name: 'Bar do Arante',
          meta: 'Comida · 12 jul',
          val: 'R$ 210',
        },
        {
          icon: 'boat',
          name: 'Barco na Lagoa',
          meta: 'Passeios · 13 jul',
          val: 'R$ 240',
          receipt: true,
        },
        {
          icon: 'shopping-bag',
          name: 'Mercado Público',
          meta: 'Compras · 14 jul',
          val: 'R$ 140',
        },
      ],
    },
  },
  lisboa: {
    places: [
      {
        name: 'Miradouro da Graça',
        cat: 'Mirante',
        stars: '5,0',
      },
      {
        name: 'Pastéis de Belém',
        cat: 'Gastronomia',
        stars: '5,0',
      },
      {
        name: 'LX Factory',
        cat: 'Compras',
        stars: '4,0',
      },
    ],
    diary: {
      text: 'O elétrico 28 lotado, a gente rindo em pé. Lisboa é pra andar sem pressa mesmo.',
      meta: 'Dia 1 · com Marina',
    },
    best: 'Fim de tarde no Miradouro da Graça',
  },
};

export const FUTURES: Future[] = [
  {
    id: '392',
    cid: '392',
    name: 'Japão',
    flag: '🇯🇵',
    collab: [
      {
        name: 'Marina Costa',
        status: 'ok',
      },
    ],
    note: 'Ver as cerejeiras em Kyoto. Ir com a Marina.',
    saved: 'Salvo em ago 2025',
    tint: '#FAD9CE',
  },
  {
    id: '352',
    cid: '352',
    name: 'Islândia',
    flag: '🇮🇸',
    note: 'Aurora boreal, de carro pela Ring Road.',
    saved: 'Salvo em jan 2025',
    tint: '#CFC9C4',
  },
  {
    id: '484',
    cid: '484',
    name: 'México',
    flag: '🇲🇽',
    note: 'Comer tudo na Cidade do México. Dia de los Muertos.',
    saved: 'Salvo em mar 2024',
    tint: '#F0A38A',
  },
  {
    id: '504',
    cid: '504',
    name: 'Marrocos',
    flag: '🇲🇦',
    note: 'Dormir uma noite no deserto.',
    saved: 'Salvo em nov 2023',
    tint: '#FAD9CE',
  },
];

export const PLACES: PlaceToKnow[] = [
  {
    name: 'Lisboa, Portugal',
    short: 'Lisboa',
    meta: '7 dias · clima ameno em outubro',
    cat: 'Cidades',
    tint: '#FAD9CE',
    go: 'city',
  },
  {
    name: 'Fernando de Noronha',
    short: 'Noronha',
    meta: '5 dias · mar calmo até março',
    cat: 'Praias',
    tint: '#F0A38A',
  },
  {
    name: 'Torres del Paine, Chile',
    short: 'Torres del Paine',
    meta: '6 dias · trilhas de out a abr',
    cat: 'Trilhas',
    tint: '#CFC9C4',
  },
  {
    name: 'Kyoto, Japão',
    short: 'Kyoto',
    meta: '5 dias · cerejeiras em abril',
    cat: 'Cidades',
    tint: '#FAD9CE',
    go: 'c392',
  },
  {
    name: 'Jericoacoara',
    short: 'Jeri',
    meta: '4 dias · vento bom de jul a dez',
    cat: 'Praias',
    tint: '#F0A38A',
  },
  {
    name: 'Chapada Diamantina',
    short: 'Chapada',
    meta: '6 dias · cachoeiras cheias em abril',
    cat: 'Trilhas',
    tint: '#CFC9C4',
  },
];

export const POPULAR: Popular[] = [
  {
    id: '620',
    flag: '🇵🇹',
    name: 'Portugal',
    meta: '18 mil viajantes',
  },
  {
    id: '392',
    flag: '🇯🇵',
    name: 'Japão',
    meta: '12 mil viajantes',
  },
  {
    id: '032',
    flag: '🇦🇷',
    name: 'Argentina',
    meta: '21 mil viajantes',
  },
  {
    id: '380',
    flag: '🇮🇹',
    name: 'Itália',
    meta: '15 mil viajantes',
  },
];

export const EXPERIENCES: Experience[] = [
  {
    name: 'Passeio de barco pelo Tejo',
    meta: 'Lisboa · 2h · a partir de € 35',
    rating: '4,8',
    tint: '#FAD9CE',
  },
  {
    name: 'Aula de pastel de nata',
    meta: 'Lisboa · 3h · € 55',
    rating: '4,9',
    tint: '#F0A38A',
  },
  {
    name: 'Lagoinha do Leste com guia',
    meta: 'Florianópolis · 5h · R$ 120',
    rating: '4,7',
    tint: '#CFC9C4',
  },
];

export const COUNTRY_PAGES: Record<CountryId, CountryPage> = {
  '392': {
    region: 'Ásia',
    tagline: 'Templos de madrugada, trem-bala à tarde e o melhor lámen da sua vida à noite.',
    facts: [
      {
        icon: 'coins',
        label: 'Moeda',
        value: 'Iene (¥)',
        sub: 'Leve dinheiro vivo',
      },
      {
        icon: 'wallet',
        label: 'Custo médio',
        value: '¥ 15–25 mil/dia',
        sub: 'Hospedagem e comida',
      },
      {
        icon: 'fork-knife',
        label: 'Gastronomia',
        value: 'Lámen, sushi, okonomiyaki',
      },
      {
        icon: 'train',
        label: 'Mobilidade',
        value: 'JR Pass, metrô',
        sub: 'Cartão Suica',
      },
      {
        icon: 'translate',
        label: 'Idioma',
        value: 'Japonês',
      },
      {
        icon: 'flower-lotus',
        label: 'Religião',
        value: 'Xintoísmo e budismo',
        tip: 'Estimativa. Muita gente pratica as duas ao mesmo tempo.',
      },
    ],
    regions: ['Kanto', 'Kansai', 'Hokkaido', 'Kyushu'],
    cities: [
      {
        name: 'Tóquio',
        note: 'A maior metrópole do mundo',
        tint: '#CFC9C4',
      },
      {
        name: 'Kyoto',
        note: '1.600 templos',
        tint: '#FAD9CE',
      },
      {
        name: 'Osaka',
        note: 'A cozinha do Japão',
        tint: '#F0A38A',
      },
      {
        name: 'Nara',
        note: 'Cervos soltos no parque',
        tint: '#FAD9CE',
      },
    ],
    source: 'Fontes: JNTO e Banco do Japão · atualizado em set 2026',
  },
  '620': {
    region: 'Europa',
    tagline: 'Mirantes, azulejo e mar. Dá pra cruzar o país de trem em um dia.',
    facts: [
      {
        icon: 'coins',
        label: 'Moeda',
        value: 'Euro (€)',
        sub: 'Cartão aceito em quase tudo',
      },
      {
        icon: 'wallet',
        label: 'Custo médio',
        value: '€ 80–120/dia',
        sub: 'Hospedagem e comida',
      },
      {
        icon: 'fork-knife',
        label: 'Gastronomia',
        value: 'Bacalhau, sardinha, pastel de nata',
      },
      {
        icon: 'train',
        label: 'Mobilidade',
        value: 'Metrô, trem, elétrico',
        sub: 'Cartão Navegante',
      },
      {
        icon: 'translate',
        label: 'Idioma',
        value: 'Português',
      },
      {
        icon: 'church',
        label: 'Religião',
        value: 'Católica (~80%)',
        tip: 'Estimativa a partir de censos recentes. Pode variar por região.',
      },
    ],
    regions: ['Lisboa e Vale do Tejo', 'Porto e Norte', 'Algarve', 'Madeira'],
    cities: [
      {
        name: 'Lisboa',
        note: 'Mirantes, fado e pastéis',
        tint: '#FAD9CE',
        go: true,
      },
      {
        name: 'Porto',
        note: 'Vinho e a Ribeira',
        tint: '#CFC9C4',
      },
      {
        name: 'Sintra',
        note: 'Palácios a 40 min de Lisboa',
        tint: '#F0A38A',
      },
      {
        name: 'Lagos',
        note: 'Falésias do Algarve',
        tint: '#FAD9CE',
      },
    ],
    source: 'Fontes: Turismo de Portugal e Banco de Portugal · atualizado em out 2026',
  },
};

export const CITY_TABS: Record<CityTabKey, CityTab> = {
  attr: {
    l: 'Atrações',
    i: 'camera',
    items: [
      {
        name: 'Miradouro da Senhora do Monte',
        meta: 'Mirante · grátis · 24h',
        rating: '4,8',
      },
      {
        name: 'Torre de Belém',
        meta: 'Monumento · € 8 · 10h–18h',
        rating: '4,6',
      },
      {
        name: 'Castelo de São Jorge',
        meta: 'Monumento · € 15 · 9h–21h',
        rating: '4,7',
      },
    ],
  },
  food: {
    l: 'Gastronomia',
    i: 'fork-knife',
    items: [
      {
        name: 'Pastéis de Belém',
        meta: 'Doceria · € · desde 1837',
        rating: '4,8',
      },
      {
        name: 'Time Out Market',
        meta: 'Mercado · €€ · Cais do Sodré',
        rating: '4,5',
      },
      {
        name: 'Cervejaria Ramiro',
        meta: 'Frutos do mar · €€€',
        rating: '4,7',
      },
    ],
  },
  shop: {
    l: 'Compras',
    i: 'shopping-bag',
    items: [
      {
        name: 'LX Factory',
        meta: 'Lojas e cafés · Alcântara',
        rating: '4,6',
      },
      {
        name: 'Feira da Ladra',
        meta: 'Mercado de pulgas · ter e sáb',
      },
      {
        name: 'A Vida Portuguesa',
        meta: 'Produtos locais · Chiado',
        rating: '4,7',
      },
    ],
  },
  move: {
    l: 'Transporte',
    i: 'train',
    items: [
      {
        name: 'Metrô',
        meta: '4 linhas · € 1,85 por viagem',
      },
      {
        name: 'Elétrico 28',
        meta: 'Passa por Alfama e Graça · lota cedo',
      },
      {
        name: 'Trem para Sintra',
        meta: '40 min · sai do Rossio',
      },
    ],
  },
  serv: {
    l: 'Serviços',
    i: 'first-aid',
    items: [
      {
        name: 'Banheiros públicos',
        meta: 'Praça do Comércio e Rossio',
      },
      {
        name: 'Wi-Fi público',
        meta: 'Grátis nas praças centrais',
      },
      {
        name: 'Guarda-volumes',
        meta: 'Estação do Rossio · € 3–5',
      },
      {
        name: 'Farmácias',
        meta: 'Cruz verde · plantão 24h',
      },
    ],
  },
};

export const POSTS: Post[] = [
  {
    id: 'p1',
    author: 'Marina Costa',
    ini: 'MC',
    where: 'Lisboa',
    when: 'há 2 dias',
    type: 'Dica',
    text: 'O elétrico 28 lota a partir das 10h. Pega no Martim Moniz antes das 9h que dá pra sentar.',
    yes: 128,
    no: 4,
    tint: '#FAD9CE',
  },
  {
    id: 'p2',
    author: 'Rafael Lima',
    ini: 'RL',
    where: 'Kyoto',
    when: 'há 5 dias',
    type: 'Roteiro',
    text: '5 dias em Kyoto na época das cerejeiras: templos bem cedo, Gion à noite, Arashiyama num dia de semana.',
    yes: 64,
    no: 2,
    tint: '#F0A38A',
  },
  {
    id: 'p3',
    author: 'Bia Souza',
    ini: 'BS',
    where: 'Florianópolis',
    when: 'há 1 semana',
    type: 'Avaliação',
    text: 'Ostras no Ribeirão seguem impecáveis, mas no fim de semana precisa reservar. Fui sem e esperei 1h.',
    yes: 41,
    no: 9,
    tint: '#CFC9C4',
  },
];

export const ROTS: Itinerary[] = [
  {
    id: 'peru',
    title: 'Cusco e Machu Picchu',
    place: 'Cusco, Peru',
    flag: '🇵🇪',
    dates: '12 – 20 mai 2027',
    status: 'Em planejamento',
    sugKey: 'peru',
    days: [
      {
        label: 'Lima → Cusco',
        items: [
          {
            time: '07:30',
            icon: 'airplane-takeoff',
            title: 'Voo Lima → Cusco',
            note: '1h20 · chegar cedo pra altitude',
            cost: 420,
          },
          {
            time: '14:00',
            icon: 'bed',
            title: 'Check-in em San Blas',
            note: 'Chá de coca e descanso',
            cost: 0,
          },
          {
            time: '19:30',
            icon: 'fork-knife',
            title: 'Jantar no Chicha',
            note: 'Reservar com antecedência',
            cost: 160,
          },
        ],
      },
      {
        label: 'Vale Sagrado',
        items: [
          {
            time: '08:00',
            icon: 'van',
            title: 'Vale Sagrado em um dia',
            note: 'Pisac, Moray e Ollantaytambo',
            cost: 280,
          },
        ],
      },
      {
        label: 'Machu Picchu',
        items: [
          {
            time: '05:30',
            icon: 'train',
            title: 'Trem para Aguas Calientes',
            note: 'Ida e volta no mesmo dia',
            cost: 540,
          },
          {
            time: '10:00',
            icon: 'mountains',
            title: 'Machu Picchu · circuito 2',
            note: 'Ingresso já comprado',
            cost: 310,
          },
        ],
      },
      {
        label: 'Dia livre',
        items: [],
      },
    ],
  },
  {
    id: 'japao',
    title: 'Cerejeiras no Japão',
    place: 'Tóquio e Kyoto',
    flag: '🇯🇵',
    dates: 'abr 2027 · datas a definir',
    status: 'Rascunho',
    sugKey: 'japao',
    days: [
      {
        label: 'Tóquio',
        items: [
          {
            time: '07:00',
            icon: 'flower',
            title: 'Hanami no Parque Ueno',
            note: 'Chegar cedo pra pegar lugar',
            cost: 0,
          },
        ],
      },
      {
        label: 'Tóquio',
        items: [],
      },
      {
        label: 'Kyoto',
        items: [],
      },
    ],
  },
];

export const RECS: Recommendation[] = [
  {
    id: 'rec-lisboa',
    title: 'Lisboa em 4 dias, sem correr',
    author: 'Marina Costa',
    ini: 'MC',
    region: 'Europa',
    place: 'Lisboa, Portugal',
    flag: '🇵🇹',
    saves: '2,3 mil',
    rating: '4,9',
    sugKey: 'lisboa',
    days: [
      {
        label: 'Alfama e Graça',
        items: [
          {
            time: '09:00',
            icon: 'train',
            title: 'Elétrico 28 no Martim Moniz',
            note: 'Antes das 9h dá pra sentar',
            cost: 20,
          },
          {
            time: '11:00',
            icon: 'camera',
            title: 'Miradouro da Graça',
            note: 'A melhor vista do castelo',
            cost: 0,
          },
          {
            time: '20:00',
            icon: 'music-notes',
            title: 'Fado em Alfama',
            note: 'Casa pequena, sem show turístico',
            cost: 220,
          },
        ],
      },
      {
        label: 'Belém',
        items: [
          {
            time: '10:00',
            icon: 'bank',
            title: 'Mosteiro dos Jerónimos',
            note: 'Compre online',
            cost: 110,
          },
          {
            time: '12:30',
            icon: 'coffee',
            title: 'Pastéis de Belém',
            note: 'Coma lá dentro, a fila anda',
            cost: 30,
          },
          {
            time: '18:00',
            icon: 'boat',
            title: 'Veleiro no Tejo',
            note: 'Pôr do sol na Torre de Belém',
            cost: 270,
          },
        ],
      },
      {
        label: 'Sintra',
        items: [
          {
            time: '08:30',
            icon: 'train',
            title: 'Trem do Rossio',
            note: '40 min até Sintra',
            cost: 30,
          },
          {
            time: '10:00',
            icon: 'bank',
            title: 'Palácio da Pena',
            note: 'Primeiro horário, menos gente',
            cost: 120,
          },
        ],
      },
      {
        label: 'Chiado e LX Factory',
        items: [
          {
            time: '11:00',
            icon: 'shopping-bag',
            title: 'LX Factory',
            note: 'Livraria Ler Devagar',
            cost: 0,
          },
          {
            time: '20:00',
            icon: 'fork-knife',
            title: 'Cervejaria Ramiro',
            note: 'Prego no fim, como sobremesa',
            cost: 260,
          },
        ],
      },
    ],
  },
  {
    id: 'rec-kyoto',
    title: 'Kyoto na época das cerejeiras',
    author: 'Rafael Lima',
    ini: 'RL',
    region: 'Ásia',
    place: 'Kyoto, Japão',
    flag: '🇯🇵',
    saves: '1,8 mil',
    rating: '4,8',
    sugKey: 'japao',
    days: [
      {
        label: 'Higashiyama',
        items: [
          {
            time: '06:30',
            icon: 'bank',
            title: 'Kiyomizu-dera',
            note: 'Abre às 6h, vá antes da multidão',
            cost: 25,
          },
          {
            time: '18:00',
            icon: 'lantern',
            title: 'Gion à noite',
            note: 'Ruas de madeira e lanternas',
            cost: 0,
          },
        ],
      },
      {
        label: 'Arashiyama',
        items: [
          {
            time: '07:00',
            icon: 'tree',
            title: 'Bosque de bambu',
            note: 'Num dia de semana',
            cost: 0,
          },
          {
            time: '12:00',
            icon: 'bowl-food',
            title: 'Tofu no Shigetsu',
            note: 'Almoço vegetariano no templo',
            cost: 180,
          },
        ],
      },
      {
        label: 'Fushimi Inari',
        items: [
          {
            time: '07:00',
            icon: 'mountains',
            title: 'Trilha dos mil portões',
            note: '2h até o topo',
            cost: 0,
          },
        ],
      },
    ],
  },
  {
    id: 'rec-pat',
    title: 'Patagônia de carro em 7 dias',
    author: 'Bia Souza',
    ini: 'BS',
    region: 'América do Sul',
    place: 'El Calafate, Argentina',
    flag: '🇦🇷',
    saves: '960',
    rating: '4,7',
    sugKey: 'generic',
    days: [
      {
        label: 'El Calafate',
        items: [
          {
            time: '15:00',
            icon: 'car',
            title: 'Retirar o carro no aeroporto',
            note: '4x4 não é necessário',
            cost: 900,
          },
        ],
      },
      {
        label: 'Perito Moreno',
        items: [
          {
            time: '09:00',
            icon: 'mountains',
            title: 'Passarelas do glaciar',
            note: 'Leve camadas de roupa',
            cost: 180,
          },
        ],
      },
      {
        label: 'El Chaltén',
        items: [
          {
            time: '07:00',
            icon: 'person-simple-hike',
            title: 'Laguna de los Tres',
            note: '20 km, o dia todo',
            cost: 0,
          },
        ],
      },
    ],
  },
];

export const SUG: Record<SuggestionKey, Suggestion[]> = {
  peru: [
    {
      icon: 'bowl-food',
      title: 'Mercado San Pedro',
      note: 'Sucos e almoço barato',
      cost: 40,
    },
    {
      icon: 'person-simple-hike',
      title: 'Montanha Colorida',
      note: 'Saída às 4h · dia inteiro',
      cost: 220,
    },
    {
      icon: 'bank',
      title: 'Qorikancha',
      note: 'Templo inca no centro',
      cost: 45,
    },
    {
      icon: 'coffee',
      title: 'Café com vista em San Blas',
      note: 'Fim de tarde',
      cost: 30,
    },
  ],
  japao: [
    {
      icon: 'bank',
      title: 'Templo Senso-ji',
      note: 'Asakusa, de manhã',
      cost: 0,
    },
    {
      icon: 'bowl-food',
      title: 'Lámen em Shinjuku',
      note: 'Omoide Yokocho',
      cost: 80,
    },
    {
      icon: 'train',
      title: 'Shinkansen Tóquio → Kyoto',
      note: '2h15',
      cost: 720,
    },
    {
      icon: 'flower',
      title: 'Caminho do Filósofo',
      note: 'Cerejeiras ao longo do canal',
      cost: 0,
    },
  ],
  lisboa: [
    {
      icon: 'camera',
      title: 'Miradouro da Senhora do Monte',
      note: 'Pôr do sol',
      cost: 0,
    },
    {
      icon: 'fork-knife',
      title: 'Time Out Market',
      note: 'Almoço no Cais do Sodré',
      cost: 120,
    },
  ],
  generic: [
    {
      icon: 'camera',
      title: 'Mirante da cidade',
      note: 'Fim de tarde',
      cost: 0,
    },
    {
      icon: 'fork-knife',
      title: 'Restaurante local',
      note: 'Indicado pela comunidade',
      cost: 150,
    },
    {
      icon: 'shopping-bag',
      title: 'Mercado central',
      note: 'Artesanato e comida',
      cost: 60,
    },
  ],
};

export const PASSEIOS: Tour[] = [
  {
    id: 'tejo',
    name: 'Pôr do sol de veleiro no Tejo',
    place: 'Lisboa',
    dur: '2h',
    price: 45,
    cur: '€',
    rating: '4,8',
    reviews: 312,
    cat: 'Barco',
    host: 'Rio Tejo Sailing',
    hostIni: 'RT',
    lang: 'Português e inglês',
    group: 'Até 12 pessoas',
    desc: 'Saída da Doca de Santo Amaro rumo à Torre de Belém, com o sol baixando atrás da ponte 25 de Abril. Volta já com as luzes da cidade acesas.',
    inc: ['Vinho do Porto e petiscos', 'Skipper certificado', 'Cobertor pro fim de tarde'],
    meet: 'Doca de Santo Amaro, Alcântara',
    review: {
      who: 'Marina C.',
      text: 'Melhor fim de tarde em Lisboa. Leve casaco, venta bastante na volta.',
    },
  },
  {
    id: 'nata',
    name: 'Aula de pastel de nata',
    place: 'Lisboa',
    dur: '3h',
    price: 55,
    cur: '€',
    rating: '4,9',
    reviews: 540,
    cat: 'Gastronomia',
    host: 'Cozinha da Avó Lurdes',
    hostIni: 'AL',
    lang: 'Português',
    group: 'Até 8 pessoas',
    desc: 'Massa folhada do zero, creme no ponto e forno bem quente. Você sai com uma caixa de pastéis e a receita da família.',
    inc: ['Todos os ingredientes', 'Avental e receita impressa', 'Caixa com 6 pastéis'],
    meet: 'Rua da Madalena, Baixa',
    review: {
      who: 'Caio R.',
      text: 'A Lurdes é uma figura. Os meus ficaram tortos e mesmo assim deliciosos.',
    },
  },
  {
    id: 'lagoinha',
    name: 'Lagoinha do Leste com guia',
    place: 'Florianópolis',
    dur: '5h',
    price: 120,
    cur: 'R$',
    rating: '4,7',
    reviews: 188,
    cat: 'Trilhas',
    host: 'Trilhas da Ilha',
    hostIni: 'TI',
    lang: 'Português',
    group: 'Até 10 pessoas',
    desc: 'Subida pelo Pântano do Sul, parada no mirante e tarde livre numa das praias mais bonitas da ilha.',
    inc: ['Guia credenciado', 'Lanche de trilha', 'Seguro aventura'],
    meet: 'Pântano do Sul, em frente à igreja',
    review: {
      who: 'João P.',
      text: 'Trilha puxada no começo, mas a vista lá de cima compensa tudo.',
    },
  },
  {
    id: 'fado',
    name: 'Noite de fado em Alfama',
    place: 'Lisboa',
    dur: '2h30',
    price: 38,
    cur: '€',
    rating: '4,6',
    reviews: 276,
    cat: 'Cultura',
    host: 'Casa do Fado Vadio',
    hostIni: 'FV',
    lang: 'Português',
    group: 'Até 30 pessoas',
    desc: 'Casa pequena, luz baixa e fadistas do bairro. Inclui jantar português com entrada, prato e sobremesa.',
    inc: ['Jantar completo', 'Uma taça de vinho', 'Lugar reservado'],
    meet: 'Beco do Mexias, Alfama',
    review: {
      who: 'Bia S.',
      text: 'Arrepiou. Nada de show pra turista, é fado de verdade.',
    },
  },
  {
    id: 'valle',
    name: 'Vale Sagrado em um dia',
    place: 'Cusco',
    dur: '10h',
    price: 280,
    cur: 'R$',
    rating: '4,8',
    reviews: 421,
    cat: 'Cultura',
    host: 'Inka Andes Tours',
    hostIni: 'IA',
    lang: 'Espanhol e português',
    group: 'Até 16 pessoas',
    desc: 'Pisac, Moray, as salinas de Maras e Ollantaytambo num só dia, com almoço buffet no caminho.',
    inc: ['Transporte ida e volta', 'Guia bilíngue', 'Almoço buffet'],
    meet: 'Busca no hotel, em Cusco',
    review: {
      who: 'Rafael L.',
      text: 'Dia longo, mas bem organizado. As salinas são surreais.',
    },
  },
];

export const SAVED: SavedItem[] = [
  {
    id: 'ci-Pastéis de Belém',
    name: 'Pastéis de Belém',
    cat: 'Gastronomia',
    city: 'Lisboa',
    flag: '🇵🇹',
    meta: 'Doceria · desde 1837',
    rating: '4,8',
  },
  {
    id: 'ci-Miradouro da Senhora do Monte',
    name: 'Miradouro da Senhora do Monte',
    cat: 'Atrações',
    city: 'Lisboa',
    flag: '🇵🇹',
    meta: 'Mirante · grátis',
    rating: '4,8',
  },
  {
    id: 'ci-Cervejaria Ramiro',
    name: 'Cervejaria Ramiro',
    cat: 'Gastronomia',
    city: 'Lisboa',
    flag: '🇵🇹',
    meta: 'Frutos do mar · €€€',
    rating: '4,7',
  },
  {
    id: 'pas-tejo',
    name: 'Pôr do sol de veleiro no Tejo',
    cat: 'Passeios',
    city: 'Lisboa',
    flag: '🇵🇹',
    meta: '2h · € 45',
    rating: '4,8',
  },
  {
    id: 'sv-kiyomizu',
    name: 'Kiyomizu-dera',
    cat: 'Atrações',
    city: 'Kyoto',
    flag: '🇯🇵',
    meta: 'Templo · abre às 6h',
    rating: '4,7',
  },
  {
    id: 'sv-ryokan',
    name: 'Ryokan Yachiyo',
    cat: 'Hospedagem',
    city: 'Kyoto',
    flag: '🇯🇵',
    meta: 'Ryokan tradicional · ¥¥¥',
    rating: '4,9',
  },
  {
    id: 'sv-ichiran',
    name: 'Ichiran Shibuya',
    cat: 'Gastronomia',
    city: 'Tóquio',
    flag: '🇯🇵',
    meta: 'Lámen · aberto 24h',
    rating: '4,5',
  },
  {
    id: 'sv-mirante-lagoa',
    name: 'Mirante da Lagoa',
    cat: 'Atrações',
    city: 'Florianópolis',
    flag: '🇧🇷',
    meta: 'Mirante · pôr do sol',
    rating: '4,9',
  },
];

export const COLLS: Collection[] = [
  {
    id: 'c1',
    name: 'Comer em Lisboa',
    ids: ['ci-Pastéis de Belém', 'ci-Cervejaria Ramiro'],
  },
  {
    id: 'c2',
    name: 'Mirantes pelo mundo',
    ids: ['ci-Miradouro da Senhora do Monte', 'sv-mirante-lagoa', 'sv-kiyomizu'],
  },
  {
    id: 'c3',
    name: 'Japão 2027',
    ids: ['sv-kiyomizu', 'sv-ryokan', 'sv-ichiran'],
  },
  {
    id: 'c4',
    name: 'Pra ir com a Marina',
    ids: ['pas-tejo'],
  },
];

export const REGION: Region = {
  name: 'Lisboa e Vale do Tejo',
  tagline: 'A capital, a serra de Sintra e o litoral de Cascais a menos de uma hora um do outro.',
  facts: [
    {
      icon: 'sun',
      label: 'Clima',
      value: 'Ameno o ano todo',
    },
    {
      icon: 'calendar-check',
      label: 'Melhor época',
      value: 'abr – jun, set – out',
    },
    {
      icon: 'airplane-landing',
      label: 'Como chegar',
      value: 'Aeroporto Humberto Delgado',
    },
    {
      icon: 'train',
      label: 'Entre cidades',
      value: 'Trem do Rossio e Cais do Sodré',
    },
  ],
  cities: [
    {
      name: 'Lisboa',
      note: 'Mirantes, fado e pastéis',
      go: 'city',
    },
    {
      name: 'Sintra',
      note: 'Palácios na serra · 40 min de trem',
    },
    {
      name: 'Cascais',
      note: 'Praia e vila de pescadores',
    },
    {
      name: 'Setúbal',
      note: 'Arrábida e choco frito',
    },
  ],
  highlights: [
    {
      name: 'Palácio da Pena',
      meta: 'Sintra · € 20',
    },
    {
      name: 'Cabo da Roca',
      meta: 'O ponto mais a oeste da Europa',
    },
    {
      name: 'Praias da Arrábida',
      meta: 'Setúbal · melhor em junho',
    },
  ],
};

export const PLACE_INFO: Record<string, PlaceInfo> = {
  'Miradouro da Senhora do Monte': {
    desc: 'O mirante mais alto de Lisboa, com o castelo, a Baixa e o Tejo de uma vez só. Fica cheio no pôr do sol, mas vale cada degrau.',
    rows: [
      ['clock', 'Horário', 'Aberto 24h'],
      ['coins', 'Preço', 'Grátis'],
      ['map-pin', 'Endereço', 'Largo Monte, Graça'],
      ['hourglass', 'Tempo médio', '30–45 min'],
    ],
  },
};

export const PLACE_TIPS: PlaceTip[] = [
  {
    who: 'Marina Costa',
    ini: 'MC',
    when: 'há 3 dias',
    text: 'Chega 40 minutos antes do pôr do sol pra pegar lugar na mureta.',
    pct: '96%',
  },
  {
    who: 'Caio Ramos',
    ini: 'CR',
    when: 'há 2 semanas',
    text: 'Sobe de elétrico 28 até a Graça e faz o resto a pé, são 5 minutos.',
    pct: '91%',
  },
];

export const TRAVELERS: Record<string, Traveler> = {
  'Marina Costa': {
    ini: 'MC',
    handle: '@marinaporai',
    city: 'Lisboa',
    bio: 'Brasileira morando em Lisboa. Escrevo sobre comer bem e andar devagar.',
    countries: ['620', '076', '724', '250', '380', '504', '826'],
    cities: 31,
    trips: [
      {
        title: 'Marrocos de trem',
        flag: '🇲🇦',
        meta: 'Marraquexe · 2025',
      },
      {
        title: 'Norte de Portugal',
        flag: '🇵🇹',
        meta: 'Porto e Douro · 2025',
      },
      {
        title: 'Andaluzia',
        flag: '🇪🇸',
        meta: 'Sevilha · 2024',
      },
      {
        title: 'Londres no inverno',
        flag: '🇬🇧',
        meta: '2023',
      },
    ],
  },
  'Rafael Lima': {
    ini: 'RL',
    handle: '@rafa.mundo',
    city: 'Curitiba',
    bio: 'Engenheiro, fotógrafo nas férias. Já fui ao Japão 4 vezes e ainda não cansei.',
    countries: ['392', '410', '764', '076', '032', '840'],
    cities: 24,
    trips: [
      {
        title: 'Kyoto na primavera',
        flag: '🇯🇵',
        meta: '2026',
      },
      {
        title: 'Seul em 5 dias',
        flag: '🇰🇷',
        meta: '2025',
      },
      {
        title: 'Tailândia de mochila',
        flag: '🇹🇭',
        meta: '2024',
      },
      {
        title: 'Nova York',
        flag: '🇺🇸',
        meta: '2023',
      },
    ],
  },
  'Bia Souza': {
    ini: 'BS',
    handle: '@biasouza',
    city: 'Florianópolis',
    bio: 'Trilheira. Se tem montanha, eu vou. Se tem ostra, eu fico.',
    countries: ['076', '032', '152', '604', '170'],
    cities: 19,
    trips: [
      {
        title: 'Patagônia de carro',
        flag: '🇦🇷',
        meta: '2024',
      },
      {
        title: 'Torres del Paine',
        flag: '🇨🇱',
        meta: '2023',
      },
      {
        title: 'Caminho Inca',
        flag: '🇵🇪',
        meta: '2022',
      },
      {
        title: 'Cartagena',
        flag: '🇨🇴',
        meta: '2021',
      },
    ],
  },
};

export const COMMENTS: Record<string, Comment[]> = {
  p1: [
    {
      who: 'Caio Ramos',
      ini: 'CR',
      when: 'há 1 dia',
      text: 'Confirmo! Fui sábado às 8h40 e sentei na janela.',
    },
    {
      who: 'Lúcia M.',
      ini: 'LM',
      when: 'há 20 h',
      text: 'Dica extra: valida o cartão Navegante antes, a fila do motorista é lenta.',
    },
  ],
  p2: [
    {
      who: 'Bia Souza',
      ini: 'BS',
      when: 'há 3 dias',
      text: 'Salvei! Arashiyama de semana faz toda a diferença.',
    },
  ],
  p3: [
    {
      who: 'João P.',
      ini: 'JP',
      when: 'há 5 dias',
      text: 'Reservei pelo WhatsApp do restaurante, foi rápido.',
    },
  ],
};

export const EXPERTS: Expert[] = [
  {
    id: 'e1',
    ini: 'AS',
    name: 'Ana Serrano',
    role: 'Guia credenciada em Lisboa',
    area: 'Portugal',
    title: 'Lisboa em agosto: o que muda',
    text: 'Muitos restaurantes de bairro fecham pra férias na segunda quinzena. Confira antes de ir.',
  },
  {
    id: 'e2',
    ini: 'KT',
    name: 'Kenji Tanaka',
    role: 'Agência Kansai Trips',
    area: 'Japão',
    title: 'JR Pass ainda compensa?',
    text: 'Depois do reajuste, só vale pra quem faz Tóquio–Kyoto–Hiroshima em até 7 dias.',
  },
  {
    id: 'e3',
    ini: 'LP',
    name: 'Lucas Pereira',
    role: 'Guia de montanha · ACMF',
    area: 'Patagônia',
    title: 'Laguna de los Tres no outono',
    text: 'De abril em diante, saia antes das 7h. O último trecho congela à tarde.',
  },
];

export const PDATES: [string, string][] = [
  ['sex', '6'],
  ['sáb', '7'],
  ['dom', '8'],
  ['seg', '9'],
  ['ter', '10'],
  ['qua', '11'],
];
