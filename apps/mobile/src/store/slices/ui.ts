import type { Slice } from '../types';

/** Demo states from the prototype "Tweaks" panel (04_INTERACTIONS → Estados). */
export type DemoState = 'normal' | 'empty' | 'loading' | 'offline' | 'error';

export type UiSlice = {
  demo: DemoState;
  setDemo: (demo: DemoState) => void;
};

export const createUiSlice: Slice<UiSlice> = (set) => ({
  demo: 'normal',
  setDemo: (demo) => set({ demo }),
});
