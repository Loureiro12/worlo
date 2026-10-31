import type { TranslationSchema } from '../../types';

const map: TranslationSchema['map'] = {
  title: 'Your map',
  globeLabel:
    'Globe of your map. Visited: {{visited}}. Want to go: {{wishlist}}. Planning: {{planned}}.',
  filter: {
    label: 'Filter the map',
    all: 'All',
    visited: 'Visited',
    wishlist: 'Want to go',
  },
  years: {
    label: 'Filter by year',
    all: 'All years',
  },
  controls: {
    share: 'Share map',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    recenter: 'Recenter',
    list: 'Country list',
  },
  legend: {
    visited: 'Visited',
    planned: 'In an itinerary',
    wishlist: 'Want to go',
    hint: 'Zoom in to see cities and photos. Tap a country to open it.',
  },
  list: {
    title: 'Countries on your map',
    subtitle: 'Tap a country to see its summary',
  },
  sheet: {
    label: '{{name}} summary',
    capital: 'Capital',
    language: 'Language',
    currency: 'Currency',
    status: {
      visited: 'Visited',
      planned: 'Planning',
      wishlist: 'Want to go',
      none: 'Not on your map yet',
    },
    histMarked: 'Marked on your map',
    histWishlist: 'On your list of future destinations',
    beenThere: 'Been there',
    visited: 'Visited',
    wantToGo: 'Want to go',
    onList: 'On the list',
    openPage: 'See country page',
  },
  toasts: {
    visitedAdded: 'Trip saved to your map.',
    wishlistAdded: '{{country}} is on your list now.',
    savedAdded: 'Saved to your places.',
    savedRemoved: 'Removed from saved.',
    comingSoon: 'The {{name}} page is coming soon.',
  },
  empty: {
    overline: 'Your map is dark',
    title: 'Tap the countries you already know and watch the world light up.',
    mark: 'Mark countries',
    addTrip: 'Add trip',
  },
  breadcrumb: 'Path: {{path}}',
  country: {
    status: {
      visited: "You've been here",
      wishlist: 'On your Want to go list',
      none: 'Not on your map yet',
    },
    best: 'Best time',
    tipLabel: 'About this estimate',
    regions: 'Most visited regions',
    cities: 'Cities',
    minimal: "We're still putting together the full {{name}} guide. For now, the basics:",
  },
  region: {
    cities: 'Cities in the region',
    highlights: "Don't miss",
    minimal: "We're still putting together the {{name}} guide.",
  },
  city: {
    categories: 'Categories',
    save: 'Save {{name}}',
    unsave: 'Remove {{name}} from saved',
    saveHint: 'Touch and hold to save to a collection',
    tipTitle: 'Community tip',
    reliabilityHigh: 'Highly reliable',
    confirm: '{{pct}} confirm',
    addToItinerary: 'Add to itinerary',
    addedToItinerary: '{{name}} was added to your itinerary.',
    minimal: "We're still putting together the {{name}} guide.",
  },
  place: {
    save: 'Save',
    saved: 'Saved',
    stats: '· {{reviews}} reviews · {{travelers}} Worlo travelers went',
    tipsTitle: 'Tips from people who went',
    confirm: '{{pct}} confirm',
    toursTitle: 'Tours nearby',
    toursText: 'Sailing on the Tagus, fado in Alfama and more',
    addToItinerary: 'Add to itinerary',
    addedToItinerary: '{{place}} was added to “{{itinerary}}”.',
    genericDesc:
      '{{name}} is one of the places people remember most from {{city}}. The tips below come from Worlo travelers.',
    rows: {
      type: 'Type',
      price: 'Price',
      hours: 'Hours',
      duration: 'Average time',
    },
    fallback: {
      price: 'Check on site',
      hours: 'Varies by season',
      duration: '1–2h',
    },
  },
};

export default map;
