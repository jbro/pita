import { createStore } from 'jotai';

export const store = createStore();

// Re-export jotai hooks for convenience
export { useAtom, useAtomValue, useSetAtom } from 'jotai';
