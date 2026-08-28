import type { VerificationSource } from "@/lib/domain/status";

export default function FilingSourceBadge({ source }: { source: VerificationSource }) {
  const label =
    source === "OFFICIAL_CONNECTOR"
      ? "Connector-confirmed"
      : source === "USER_REPORTED"
        ? "You recorded this"
        : "Praja record";
  return <span className={`filing-source is-${source.toLowerCase()}`}>{label}</span>;
}
