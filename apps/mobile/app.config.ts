import type { ConfigContext, ExpoConfig } from 'expo/config';

// Brand colours (Identidade Visual v1); app.config can't import @worlo/ui.
const carvao = '#131311';

// Google Sign-In needs the reversed iOS OAuth client id as a URL scheme. Until
// the Google Cloud clients exist the plugin is left out and the button hidden.
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const googleSignIn: [string, { iosUrlScheme: string }][] = googleIosClientId
  ? [
      [
        '@react-native-google-signin/google-signin',
        { iosUrlScheme: googleIosClientId.split('.').reverse().join('.') },
      ],
    ]
  : [];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Worlo',
  slug: 'worlo',
  scheme: 'worlo',
  // User-facing version. Build numbers are managed remotely by EAS (eas.json).
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  // The theme is light-only; keeps native UI (keyboard, alerts) light in dark mode.
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'com.worlo.app',
    // Phone-only layouts: avoids iPad screenshots and iPad review.
    supportsTablet: false,
    usesAppleSignIn: true,
    config: {
      // Only standard HTTPS: skips the export-compliance question on every upload.
      usesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.worlo.app',
    adaptiveIcon: {
      backgroundColor: carvao,
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    // Added by dependencies but unused; each one needs a justification on Play Console.
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    [
      'expo-splash-screen',
      // Matches the first frame of the animated JS splash (carvão + pin).
      { backgroundColor: carvao, image: './assets/splash-icon.png', imageWidth: 120 },
    ],
    [
      'expo-localization',
      { supportedLocales: { ios: ['pt-BR', 'en', 'es'], android: ['pt-BR', 'en', 'es'] } },
    ],
    'expo-apple-authentication',
    [
      'expo-image-picker',
      {
        // Shown by iOS when asking for access (pt-BR: the app's main market).
        photosPermission:
          'O Worlo usa suas fotos pra guardar as memórias de cada viagem e dividir com quem viajou com você.',
        cameraPermission: 'O Worlo usa a câmera pra registrar momentos no modo viagem.',
        microphonePermission: false,
      },
    ],
    ...googleSignIn,
  ],
  owner: 'loureiro_12',
  extra: {
    eas: { projectId: '61d61a67-54d4-43f0-b016-4d9e646d2eb7' },
  },
});
