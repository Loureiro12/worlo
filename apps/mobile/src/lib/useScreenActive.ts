import * as Router from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

// Component tests replace expo-router with a partial mock (no navigator):
// there the screen counts as focused.
const useFocused: () => boolean =
  typeof Router.useIsFocused === 'function' ? Router.useIsFocused : () => true;

/**
 * True while this screen is the one on display and the app is in the
 * foreground. Tab screens stay mounted when another tab or a pushed screen is
 * on top, so anything that animates (the globe) must stop when this is false.
 */
export function useScreenActive(): boolean {
  const focused = useFocused();
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) =>
      setForeground(state === 'active'),
    );
    return () => subscription.remove();
  }, []);
  return focused && foreground;
}
