import type { DeadlineResult } from "./calculate";
import type { DeadlineRecord } from "@/lib/domain/case";

export function deadlineSourceLabel(source: DeadlineResult["confidence"] | DeadlineRecord["source"]): string {
  if (source === "connector-confirmed" || source === "OFFICIAL_CONNECTOR") {
    return "Connector-confirmed dates";
  }
  if (source === "user-reported" || source === "USER_REPORTED") {
    return "You recorded these dates";
  }
  return "Praja calculation";
}

export function formatDeadlineDay(iso: string): string {
  const date = new Date(iso.slice(0, 10) + "T00:00:00Z");
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}
