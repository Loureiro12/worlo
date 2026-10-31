import {
  type GeoPermissibleObjects,
  type GeoProjection,
  geoCentroid,
  geoContains,
  geoDistance,
  geoGraticule10,
  geoOrthographic,
  geoPath,
} from 'd3-geo';
import type { Feature, Geometry } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import world from 'world-atlas/countries-110m.json';

export type CountryFeature = Feature<Geometry, { name: string }> & {
  /** ISO 3166-1 numeric, zero padded ("076" = Brasil). */
  id: string;
  centroid: [number, number];
};

export type LonLat = [number, number];

/** Visual centroids for countries whose geometric centroid falls off-land. */
export const CENTROID_OVERRIDES: Record<string, LonLat> = {
  '076': [-52, -11],
  '620': [-8, 39.6],
  '032': [-64, -35],
  '152': [-71, -33],
  '250': [2.5, 46.6],
  '380': [12.5, 42.8],
  '392': [138, 36.5],
  '352': [-18.6, 64.9],
  '484': [-102, 23.6],
  '504': [-6.5, 31.8],
  '604': [-75, -9.5],
};

let cache: CountryFeature[] | null = null;

/** Natural Earth 110m countries, parsed once. */
export function countries(): CountryFeature[] {
  if (cache) return cache;
  const topology = world as unknown as Topology<{
    countries: GeometryCollection<{ name: string }>;
  }>;
  const collection = feature(topology, topology.objects.countries);
  cache = collection.features.map((f) => {
    const id = String(f.id ?? '');
    return Object.assign(f, {
      id,
      centroid: CENTROID_OVERRIDES[id] ?? (geoCentroid(f as GeoPermissibleObjects) as LonLat),
    }) as CountryFeature;
  });
  return cache;
}

export function countryById(id: string): CountryFeature | undefined {
  return countries().find((c) => c.id === id);
}

export type GlobeStatus = 'none' | 'wishlist' | 'planned' | 'visited';

export type GlobeLayers = {
  visited?: readonly string[];
  planned?: readonly string[];
  wishlist?: readonly string[];
};

/** Precedence follows the prototype: visited > planned > wishlist > none. */
export function statusOf(id: string, layers: GlobeLayers): GlobeStatus {
  if (layers.visited?.includes(id)) return 'visited';
  if (layers.planned?.includes(id)) return 'planned';
  if (layers.wishlist?.includes(id)) return 'wishlist';
  return 'none';
}

export type Camera = {
  /** d3 rotation [λ, φ]; the point facing the viewer is [-λ, -φ]. */
  rotation: LonLat;
  /** Sphere radius in px (already includes zoom). */
  radius: number;
  cx: number;
  cy: number;
};

export function makeProjection({ rotation, radius, cx, cy }: Camera): GeoProjection {
  return geoOrthographic()
    .clipAngle(90)
    .precision(0.6)
    .translate([cx, cy])
    .scale(radius)
    .rotate(rotation);
}

export type GlobePaths = {
  sphere: string;
  graticule: string;
  fills: Record<GlobeStatus, string>;
  borders: string;
  wishlistOutline: string;
  selected: string;
};

const graticule = geoGraticule10();
const SPHERE = { type: 'Sphere' } as const;

/** Builds one SVG path per layer, so a frame only updates ~7 nodes. */
export function buildPaths(
  projection: GeoProjection,
  layers: GlobeLayers,
  selected?: string | null,
): GlobePaths {
  const path = geoPath(projection);
  const fills: Record<GlobeStatus, string> = { none: '', wishlist: '', planned: '', visited: '' };
  let borders = '';
  let selectedPath = '';
  for (const country of countries()) {
    const d = path(country) ?? '';
    if (!d) continue;
    fills[statusOf(country.id, layers)] += d;
    borders += d;
    if (country.id === selected) selectedPath = d;
  }
  return {
    sphere: path(SPHERE) ?? '',
    graticule: path(graticule) ?? '',
    fills,
    borders,
    wishlistOutline: fills.wishlist,
    selected: selectedPath,
  };
}

/** Is a point on the visible hemisphere (with a margin, like the prototype)? */
export function isFacing(point: LonLat, rotation: LonLat, maxAngle = 1.4): boolean {
  return geoDistance(point, [-rotation[0], -rotation[1]]) < maxAngle;
}

/** Country under a screen point, or null (ocean / back side). */
export function pickCountry(
  projection: GeoProjection,
  rotation: LonLat,
  x: number,
  y: number,
): CountryFeature | null {
  const lonLat = projection.invert?.([x, y]) as LonLat | null | undefined;
  if (!lonLat || !isFacing(lonLat, rotation, Math.PI / 2)) return null;
  return countries().find((c) => geoContains(c, lonLat)) ?? null;
}

/** Rotation that faces a lon/lat to the viewer. */
export function rotationFor([lon, lat]: LonLat): LonLat {
  return [-lon, -lat];
}

/** Shortest signed angular difference, in degrees (-180..180]. */
export function angleDelta(from: number, to: number): number {
  return ((((to - from + 540) % 360) + 360) % 360) - 180;
}

export const clampZoom = (k: number) => Math.max(0.8, Math.min(4.5, k));
export const clampLat = (lat: number) => Math.max(-75, Math.min(75, lat));
