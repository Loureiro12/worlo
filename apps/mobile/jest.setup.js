// Native modules without a JS fallback, replaced by in-memory fakes.

jest.mock('expo-sqlite/kv-store', () => {
  const store = new Map();
  const Storage = {
    getItemSync: (key) => (store.has(key) ? store.get(key) : null),
    setItemSync: (key, value) => store.set(key, value),
    removeItemSync: (key) => store.delete(key),
    clear: () => store.clear(),
  };
  return { __esModule: true, default: Storage };
});

// The app's SQLite database, backed by better-sqlite3 in memory with the real
// migrations. jest.after-env.js reseeds it before every test.
jest.mock('@/lib/database', () => {
  const path = require('node:path');
  const Database = require('better-sqlite3');
  const { drizzle } = require('drizzle-orm/better-sqlite3');
  const { migrate } = require('drizzle-orm/better-sqlite3/migrator');
  const { schema } = require('@worlo/db');
  const db = drizzle(new Database(':memory:'), { schema });
  migrate(db, {
    migrationsFolder: path.join(path.dirname(require.resolve('@worlo/db')), '../drizzle'),
  });
  return { db };
});

// No backend in unit tests: auth state comes from test-utils, sync stays offline.
jest.mock('expo-sqlite/localStorage/install', () => ({}));

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);

jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn(), hasPlayServices: jest.fn(), signIn: jest.fn() },
  isErrorWithCode: () => false,
  statusCodes: {},
}));

// The real hook waits for native font loading; screens only need "loaded".
jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  useFonts: () => [true, null],
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(() => Promise.resolve(true)),
  getStringAsync: jest.fn(() => Promise.resolve('')),
}));

// The native module is absent in Jest: repositories need real ids for new rows.
jest.mock('expo-crypto', () => ({
  ...jest.requireActual('expo-crypto'),
  randomUUID: () => require('node:crypto').randomUUID(),
}));

// jest-expo stubs the native module (randomUUID → undefined); repositories need real ids.
jest.mock('expo-crypto', () => ({
  ...jest.requireActual('expo-crypto'),
  randomUUID: () => require('node:crypto').randomUUID(),
}));

// Weather comes from MET Norway over the network: never from tests (the pure
// parts are tested in lib/weather.test.ts).
jest.mock('@/lib/weather', () => ({
  ...jest.requireActual('@/lib/weather'),
  useWeather: () => null,
}));

// Share export: no native modules in Jest. Tests read the calls.
jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(async () => 'file:///tmp/share.png'),
  releaseCapture: jest.fn(),
}));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn(async () => {}) }));
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  Asset: { create: jest.fn(async () => ({})) },
}));

// Push notifications: no native module in Jest. Tests drive taps through
// `useLastNotificationResponse` and read the badge / permission calls.
jest.mock('expo-notifications', () => ({
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
  AndroidImportance: { DEFAULT: 5 },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted', canAskAgain: true })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted', canAskAgain: true })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[test]' })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve(null)),
  setBadgeCountAsync: jest.fn(() => Promise.resolve(true)),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  useLastNotificationResponse: jest.fn(() => null),
  clearLastNotificationResponseAsync: jest.fn(() => Promise.resolve()),
}));
