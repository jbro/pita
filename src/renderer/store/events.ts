import type { Store } from 'jotai/vanilla/store';
import { store as defaultStore } from './index';
import {
  timelineItemsAtom,
  runStateAtom,
  steerCountAtom,
  followUpCountAtom,
  activeConfirmOverlayAtom,
  promptOverlayErrorAtom,
} from './atoms';
import type {
  SessionTimelineEvent,
  PromptOverlayEvent,
  PromptOverlayRequestEvent,
} from '../../shared/ipc';
import type { TimelineItem } from '../components/TimelinePanel';

export function handleTimelineEvent(
  event: SessionTimelineEvent,
  store: Store = defaultStore
): void {
  try {
    switch (event.type) {
      case 'state': {
        store.set(runStateAtom, event.state);
        break;
      }

      case 'response.start': {
        const current = store.get(timelineItemsAtom);
        const newItem: TimelineItem = {
          id: event.messageId,
          role: 'assistant',
          text: '',
        };
        store.set(timelineItemsAtom, [...current, newItem]);
        break;
      }

      case 'response.chunk': {
        const current = store.get(timelineItemsAtom);
        const updated = current.map((item: TimelineItem) =>
          item.id === event.messageId
            ? { ...item, text: item.text + event.chunk }
            : item
        );
        store.set(timelineItemsAtom, updated);
        break;
      }

      case 'response.end': {
        // Message already in timeline, just note completion
        break;
      }

      case 'response.abort': {
        // Option C: Append to last assistant message
        const current = store.get(timelineItemsAtom);
        // Find last assistant message by iterating backwards
        let lastAssistantIndex = -1;
        for (let i = current.length - 1; i >= 0; i--) {
          if (current[i].role === 'assistant') {
            lastAssistantIndex = i;
            break;
          }
        }
        
        if (lastAssistantIndex >= 0) {
          const updated = current.map((item: TimelineItem, index: number) =>
            index === lastAssistantIndex
              ? { ...item, text: item.text + '\n\n[aborted]' }
              : item
          );
          store.set(timelineItemsAtom, updated);
        }
        break;
      }

      case 'queue.status': {
        store.set(steerCountAtom, event.steerCount);
        store.set(followUpCountAtom, event.followUpCount);
        break;
      }

      case 'error': {
        store.set(runStateAtom, 'error');
        const current = store.get(timelineItemsAtom);
        const errorItem: TimelineItem = {
          id: `error-${Date.now()}`,
          role: 'tool',
          text: `Error: ${event.message}`,
        };
        store.set(timelineItemsAtom, [...current, errorItem]);
        break;
      }
    }
  } catch (error) {
    console.error('Failed to handle timeline event:', error);
  }
}

export function handlePromptOverlayEvent(
  event: PromptOverlayEvent,
  store: Store = defaultStore
): void {
  try {
    if (event.type === 'prompt_overlay_request' && event.kind === 'confirm') {
      store.set(activeConfirmOverlayAtom, event as PromptOverlayRequestEvent);
      store.set(promptOverlayErrorAtom, null);
    } else if (event.type === 'prompt_overlay_resolved') {
      const current = store.get(activeConfirmOverlayAtom);
      if (current?.requestId === event.requestId) {
        store.set(activeConfirmOverlayAtom, null);
      }
    }
  } catch (error) {
    console.error('Failed to handle prompt overlay event:', error);
  }
}

export function initializeEventListeners(store: Store = defaultStore): () => void {
  const sessionApi = window.pita?.session;

  if (!sessionApi) {
    console.warn('window.pita.session not available, skipping event listeners');
    return () => {};
  }

  const unsubscribeTimeline = sessionApi.onTimelineEvent((event) => {
    handleTimelineEvent(event, store);
  });

  const unsubscribeOverlay = sessionApi.onPromptOverlayEvent((event) => {
    handlePromptOverlayEvent(event, store);
  });

  return () => {
    unsubscribeTimeline();
    unsubscribeOverlay();
  };
}
