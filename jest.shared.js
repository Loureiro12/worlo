// Shared by the React Native Jest projects (packages/ui, apps/mobile).
// jest-expo's default list + ESM/TSX-only packages used by the design system.
const transpiled = [
  '.pnpm',
  'react-native',
  '@react-native',
  '@react-native-community',
  'expo',
  '@expo',
  '@expo-google-fonts',
  'react-navigation',
  '@react-navigation',
  '@sentry/react-native',
  'native-base',
  'standard-navigation',
  'phosphor-react-native',
  'd3-[a-z]+',
  'internmap',
  'topojson-client',
];

const path = require('node:path');

const phosphorIcons = path.join(__dirname, 'node_modules/phosphor-react-native', 'src/icons');

module.exports = {
  // tsconfig maps these imports to .d.ts files for type-checking only; jest-expo
  // copies tsconfig paths into moduleNameMapper, so point runtime back at the code.
  moduleNameMapper: {
    '^phosphor-react-native/src/icons/(.*)$': `${phosphorIcons}/$1`,
  },
  transformIgnorePatterns: [
    `/node_modules/(?!(${transpiled.join('|')}))`,
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
};
