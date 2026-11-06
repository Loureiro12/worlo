import { useQuery } from '@tanstack/react-query';
import type { IconName } from '@worlo/ui';

/**
 * Current weather at the destination (modo viagem), from MET Norway
 * Locationforecast 2.0 — free, including commercial use, CC BY 4.0: the screen
 * credits "MET Norway". Their terms: identify the app in User-Agent, at most 4
 * decimals, and reuse an answer until it `Expires`.
 */

export const WEATHER_USER_AGENT = 'Worlo/1.0 (com.worlo.app; https://worlo.app)';
const URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';

export type Weather = { temperature: number; icon: IconName; symbol: string };

type Compact = {
  properties?: {
    timeseries?: {
      data?: {
        instant?: { details?: { air_temperature?: number } };
        next_1_hours?: { summary?: { symbol_code?: string } };
        next_6_hours?: { summary?: { symbol_code?: string } };
      };
    }[];
  };
};

/** "partlycloudy_day" → the closest icon. */
export function weatherIcon(symbol: string): IconName {
  if (/thunder/.test(symbol)) return 'cloud-lightning';
  if (/snow|sleet/.test(symbol)) return 'cloud-snow';
  if (/rain|showers/.test(symbol)) return 'cloud-rain';
  if (/fog/.test(symbol)) return 'cloud-fog';
  if (/clearsky_night|fair_night/.test(symbol)) return 'moon';
  if (/clearsky|fair/.test(symbol)) return 'sun';
  if (/partlycloudy/.test(symbol)) return 'cloud-sun';
  return 'cloud';
}

export function parseWeather(json: Compact): Weather | null {
  const now = json.properties?.timeseries?.[0]?.data;
  const temperature = now?.instant?.details?.air_temperature;
  if (typeof temperature !== 'number') return null;
  const symbol =
    now?.next_1_hours?.summary?.symbol_code ?? now?.next_6_hours?.summary?.symbol_code ?? '';
  return { temperature: Math.round(temperature), icon: weatherIcon(symbol), symbol };
}

const round4 = (n: number) => Math.round(n * 10_000) / 10_000;

export async function fetchWeather(
  lat: number,
  lon: number,
): Promise<{ weather: Weather | null; expires: number }> {
  const response = await fetch(`${URL}?lat=${round4(lat)}&lon=${round4(lon)}`, {
    headers: { 'User-Agent': WEATHER_USER_AGENT, Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`weather ${response.status}`);
  const expires = Date.parse(response.headers.get('expires') ?? '') || Date.now() + 30 * 60_000;
  return { weather: parseWeather((await response.json()) as Compact), expires };
}

/** Weather at a point, reused until MET Norway says it expires. Null while loading or offline. */
export function useWeather(point: { lat?: number; lon?: number } | undefined): Weather | null {
  const lat = point?.lat;
  const lon = point?.lon;
  const { data } = useQuery({
    queryKey: ['weather', lat, lon],
    queryFn: () => fetchWeather(lat ?? 0, lon ?? 0),
    enabled: typeof lat === 'number' && typeof lon === 'number',
    staleTime: 30 * 60_000,
    gcTime: 6 * 60 * 60_000,
    retry: 1,
  });
  return data?.weather ?? null;
}
