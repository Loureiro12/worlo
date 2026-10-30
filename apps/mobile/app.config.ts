import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Worlo',
  slug: 'worlo',
  scheme: 'worlo',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.worlo.app',
    supportsTablet: true,
  },
  android: {
    package: 'com.worlo.app',
    adaptiveIcon: {
      backgroundColor: '#EEF2FF',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    [
      'expo-localization',
      { supportedLocales: { ios: ['pt-BR', 'en', 'es'], android: ['pt-BR', 'en', 'es'] } },
    ],
  ],
});
