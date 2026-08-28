import type { CaseRecord } from "@/lib/domain/case";
import { reminderIdempotencyKey, remindersForCase, type Reminder } from "./reminders";
import { addDays } from "@/lib/deadlines/calculate";
import { isCaseId } from "@/lib/storage/id";

export type NotificationStatus = "PENDING" | "FALLBACK_ONLY" | "SENT" | "CANCELLED";

export interface OutboxNotification {
  id: string;
  caseId: string;
  deadlineId: string | null;
  channel: "in-app" | "email" | "sms";
  template: Reminder["template"];
  title: string;
  body: string;
  scheduledAt: string;
  sentAt: string | null;
  status: NotificationStatus;
  idempotencyKey: string;
}

export function scheduleNotifications(record: CaseRecord, now = new Date().toISOString()): OutboxNotification[] {
  if (!record.remindersEnabled) return [];
  const prefs = record.reminderPreferences ?? { inApp: true, email: false, sms: false };
  const rows: OutboxNotification[] = [];
  for (const reminder of remindersForCase(record, now)) {
    const channels: Array<OutboxNotification["channel"]> = [];
    if (prefs.inApp) channels.push("in-app");
    if (prefs.email) channels.push("email");
    if (prefs.sms) channels.push("sms");
    const scheduledAt = reminder.dueAt
      ? `${addDays(reminder.dueAt.slice(0, 10), -7)}T09:00:00.000Z`
      : now;
    for (const channel of channels) {
      const idempotencyKey = `${reminderIdempotencyKey(reminder)}:${channel}`;
      rows.push({
        id: `${idempotencyKey}`,
        caseId: record.id,
        deadlineId: (() => {
          const maybe = reminder.id.split(":")[1];
          return maybe && isCaseId(maybe) ? maybe : null;
        })(),
        channel,
        template: reminder.template,
        title: reminder.title,
        body: reminder.body,
        scheduledAt,
        sentAt: null,
        status: channel === "in-app" ? "FALLBACK_ONLY" : "PENDING",
        idempotencyKey,
      });
    }
  }
  return rows;
}

export function fallbackPreview(rows: OutboxNotification[]): OutboxNotification[] {
  return rows.map((row) => ({
    ...row,
    status: row.channel === "in-app" ? "FALLBACK_ONLY" : row.status === "SENT" ? "SENT" : "FALLBACK_ONLY",
    body: `${row.body} Delivery is a sandbox preview until a mail or SMS provider is configured.`,
  }));
}
