import type { AttachmentRecord } from "@/lib/domain/attachments";
import { ATTACHMENT_KIND_LABEL } from "@/lib/domain/attachments";
import type { FilingRuleSet } from "@/lib/filing-rules/schema";

export default function DocumentIndexReview({
  items,
  rules,
}: {
  items: AttachmentRecord[];
  rules: FilingRuleSet;
}) {
  const live = items.filter((item) => !item.deletedAt);
  return (
    <section className="document-index">
      <h2>Document index</h2>
      <p className="applicant-hint">
        {rules.destinationLabel}. Rule {rules.id}, verified {rules.verifiedAt}.
      </p>
      <ol>
        {live.map((item, index) => (
          <li key={item.id}>
            {index + 1}. {item.storedName} — {ATTACHMENT_KIND_LABEL[item.kind]}
          </li>
        ))}
      </ol>
    </section>
  );
}
