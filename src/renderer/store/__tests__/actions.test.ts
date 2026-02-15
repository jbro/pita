import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from 'jotai';
import {
  timelineItemsAtom,
  runStateAtom,
  steerCountAtom,
  followUpCountAtom,
} from '../atoms';
import {
  addUserMessage,
  addSteerMessage,
  addFollowUpMessage,
  clearTimeline,
} from '../actions';

describe('Timeline Actions', () => {
  let testStore: ReturnType<typeof createStore>;

  beforeEach(() => {
    testStore = createStore();
  });

  it('addUserMessage adds user message to timeline', () => {
    addUserMessage('hello', testStore);

    const items = testStore.get(timelineItemsAtom);
    expect(items).toHaveLength(1);
    expect(items[0].role).toBe('user');
    expect(items[0].text).toBe('hello');
  });

  it('addSteerMessage adds emphasized steer message', () => {
    addSteerMessage('steer this', testStore);

    const items = testStore.get(timelineItemsAtom);
    expect(items).toHaveLength(1);
    expect(items[0].role).toBe('user');
    expect(items[0].label).toBe('steer');
    expect(items[0].emphasized).toBe(true);
  });

  it('addFollowUpMessage adds follow-up message', () => {
    addFollowUpMessage('follow up', testStore);

    const items = testStore.get(timelineItemsAtom);
    expect(items).toHaveLength(1);
    expect(items[0].role).toBe('user');
    expect(items[0].label).toBe('follow-up');
  });

  it('clearTimeline removes all items', () => {
    addUserMessage('test', testStore);
    expect(testStore.get(timelineItemsAtom)).toHaveLength(1);

    clearTimeline(testStore);

    expect(testStore.get(timelineItemsAtom)).toHaveLength(0);
  });
});
