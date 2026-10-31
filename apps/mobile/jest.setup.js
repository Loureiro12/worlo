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

// The real hook waits for native font loading; screens only need "loaded".
jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  useFonts: () => [true, null],
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(() => Promise.resolve(true)),
  getStringAsync: jest.fn(() => Promise.resolve('')),
}));
