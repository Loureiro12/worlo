import { fetchWeather, parseWeather, WEATHER_USER_AGENT, weatherIcon } from './weather';

describe('weather (MET Norway)', () => {
  it('reads the current temperature and sky', () => {
    expect(
      parseWeather({
        properties: {
          timeseries: [
            {
              data: {
                instant: { details: { air_temperature: 17.6 } },
                next_1_hours: { summary: { symbol_code: 'partlycloudy_day' } },
              },
            },
          ],
        },
      }),
    ).toEqual({ temperature: 18, icon: 'cloud-sun', symbol: 'partlycloudy_day' });
    expect(parseWeather({})).toBeNull();
  });

  it('maps MET symbols to icons', () => {
    expect(weatherIcon('lightrainshowers_day')).toBe('cloud-rain');
    expect(weatherIcon('heavysnow')).toBe('cloud-snow');
    expect(weatherIcon('clearsky_night')).toBe('moon');
    expect(weatherIcon('fog')).toBe('cloud-fog');
    expect(weatherIcon('cloudy')).toBe('cloud');
  });

  it('identifies the app and sends at most 4 decimals, as MET requires', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      headers: { get: () => 'Thu, 06 Nov 2026 12:30:00 GMT' },
      json: async () => ({}),
    } as unknown as Response);
    const result = await fetchWeather(-13.531_95, -71.967_46);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=-13.5319&lon=-71.9675',
      { headers: { 'User-Agent': WEATHER_USER_AGENT, Accept: 'application/json' } },
    );
    expect(result.expires).toBe(Date.parse('Thu, 06 Nov 2026 12:30:00 GMT'));
    fetchSpy.mockRestore();
  });
});
