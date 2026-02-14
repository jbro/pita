import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { SessionRunState, SessionTimelineEvent } from "../../shared/ipc";
import type { TimelineItem } from "../components/TimelinePanel";

interface UseSessionTimelineResult {
  items: TimelineItem[];
  runState: SessionRunState;
}

const initialItems: TimelineItem[] = [];

export function useSessionTimeline(): UseSessionTimelineResult {
  const [items, setItems] = useState<TimelineItem[]>(initialItems);
  const [runState, setRunState] = useState<SessionRunState>("idle");

  useEffect(() => {
    const sessionApi = window.pita?.session;

    if (!sessionApi) {
      return;
    }

    const unsubscribe = sessionApi.onTimelineEvent((event) => {
      applyTimelineEvent(event, setItems, setRunState);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { items, runState };
}

function applyTimelineEvent(
  event: SessionTimelineEvent,
  setItems: Dispatch<SetStateAction<TimelineItem[]>>,
  setRunState: Dispatch<SetStateAction<SessionRunState>>
): void {
  switch (event.type) {
    case "state": {
      setRunState(event.state);
      return;
    }
    case "response.start": {
      setItems((previous) => [...previous, { id: event.messageId, role: "assistant", text: "" }]);
      return;
    }
    case "response.chunk": {
      setItems((previous) =>
        previous.map((item) => {
          if (item.id !== event.messageId) {
            return item;
          }

          return {
            ...item,
            text: `${item.text}${event.chunk}`
          };
        })
      );
      return;
    }
    case "response.end": {
      return;
    }
    case "response.abort": {
      setItems((previous) => [...previous, { id: `abort-${Date.now()}`, role: "tool", text: "aborted" }]);
      return;
    }
    case "error": {
      setItems((previous) => [
        ...previous,
        { id: `error-${Date.now()}`, role: "tool", text: event.message }
      ]);
      return;
    }
  }
}
