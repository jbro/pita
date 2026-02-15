import type { Store } from 'jotai/vanilla/store';
import { store as defaultStore } from './index';
import {
  timelineItemsAtom,
  runStateAtom,
  steerCountAtom,
  followUpCountAtom,
  promptTextAtom,
  promptOverlayErrorAtom,
  activeConfirmOverlayAtom,
  paletteOpenAtom,
  paletteSearchQueryAtom,
  paletteSelectedIndexAtom,
} from './atoms';
import type { TimelineItem } from '../components/TimelinePanel';
import type { PromptOverlayRequestEvent, SessionRunState } from '../../shared/ipc';

// Timeline actions

export function addUserMessage(text: string, store: Store = defaultStore): void {
  const current = store.get(timelineItemsAtom);
  const newItem: TimelineItem = {
    id: `user-${Date.now()}`,
    role: 'user',
    text,
  };
  store.set(timelineItemsAtom, [...current, newItem]);
}

export function addSteerMessage(text: string, store: Store = defaultStore): void {
  const current = store.get(timelineItemsAtom);
  const newItem: TimelineItem = {
    id: `steer-${Date.now()}`,
    role: 'user',
    label: 'steer',
    text,
    emphasized: true,
  };
  store.set(timelineItemsAtom, [...current, newItem]);
}

export function addFollowUpMessage(text: string, store: Store = defaultStore): void {
  const current = store.get(timelineItemsAtom);
  const newItem: TimelineItem = {
    id: `followup-${Date.now()}`,
    role: 'user',
    label: 'follow-up',
    text,
    emphasized: true,
  };
  store.set(timelineItemsAtom, [...current, newItem]);
}

export function clearTimeline(store: Store = defaultStore): void {
  store.set(timelineItemsAtom, []);
}
