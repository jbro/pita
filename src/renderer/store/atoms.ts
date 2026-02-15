import { atom } from 'jotai';
import type { SessionRunState } from '../../shared/ipc';
import type { TimelineItem } from '../components/TimelinePanel';
import type { PromptOverlayRequestEvent } from '../../shared/ipc';

// Timeline domain
export const timelineItemsAtom = atom<TimelineItem[]>([]);
export const runStateAtom = atom<SessionRunState>('idle');
export const steerCountAtom = atom(0);
export const followUpCountAtom = atom(0);

// Prompt domain
export const promptTextAtom = atom('');
export const promptOverlayErrorAtom = atom<string | null>(null);
export const activeConfirmOverlayAtom = atom<PromptOverlayRequestEvent | null>(null);

// Palette domain
export const paletteOpenAtom = atom(false);
export const paletteSearchQueryAtom = atom('');
export const paletteSelectedIndexAtom = atom(0);
