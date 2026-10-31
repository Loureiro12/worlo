import {
  BricolageGrotesque_500Medium,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { fontFamily } from './typography';

/** Pass to `useFonts(fontAssets)` before rendering any screen. */
export const fontAssets = {
  [fontFamily.title500]: BricolageGrotesque_500Medium,
  [fontFamily.title700]: BricolageGrotesque_700Bold,
  [fontFamily.title800]: BricolageGrotesque_800ExtraBold,
  [fontFamily.ui400]: PlusJakartaSans_400Regular,
  [fontFamily.ui500]: PlusJakartaSans_500Medium,
  [fontFamily.ui600]: PlusJakartaSans_600SemiBold,
  [fontFamily.ui700]: PlusJakartaSans_700Bold,
  [fontFamily.ui800]: PlusJakartaSans_800ExtraBold,
};
