import type { IconName } from '@worlo/ui';
import { collaboratorsOf, isListed } from '@/data/collab';
import { repos } from '@/data/repositories';
import { useQuery } from '@/data/useQuery';
import { countCities } from './stats';

/**
 * Conquistas (QA round 1, 8 official rules). Everything is computed from the
 * account's own data, so progress moves by itself as trips, the map and
 * travel mode fill up.
 *
 *   firstCountry        1 country marked on the map
 *   firstTrip           1 trip
 *   fiveCountries       5 countries
 *   tenCities           10 different cities across trips
 *   frequentTraveler    5 trips
 *   experienceExplorer  20 experiences recorded in travel mode
 *   tripWithFriends     a trip with someone else on it
 *   newContinent        a country outside the continent of the first trip
 */
export type AchievementId =
  | 'firstCountry'
  | 'firstTrip'
  | 'fiveCountries'
  | 'tenCities'
  | 'frequentTraveler'
  | 'experienceExplorer'
  | 'tripWithFriends'
  | 'newContinent';

export type Achievement = {
  id: AchievementId;
  icon: IconName;
} & ({ unlocked: true; meta: string } | { unlocked: false; remaining: number });

type TripFacts = {
  title: string;
  place: string;
  year: string;
  countryIso?: string | null;
  /** Someone else was on this trip (member or companion). */
  withFriends?: boolean;
};

export type AchievementInput = {
  trips: readonly TripFacts[];
  visitedMap: Record<string, string[]>;
  /** Experiences recorded in travel mode (activities, stops done). */
  experiences?: number;
};

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

const firstYear = (years: readonly string[] | undefined) => [...(years ?? [])].sort()[0] ?? '';

type Rule = {
  id: AchievementId;
  icon: IconName;
  /** How far the account is, and the goal. */
  progress: (input: Required<AchievementInput>) => { have: number; goal: number; meta: string };
};

const byYear = <T extends { year: string }>(list: readonly T[]) =>
  [...list].sort((a, b) => a.year.localeCompare(b.year));

const RULES: readonly Rule[] = [
  {
    id: 'firstCountry',
    icon: 'flag',
    progress: ({ visitedMap }) => {
      const years = Object.values(visitedMap).map(firstYear).sort();
      return { have: Object.keys(visitedMap).length, goal: 1, meta: years[0] ?? '' };
    },
  },
  {
    id: 'firstTrip',
    icon: 'airplane-takeoff',
    progress: ({ trips }) => {
      const first = byYear(trips)[0];
      return { have: trips.length, goal: 1, meta: first ? `${first.place} · ${first.year}` : '' };
    },
  },
  {
    id: 'fiveCountries',
    icon: 'globe-hemisphere-west',
    progress: ({ visitedMap }) => {
      const years = Object.values(visitedMap).map(firstYear).sort();
      return { have: years.length, goal: 5, meta: years[4] ?? '' };
    },
  },
  {
    id: 'tenCities',
    icon: 'buildings',
    progress: ({ trips }) => ({ have: countCities(trips), goal: 10, meta: '' }),
  },
  {
    id: 'frequentTraveler',
    icon: 'arrows-clockwise',
    progress: ({ trips }) => ({
      have: trips.length,
      goal: 5,
      meta: byYear(trips)[4]?.year ?? '',
    }),
  },
  {
    id: 'experienceExplorer',
    icon: 'map-trifold',
    progress: ({ experiences }) => ({ have: experiences, goal: 20, meta: '' }),
  },
  {
    id: 'tripWithFriends',
    icon: 'users-three',
    progress: ({ trips }) => {
      const first = byYear(trips.filter((t) => t.withFriends))[0];
      return {
        have: first ? 1 : 0,
        goal: 1,
        meta: first ? `${first.place} · ${first.year}` : '',
      };
    },
  },
  {
    id: 'newContinent',
    icon: 'compass',
    progress: ({ trips, visitedMap }) => {
      // Home continent: the first trip's country, else the first country marked.
      const firstTripCountry = byYear(trips).find((t) => t.countryIso)?.countryIso ?? null;
      const marked = Object.entries(visitedMap).sort(([, a], [, b]) =>
        firstYear(a).localeCompare(firstYear(b)),
      );
      const home = continentOf(firstTripCountry ?? marked[0]?.[0] ?? '');
      const away = marked.find(([id]) => home && continentOf(id) && continentOf(id) !== home);
      return { have: away ? 1 : 0, goal: 1, meta: away ? firstYear(away[1]) : '' };
    },
  },
];

export function computeAchievements(input: AchievementInput): Achievement[] {
  const full = { experiences: 0, ...input };
  return RULES.map((rule) => {
    const { have, goal, meta } = rule.progress(full);
    return have >= goal
      ? { id: rule.id, icon: rule.icon, unlocked: true, meta }
      : { id: rule.id, icon: rule.icon, unlocked: false, remaining: goal - have };
  });
}

/** The account's achievements from the device's data (trips, map, travel mode). */
export function readAchievements(): Achievement[] {
  {
    const trips = repos.trips
      .list()
      .filter((row) => isListed('trip', row))
      .map((row) => ({
        title: row.title,
        place: row.place,
        year: row.year,
        countryIso: row.countryIso,
        withFriends: collaboratorsOf('trip', row).some((c) => c.status === 'ok'),
      }));
    return computeAchievements({
      trips,
      visitedMap: repos.world.visitedMap(),
      experiences: repos.planning.experienceCount(),
    });
  }
}

/** Live: recomputed whenever local data changes. */
export function useAchievements(): Achievement[] {
  return useQuery(readAchievements, []);
}
