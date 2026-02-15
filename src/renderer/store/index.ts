import { createStore } from 'jotai';

export const store = createStore();

// Re-export jotai hooks for convenience
export { useAtom, useAtomValue, useSetAtom } from 'jotai';

// Re-export atoms
export * from './atoms';

// Re-export actions
export * from './actions';

// Re-export event handlers
export { initializeEventListeners } from './events';
