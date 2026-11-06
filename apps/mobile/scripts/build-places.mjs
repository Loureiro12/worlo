#!/usr/bin/env node
/**
 * Builds src/data/places.generated.json (destination search, local time) from
 * GeoNames (CC BY 4.0, https://www.geonames.org):
 *
 *   curl -O https://download.geonames.org/export/dump/cities15000.zip && unzip cities15000.zip
 *   curl -O https://download.geonames.org/export/dump/countryInfo.txt
 *   curl -O https://download.geonames.org/export/dump/alternateNamesV2.zip && unzip alternateNamesV2.zip
 *   node scripts/build-places.mjs <dir with the three files>
 *
 * Output (compact, read by src/lib/places.ts):
 *   { tz: string[],
 *     countries: [numeric, alpha2, name, pt, es][],
 *     cities: [name, pt, es, alternates, countryNumeric, lat, lon, tzIndex, population][] }
 * `pt` / `es` are the names in those languages ('' when equal to `name`).
 */
import { createReadStream, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';

const dir = process.argv[2];
if (!dir) {
  console.error('Usage: build-places.mjs <geonames dir>');
  process.exit(1);
}

// ISO alpha-2 → ISO numeric (the ids the globe and the catalog use).
const numericOf = new Map();
const countryRows = []; // [numeric, alpha2, name, geonameid]
for (const line of readFileSync(path.join(dir, 'countryInfo.txt'), 'utf8').split('\n')) {
  if (!line || line.startsWith('#')) continue;
  const cols = line.split('\t');
  if (!cols[0] || !cols[2]) continue;
  const numeric = cols[2].padStart(3, '0');
  numericOf.set(cols[0], numeric);
  countryRows.push([numeric, cols[0], cols[4], cols[16]]);
}

const LATIN = /^[A-Za-zÀ-ÖØ-öø-ÿ' .-]{2,30}$/;
const ACCENTS = /[ãõçáéíóúâêôàñü]/i;
const MAX_ALTERNATES = 3;

/** A few alternate names travelers type (Lisboa for Lisbon, Londres for London). */
function alternatesOf(name, ascii, raw) {
  const seen = new Set([name.toLowerCase(), ascii.toLowerCase()]);
  const prefix = ascii.slice(0, 3).toLowerCase();
  const candidates = raw
    .split(',')
    .map((a) => a.trim())
    .filter((a) => LATIN.test(a) && !seen.has(a.toLowerCase()));
  const score = (a) => (a.toLowerCase().startsWith(prefix) ? 2 : 0) + (ACCENTS.test(a) ? 1 : 0);
  const picked = [];
  for (const a of candidates.sort((x, y) => score(y) - score(x))) {
    if (score(a) === 0 || picked.length >= MAX_ALTERNATES) break;
    if (!picked.some((p) => p.toLowerCase() === a.toLowerCase())) picked.push(a);
  }
  return picked.join('|');
}

// Names in Portuguese and Spanish (the app's languages besides English).
const ids = new Set([
  ...readFileSync(path.join(dir, 'cities15000.txt'), 'utf8')
    .split('\n')
    .map((line) => line.split('\t')[0])
    .filter(Boolean),
  ...countryRows.map((row) => row[3]).filter(Boolean),
]);
const localized = new Map(); // geonameid → { pt, es, ptPreferred, esPreferred }
const lines = createInterface({ input: createReadStream(path.join(dir, 'alternateNamesV2.txt')) });
for await (const line of lines) {
  const c = line.split('\t');
  const [, id, lang, value, preferred, , colloquial, historic] = c;
  if ((lang !== 'pt' && lang !== 'es') || !ids.has(id) || colloquial === '1' || historic === '1') {
    continue;
  }
  const entry = localized.get(id) ?? {};
  const isPreferred = preferred === '1';
  if (!entry[lang] || (isPreferred && !entry[`${lang}Preferred`])) {
    entry[lang] = value;
    entry[`${lang}Preferred`] = isPreferred;
  }
  localized.set(id, entry);
}

const tz = [];
const tzIndex = new Map();
const cities = [];
for (const line of readFileSync(path.join(dir, 'cities15000.txt'), 'utf8').split('\n')) {
  if (!line) continue;
  const c = line.split('\t');
  const [id, name, ascii, alternates, lat, lon] = c;
  const names = localized.get(id) ?? {};
  const pt = names.pt && names.pt !== name ? names.pt : '';
  const es = names.es && names.es !== name ? names.es : '';
  const country = numericOf.get(c[8]);
  const zone = c[17];
  const population = Number(c[14]) || 0;
  if (!country || !zone) continue;
  if (!tzIndex.has(zone)) {
    tzIndex.set(zone, tz.length);
    tz.push(zone);
  }
  cities.push([
    name,
    pt,
    es,
    alternatesOf(name, ascii, alternates ?? ''),
    country,
    Math.round(Number(lat) * 100) / 100,
    Math.round(Number(lon) * 100) / 100,
    tzIndex.get(zone),
    Math.round(population / 1000),
  ]);
}
// Biggest first: search ranks by order.
cities.sort((a, b) => b[8] - a[8]);
const countries = countryRows.map(([numeric, alpha2, name, id]) => {
  const names = localized.get(id) ?? {};
  return [numeric, alpha2, name, names.pt ?? '', names.es ?? ''];
});
const out = path.join(import.meta.dirname, '..', 'src', 'data', 'places.generated.json');
writeFileSync(out, JSON.stringify({ tz, countries, cities }));
console.log(
  `${cities.length} cities, ${countries.length} countries, ${tz.length} time zones → ${out}`,
);
