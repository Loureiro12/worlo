import { computeAchievements, continentOf } from './achievements';
import { countCities } from './stats';

const of = (input: Parameters<typeof computeAchievements>[0]) =>
  Object.fromEntries(computeAchievements(input).map((a) => [a.id, a]));

const trip = (place: string, year: string, title = place) => ({ title, place, year });

describe('computeAchievements', () => {
  it('unlocks nothing for a new account', () => {
    const all = computeAchievements({ trips: [], visitedMap: {} });
    expect(all.every((a) => !a.unlocked)).toBe(true);
    expect(of({ trips: [], visitedMap: {} })).toMatchObject({
      firstTrip: { remaining: 1 },
      fiveCountries: { remaining: 5 },
      endOfWorld: { remaining: 1 },
      twentyCities: { remaining: 20 },
      threeContinents: { remaining: 3 },
    });
  });

  it('dates the first trip from the oldest one', () => {
    const got = of({ trips: [trip('Lisboa', '2024'), trip('Rio', '2019')], visitedMap: {} });
    expect(got.firstTrip).toMatchObject({ unlocked: true, meta: 'Rio · 2019' });
  });

  it('counts five countries with the year of the fifth', () => {
    const visitedMap = { '076': ['2018'], '620': ['2019'], '724': ['2020'], '250': ['2021'] };
    expect(of({ trips: [], visitedMap }).fiveCountries).toMatchObject({ remaining: 1 });
    expect(
      of({ trips: [], visitedMap: { ...visitedMap, '380': ['2023', '2022'] } }).fiveCountries,
    ).toMatchObject({ unlocked: true, meta: '2022' });
  });

  it('needs a trip to the far south for "Fim do mundo", accents aside', () => {
    expect(of({ trips: [trip('Buenos Aires', '2022')], visitedMap: {} }).endOfWorld).toMatchObject({
      unlocked: false,
    });
    expect(
      of({ trips: [trip('El Calafate', '2024', 'Patagônia de carro')], visitedMap: {} }).endOfWorld,
    ).toMatchObject({ unlocked: true, meta: 'El Calafate · 2024' });
  });

  it('counts continents, not countries', () => {
    const southAmerica = { '076': ['2018'], '604': ['2019'], '032': ['2020'] };
    expect(of({ trips: [], visitedMap: southAmerica }).threeContinents).toMatchObject({
      remaining: 2,
    });
    expect(
      of({ trips: [], visitedMap: { ...southAmerica, '620': ['2021'], '392': ['2022'] } })
        .threeContinents,
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
