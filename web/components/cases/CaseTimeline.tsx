import type { CaseRecord } from "@/lib/domain/case";
import { EVENT_LABEL } from "@/lib/domain/events";
import FilingSourceBadge from "./FilingSourceBadge";

export default function CaseTimeline({ record }: { record: CaseRecord }) {
  const events = [...record.events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  if (events.length === 0) return <p className="step-hint">No events recorded yet.</p>;
  return (
    <ol className="case-timeline">
      {events.map((event) => (
        <li key={event.id}>
          <strong>{EVENT_LABEL[event.eventType] ?? event.eventType}</strong>
          <span>
            {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(event.occurredAt))}
          </span>
          <FilingSourceBadge source={event.source} />
        </li>
      ))}
    </ol>
  );
}
