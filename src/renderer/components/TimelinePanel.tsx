export interface TimelineItem {
  id: string;
  role: "user" | "assistant" | "tool";
  text: string;
}

interface TimelinePanelProps {
  items: TimelineItem[];
}

export function TimelinePanel({ items }: TimelinePanelProps): JSX.Element {
  return (
    <section className="panel" data-testid="timeline-panel" aria-label="Timeline panel">
      <h2>Timeline</h2>
      <ul className="timeline-list">
        {items.map((item) => (
          <li key={item.id} className="timeline-item">
            <span className={`timeline-role timeline-role-${item.role}`}>{item.role}</span>
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
