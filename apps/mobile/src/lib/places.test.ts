import { countryInfo, findCity, flagOf, searchPlaces, timeIn } from './places';

describe('places (GeoNames, offline)', () => {
  it('finds cities by their name in the app language or in English', () => {
    expect(searchPlaces('lisb', 'pt-BR')[0]).toMatchObject({
      kind: 'city',
      name: 'Lisboa',
      label: 'Lisboa, Portugal',
      countryId: '620',
      flag: '🇵🇹',
      timeZone: 'Europe/Lisbon',
    });
    expect(searchPlaces('londres', 'pt-BR')[0]?.label).toBe('Londres, Reino Unido');
    expect(searchPlaces('nova iorque', 'pt-BR')[0]?.countryName).toBe('EUA');
    expect(searchPlaces('munich', 'es')[0]?.name).toBe('Múnich');
    expect(searchPlaces('cusco', 'pt-BR')[0]?.label).toBe('Cusco, Peru');
  });

  it('finds countries too, and ignores accents and case', () => {
    expect(searchPlaces('japa', 'pt-BR')[0]).toMatchObject({ kind: 'country', name: 'Japão' });
    expect(searchPlaces('FLORIANOPOLIS', 'pt-BR')[0]?.name).toBe('Florianópolis');
    expect(searchPlaces('x', 'pt-BR')).toEqual([]);
  });

  it('knows every country, with its flag', () => {
    expect(countryInfo('276', 'pt-BR')).toEqual({ id: '276', name: 'Alemanha', flag: '🇩🇪' });
    expect(flagOf('BR')).toBe('🇧🇷');
    expect(flagOf('?')).toBe('📍');
  });

  it('reads the city of a destination text, for local time', () => {
    expect(findCity('Cusco, Peru')?.timeZone).toBe('America/Lima');
    expect(findCity('Lisboa')?.timeZone).toBe('Europe/Lisbon');
    expect(findCity('Casa da tia Rosa')).toBeUndefined();
    // Lima is UTC−5 all year.
    expect(timeIn('America/Lima', new Date('2026-11-06T12:00:00Z'))).toBe('07:00');
  });
});
