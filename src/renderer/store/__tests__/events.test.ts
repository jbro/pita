import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from 'jotai';
import {
  timelineItemsAtom,
  runStateAtom,
  steerCountAtom,
  followUpCountAtom,
  activeConfirmOverlayAtom,
} from '../atoms';
import { handleTimelineEvent, handlePromptOverlayEvent } from '../events';
import type { SessionTimelineEvent, PromptOverlayEvent } from '../../../shared/ipc';

describe('Event Handlers', () => {
  let testStore: ReturnType<typeof createStore>;

  beforeEach(() => {
    testStore = createStore();
  });

  describe('handleTimelineEvent', () => {
    it('updates runState on state event', () => {
      const event: SessionTimelineEvent = {
        type: 'state',
        state: 'running',
      };

      handleTimelineEvent(event, testStore);

      expect(testStore.get(runStateAtom)).toBe('running');
    });

    it('adds assistant message on response.start', () => {
      const event: SessionTimelineEvent = {
        type: 'response.start',
        messageId: 'msg-1',
      };

      handleTimelineEvent(event, testStore);

      const items = testStore.get(timelineItemsAtom);
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('msg-1');
      expect(items[0].role).toBe('assistant');
      expect(items[0].text).toBe('');
    });

    it('appends chunk to existing message on response.chunk', () => {
      // Setup: add initial message
      testStore.set(timelineItemsAtom, [
        { id: 'msg-1', role: 'assistant', text: 'Hello' },
      ]);

      const event: SessionTimelineEvent = {
        type: 'response.chunk',
        messageId: 'msg-1',
        chunk: ' world',
      };

      handleTimelineEvent(event, testStore);

      const items = testStore.get(timelineItemsAtom);
      expect(items[0].text).toBe('Hello world');
    });

    it('updates queue status counts', () => {
      const event: SessionTimelineEvent = {
        type: 'queue.status',
        steerCount: 2,
        followUpCount: 3,
      };

      handleTimelineEvent(event, testStore);

      expect(testStore.get(steerCountAtom)).toBe(2);
      expect(testStore.get(followUpCountAtom)).toBe(3);
    });

    it('handles response.abort by appending to message', () => {
      // Setup: add initial message
      testStore.set(timelineItemsAtom, [
        { id: 'msg-1', role: 'assistant', text: 'Partial response' },
      ]);

      const event: SessionTimelineEvent = {
        type: 'response.abort',
      };

      handleTimelineEvent(event, testStore);

      const items = testStore.get(timelineItemsAtom);
      expect(items[0].text).toBe('Partial response\n\n[aborted]');
    });

    it('handles error event with correct message property', () => {
      const event: SessionTimelineEvent = {
        type: 'error',
        message: 'test error',
      };

      handleTimelineEvent(event, testStore);

      expect(testStore.get(runStateAtom)).toBe('error');
      const items = testStore.get(timelineItemsAtom);
      expect(items).toHaveLength(1);
      expect(items[0].role).toBe('tool');
      expect(items[0].text).toContain('test error');
    });
  });

  describe('handlePromptOverlayEvent', () => {
    it('sets active overlay on prompt_overlay_request', () => {
      const event: PromptOverlayEvent = {
        type: 'prompt_overlay_request',
        requestId: 'req-1',
        kind: 'confirm',
        title: 'Test',
        message: 'Confirm?',
        confirmLabel: 'Yes',
        cancelLabel: 'No',
      };

      handlePromptOverlayEvent(event, testStore);

      const overlay = testStore.get(activeConfirmOverlayAtom);
      expect(overlay).not.toBeNull();
      expect(overlay?.requestId).toBe('req-1');
    });

    it('clears active overlay on prompt_overlay_resolved', () => {
      // Setup: set an active overlay
      testStore.set(activeConfirmOverlayAtom, {
        type: 'prompt_overlay_request',
        requestId: 'req-1',
        kind: 'confirm',
        title: 'Test',
        message: 'Confirm?',
        confirmLabel: 'Yes',
        cancelLabel: 'No',
      });

      const event: PromptOverlayEvent = {
        type: 'prompt_overlay_resolved',
        requestId: 'req-1',
        status: 'submitted',
      };

      handlePromptOverlayEvent(event, testStore);

      expect(testStore.get(activeConfirmOverlayAtom)).toBeNull();
    });
  });
});
