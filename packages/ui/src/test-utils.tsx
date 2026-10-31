import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/** iPhone 14/15 metrics (base 390×844 of the handoff). */
export const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export function renderUi(ui: ReactElement) {
  return render(<SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>);
}
