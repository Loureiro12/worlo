import type { IconName } from '@worlo/ui';
import { normalize } from '@/lib/format';
import { countCities } from './stats';

/** Achievements (B5 · Conquistas), worked out from the user's own trips and map. */
export type AchievementId =
  | 'firstTrip'
  | 'fiveCountries'
  | 'endOfWorld'
  | 'twentyCities'
  | 'threeContinents';

export type Achievement = {
  id: AchievementId;
  icon: IconName;
} & ({ unlocked: true; meta: string } | { unlocked: false; remaining: number });

type TripFacts = { title: string; place: string; year: string };
type Input = { trips: readonly TripFacts[]; visitedMap: Record<string, string[]> };

/** ISO 3166 numeric codes (the ids of the globe) by continent. */
const CONTINENTS: Record<string, string> = {
  africa:
    '012 024 072 108 120 132 140 148 174 178 180 204 226 231 232 262 266 270 288 324 384 404 426 430 434 450 454 466 478 480 504 508 516 562 566 624 646 678 686 690 694 706 710 716 728 729 732 748 768 788 800 818 834 854 894',
  europe:
    '008 020 040 056 070 100 112 191 196 203 208 233 246 250 276 300 336 348 352 372 380 428 438 440 442 470 492 498 499 528 578 616 620 642 643 674 688 703 705 724 752 756 804 807 826',
  asia: '004 031 048 050 051 064 096 104 116 144 156 158 268 275 356 360 364 368 376 392 398 400 408 410 414 417 418 422 458 462 496 512 524 586 608 626 634 682 702 704 760 762 764 784 792 795 860 887',
  northAmerica:
    '028 044 052 084 124 188 192 212 214 222 304 308 320 332 340 388 484 558 591 630 659 662 670 780 840',
  southAmerica: '032 068 076 152 170 218 238 254 328 600 604 740 858 862',
  oceania: '036 090 242 296 520 540 548 554 583 584 585 598 776 798 882',
};

const CONTINENT_OF = new Map(
  Object.entries(CONTINENTS).flatMap(([name, ids]) =>
    ids.split(' ').map((id) => [id, name] as const),
  ),
);

export const continentOf = (countryId: string) => CONTINENT_OF.get(countryId);

const FIVE_COUNTRIES = 5;
const TWENTY_CITIES = 20;
const THREE_CONTINENTS = 3;

/** The southern tip of South America: what "Fim do mundo" celebrates. */
const END_OF_WORLD = /patagonia|ushuaia|calafate|torres del paine|terra do fogo|tierra del fuego/;

const firstYear = (years: readonly string[] | undefined) => [...(years ?? [])].sort()[0] ?? '';

export function computeAchievements({ trips, visitedMap }: Input): Achievement[] {
  const dated = [...trips].sort((a, b) => a.year.localeCompare(b.year));
  const first = dated[0];
  const endOfWorld = dated.find((t) => END_OF_WORLD.test(normalize(`${t.title} ${t.place}`)));

  // The year each milestone was reached: the Nth country / continent, oldest first.
  const countries = Object.keys(visitedMap);
  const countryYears = countries.map((id) => firstYear(visitedMap[id])).sort();
  const continentYears = new Map<string, string>();
  for (const id of countries) {
    const continent = continentOf(id);
    if (!continent) continue;
    const year = firstYear(visitedMap[id]);
    const known = continentYears.get(continent);
    if (known === undefined || year < known) continentYears.set(continent, year);
  }
  const continents = [...continentYears.values()].sort();
  const cities = countCities(trips);

  return [
    first
      ? {
          id: 'firstTrip',
          icon: 'airplane-takeoff',
          unlocked: true,
          meta: `${first.place} · ${first.year}`,
        }
      : { id: 'firstTrip', icon: 'airplane-takeoff', unlocked: false, remaining: 1 },
    countries.length >= FIVE_COUNTRIES
      ? {
          id: 'fiveCountries',
          icon: 'globe-hemisphere-west',
          unlocked: true,
          meta: countryYears[FIVE_COUNTRIES - 1] ?? '',
        }
      : {
          id: 'fiveCountries',
          icon: 'globe-hemisphere-west',
          unlocked: false,
          remaining: FIVE_COUNTRIES - countries.length,
        },
    endOfWorld
      ? {
          id: 'endOfWorld',
          icon: 'mountains',
          unlocked: true,
          meta: `${endOfWorld.place} · ${endOfWorld.year}`,
        }
      : { id: 'endOfWorld', icon: 'mountains', unlocked: false, remaining: 1 },
    cities >= TWENTY_CITIES
      ? { id: 'twentyCities', icon: 'buildings', unlocked: true, meta: '' }
      : {
          id: 'twentyCities',
          icon: 'buildings',
          unlocked: false,
          remaining: TWENTY_CITIES - cities,
        },
    continents.length >= THREE_CONTINENTS
      ? {
          id: 'threeContinents',
          icon: 'compass',
          unlocked: true,
          meta: continents[THREE_CONTINENTS - 1] ?? '',
        }
      : {
          id: 'threeContinents',
          icon: 'compass',
          unlocked: false,
          remaining: THREE_CONTINENTS - continents.length,
        },
  ];
}
