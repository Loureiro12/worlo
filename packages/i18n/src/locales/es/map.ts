import type { TranslationSchema } from '../../types';

const map: TranslationSchema['map'] = {
  title: 'Tu mapa',
  globeLabel:
    'Globo de tu mapa. Visitados: {{visited}}. Quiero ir: {{wishlist}}. En planificación: {{planned}}.',
  filter: {
    label: 'Filtrar el mapa',
    all: 'Todo',
    visited: 'Visitados',
    wishlist: 'Quiero ir',
  },
  years: {
    label: 'Filtrar por año',
    all: 'Todos los años',
  },
  controls: {
    share: 'Compartir mapa',
    zoomIn: 'Acercar',
    zoomOut: 'Alejar',
    recenter: 'Recentrar',
    list: 'Lista de países',
  },
  legend: {
    visited: 'Visitado',
    planned: 'En itinerario',
    wishlist: 'Quiero ir',
    hint: 'Acerca para ver ciudades y fotos. Toca un país para abrirlo.',
  },
  list: {
    title: 'Países en tu mapa',
    subtitle: 'Toca un país para ver el resumen',
  },
  sheet: {
    label: 'Resumen de {{name}}',
    capital: 'Capital',
    language: 'Idioma',
    currency: 'Moneda',
    status: {
      visited: 'Visitado',
      planned: 'En planificación',
      wishlist: 'Quiero ir',
      none: 'Todavía no está en tu mapa',
    },
    histMarked: 'Marcado en tu mapa',
    histWishlist: 'En tu lista de próximos destinos',
    beenThere: 'Ya fui',
    visited: 'Visitado',
    wantToGo: 'Quiero ir',
    onList: 'En la lista',
    openPage: 'Ver página del país',
  },
  toasts: {
    visitedAdded: 'Viaje guardado en tu mapa.',
    wishlistAdded: '{{country}} ya está en tu lista.',
    savedAdded: 'Guardado en tus lugares.',
    savedRemoved: 'Quitado de guardados.',
    comingSoon: 'La página de {{name}} llega pronto.',
  },
  empty: {
    overline: 'Tu mapa está apagado',
    title: 'Toca los países que ya conoces y mira cómo se enciende el mundo.',
    mark: 'Marcar países',
    addTrip: 'Agregar viaje',
  },
  breadcrumb: 'Ruta: {{path}}',
  country: {
    status: {
      visited: 'Ya estuviste aquí',
      wishlist: 'En tu lista Quiero ir',
      none: 'Todavía no está en tu mapa',
    },
    best: 'Mejor época',
    tipLabel: 'Sobre la estimación',
    regions: 'Regiones más visitadas',
    cities: 'Ciudades',
    minimal: 'Todavía estamos armando la guía completa de {{name}}. Por ahora, lo básico:',
  },
  region: {
    cities: 'Ciudades de la región',
    highlights: 'Imperdibles',
    minimal: 'Todavía estamos armando la guía de {{name}}.',
  },
  city: {
    categories: 'Categorías',
    save: 'Guardar {{name}}',
    unsave: 'Quitar {{name}} de guardados',
    saveHint: 'Mantén presionado para guardar en una colección',
    tipTitle: 'Consejo de la comunidad',
    reliabilityHigh: 'Alta confiabilidad',
    confirm: '{{pct}} confirman',
    addToItinerary: 'Agregar al itinerario',
    addedToItinerary: '{{name}} entró en tu itinerario.',
    minimal: 'Todavía estamos armando la guía de {{name}}.',
  },
  place: {
    save: 'Guardar',
    saved: 'Guardado',
    stats: '· {{reviews}} reseñas · {{travelers}} viajeros de Worlo fueron',
    tipsTitle: 'Consejos de quien fue',
    confirm: '{{pct}} confirman',
    toursTitle: 'Paseos cercanos',
    toursText: 'Velero en el Tajo, fado en Alfama y más',
    addToItinerary: 'Agregar al itinerario',
    addedToItinerary: '{{place}} entró en “{{itinerary}}”.',
    genericDesc:
      '{{name}} es uno de los lugares más recordados por quienes pasan por {{city}}. Los consejos de abajo son de viajeros de Worlo.',
    rows: {
      type: 'Tipo',
      price: 'Precio',
      hours: 'Horario',
      duration: 'Tiempo promedio',
    },
    fallback: {
      price: 'Consultar en el lugar',
      hours: 'Varía según la temporada',
      duration: '1–2h',
    },
  },
};

export default map;
