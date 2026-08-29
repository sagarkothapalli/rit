"use client";

import Link from "@/components/SiteLink";
import type { FilingRuleSet } from "@/lib/filing-rules/schema";
import { casePath } from "@/lib/storage/paths";

export default function ExternalFilingHandoff({
  rules,
  bpl,
  caseId,
  stateMatter,
}: {
  rules: FilingRuleSet;
  bpl: boolean;
  caseId: string;
  stateMatter: boolean;
}) {
  const fee = bpl && rules.fee.bplExempt ? "Nil" : rules.fee.amountRupees === 0 ? "Nil" : `Rs ${rules.fee.amountRupees}`;
  return (
    <section className="handoff-card" aria-labelledby="handoff-title">
      <h2 id="handoff-title">File it on the official channel</h2>
      <p>
        This workspace has prepared the packet. Payment, if any, is collected only on the official destination.
        Opening the portal does not mean the request has been filed.
      </p>
      <dl className="handoff-facts">
        <div>
          <dt>Fee</dt>
          <dd>{fee}</dd>
        </div>
        <div>
          <dt>Pay on</dt>
          <dd>{rules.fee.payableOn}</dd>
        </div>
        <div>
          <dt>Destination</dt>
          <dd>{rules.destinationLabel}</dd>
        </div>
        <div>
          <dt>Rule verified</dt>
          <dd>
            {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(rules.verifiedAt))}
          </dd>
        </div>
      </dl>
      {stateMatter && (
        <p className="step-hint">
          This is a State or local-body matter. The Central RTI Online portal cannot accept it, and it will not
          refund a fee paid there.
        </p>
      )}
      <p className="handoff-source">
        Source:{" "}
        <a href={rules.sourceUrl} rel="noreferrer" target="_blank">
          official filing guidance
        </a>
        {rules.guidanceOnly ? " · guidance only — confirm the State channel before you file" : ""}
      </p>
      <div className="step-actions">
        {rules.portalUrl && !stateMatter ? (
          <a className="primary-button" href={rules.portalUrl} rel="noreferrer" target="_blank">
            Open the official portal
          </a>
        ) : (
          <span className="step-hint" style={{ margin: 0 }}>
            Use the State or physical channel named above. There is no Central-portal submission for this packet.
          </span>
        )}
        <Link className="secondary-button" href={casePath(caseId, "record-filing")}>
          I have filed this
        </Link>
        <Link className="ghost-button" href={casePath(caseId)}>
          I will file later
        </Link>
      </div>
    </section>
  );
}
