import type { DeadlineRecord } from "@/lib/domain/case";
import { deadlineSourceLabel, formatDeadlineDay } from "@/lib/deadlines/explain";

export default function DeadlineCard({ deadline }: { deadline: DeadlineRecord }) {
  return (
    <article className={`deadline-card is-${deadline.status.toLowerCase()}`}>
      <strong>{deadline.kind.replaceAll("_", " ")}</strong>
      <p>Due {formatDeadlineDay(deadline.dueAt)}</p>
      <p>{deadline.explanation}</p>
      <span>{deadlineSourceLabel(deadline.source)}</span>
    </article>
  );
}
