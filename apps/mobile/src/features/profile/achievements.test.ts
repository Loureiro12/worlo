import { computeAchievements, continentOf } from './achievements';
import { countCities } from './stats';

const of = (input: Parameters<typeof computeAchievements>[0]) =>
  Object.fromEntries(computeAchievements(input).map((a) => [a.id, a]));

const trip = (place: string, year: string, title = place) => ({ title, place, year });

describe('computeAchievements (8 official rules)', () => {
  const none = { trips: [], visitedMap: {} };

  it('unlocks nothing for a new account and says how far each one is', () => {
    expect(computeAchievements(none).every((a) => !a.unlocked)).toBe(true);
    expect(of(none)).toMatchObject({
      firstCountry: { remaining: 1 },
      firstTrip: { remaining: 1 },
      fiveCountries: { remaining: 5 },
      tenCities: { remaining: 10 },
      frequentTraveler: { remaining: 5 },
      experienceExplorer: { remaining: 20 },
      tripWithFriends: { remaining: 1 },
      newContinent: { remaining: 1 },
    });
  });

  it('first country and first trip, dated', () => {
    const got = of({
      trips: [trip('Lisboa', '2024'), trip('Rio', '2019')],
      visitedMap: { '076': ['2019'] },
    });
    expect(got.firstCountry).toMatchObject({ unlocked: true, meta: '2019' });
    expect(got.firstTrip).toMatchObject({ unlocked: true, meta: 'Rio · 2019' });
  });

  it('counts five countries with the year of the fifth', () => {
    const visitedMap = { '076': ['2018'], '620': ['2019'], '724': ['2020'], '250': ['2021'] };
    expect(of({ trips: [], visitedMap }).fiveCountries).toMatchObject({ remaining: 1 });
    expect(
      of({ trips: [], visitedMap: { ...visitedMap, '380': ['2023', '2022'] } }).fiveCountries,
    ).toMatchObject({ unlocked: true, meta: '2022' });
  });

  it('ten different cities and five trips make a frequent traveler', () => {
    const trips = ['Rio', 'Lisboa', 'Porto', 'Paris', 'Roma'].map((c, i) => trip(c, `202${i}`));
    const got = of({ trips, visitedMap: {} });
    expect(got.tenCities).toMatchObject({ remaining: 5 });
    expect(got.frequentTraveler).toMatchObject({ unlocked: true, meta: '2024' });
  });

  it('twenty experiences recorded in travel mode', () => {
    expect(of({ ...none, experiences: 19 }).experienceExplorer).toMatchObject({ remaining: 1 });
    expect(of({ ...none, experiences: 20 }).experienceExplorer).toMatchObject({ unlocked: true });
  });

  it('a trip with someone else on it', () => {
    const solo = trip('Lisboa', '2023');
    expect(of({ trips: [solo], visitedMap: {} }).tripWithFriends).toMatchObject({
      unlocked: false,
    });
    expect(
      of({ trips: [solo, { ...trip('Jeri', '2024'), withFriends: true }], visitedMap: {} })
        .tripWithFriends,
    ).toMatchObject({ unlocked: true, meta: 'Jeri · 2024' });
  });

  it("a new continent: a country outside the first trip's continent", () => {
    const first = { ...trip('Rio', '2019'), countryIso: '076' };
    const southAmerica = { '076': ['2019'], '032': ['2020'] };
    expect(of({ trips: [first], visitedMap: southAmerica }).newContinent).toMatchObject({
      unlocked: false,
    });
    expect(
      of({ trips: [first], visitedMap: { ...southAmerica, '620': ['2022'] } }).newContinent,
    ).toMatchObject({ unlocked: true, meta: '2022' });
  });

  it('knows the continent of the countries people mark', () => {
    expect(continentOf('620')).toBe('europe');
    expect(continentOf('076')).toBe('southAmerica');
    expect(continentOf('840')).toBe('northAmerica');
    expect(continentOf('392')).toBe('asia');
    expect(continentOf('710')).toBe('africa');
    expect(continentOf('036')).toBe('oceania');
  });
});

describe('countCities', () => {
  it('counts each city once, however it was typed', () => {
    expect(
      countCities([
        { place: 'Lisboa' },
        { place: 'lisboa, Portugal' },
        { place: ' ' },
        { place: 'Porto' },
      ]),
    ).toBe(2);
  });
});
