import { useEffect, useRef } from "react";

export interface TimelineItem {
  id: string;
  role: "user" | "assistant" | "tool";
  text: string;
  label?: string;
  emphasized?: boolean;
}

interface TimelinePanelProps {
  items: TimelineItem[];
}

export function TimelinePanel({ items }: TimelinePanelProps): JSX.Element {
  const containerRef = useRef<HTMLElement | null>(null);
  const shouldStickToBottomRef = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateStickiness = (): void => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      shouldStickToBottomRef.current = distanceFromBottom < 24;
    };

    updateStickiness();
    container.addEventListener("scroll", updateStickiness);

    return () => {
      container.removeEventListener("scroll", updateStickiness);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !shouldStickToBottomRef.current) return;
    container.scrollTop = container.scrollHeight;
  }, [items]);

  return (
    <section
      ref={containerRef}
      className="timeline-background"
      data-testid="timeline-panel"
      aria-label="Timeline panel"
    >
      <ul className="timeline-list">
        {items.map((item) => (
          <li key={item.id} className="timeline-item">
            <span className={`timeline-role timeline-role-${item.role}`}>
              {item.label ?? item.role}
            </span>
            <span className={item.emphasized ? "timeline-command-text" : undefined}>{item.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
