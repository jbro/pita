import { useEffect, useRef } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

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
  const scrollRootRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);

  useEffect(() => {
    if (!scrollRootRef.current) return;

    const viewport = scrollRootRef.current.querySelector<HTMLDivElement>(
      "[data-radix-scroll-area-viewport]"
    );
    if (!viewport) return;

    viewportRef.current = viewport;

    const updateStickiness = (): void => {
      const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      shouldStickToBottomRef.current = distanceFromBottom < 24;
    };

    updateStickiness();
    viewport.addEventListener("scroll", updateStickiness);

    return () => {
      viewport.removeEventListener("scroll", updateStickiness);
      viewportRef.current = null;
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !shouldStickToBottomRef.current) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [items]);

  return (
    <ScrollArea
      ref={scrollRootRef}
      className="mx-auto h-full w-[65%] px-12 pb-32 pt-6"
      data-testid="timeline-panel"
      aria-label="Timeline panel"
    >
      <ul className="grid list-none gap-3 p-0">
        {items.map((item) => {
          const roleLabel = item.label ?? item.role;
          const cardTone =
            item.role === "user"
              ? "border-primary/40 bg-primary/5"
              : item.role === "tool"
                ? "border-secondary bg-secondary/20"
                : "border-border bg-card";

          return (
            <li key={item.id}>
              <Card className={cardTone}>
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                    {roleLabel}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <span className={item.emphasized ? "italic timeline-command-text" : undefined}>
                    {item.text}
                  </span>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </ScrollArea>
  );
}
