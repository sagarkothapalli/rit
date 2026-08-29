"use client";

import Link from "@/components/SiteLink";

const OPTIONS = [
  {
    href: "/cases/new/request",
    title: "New RTI request",
    body: "Ask a public authority for records that already exist on an official file.",
  },
  {
    href: "/cases/new/first-appeal",
    title: "First appeal",
    body: "Challenge no response, or an unsatisfactory CPIO or SPIO decision, under Section 19(1).",
  },
  {
    href: "/cases/new/second-appeal",
    title: "Second appeal",
    body: "Take a first-appeal outcome, or silence, to the CIC or the applicable SIC under Section 19(3).",
  },
  {
    href: "/cases/new/complaint",
    title: "Section 18 complaint",
    body: "Complain to the Commission on a Section 18 ground. This is not the original grievance.",
  },
];

export default function CaseTypeChooser() {
  return (
    <article className="workspace-panel">
      <div className="step-body">
        <h1>Start an RTI case.</h1>
        <p className="step-lede">
          Choose the case you need. A request, an appeal, and a complaint are different things, and they travel
          to different desks.
        </p>
        <ul className="case-type-list">
          {OPTIONS.map((option) => (
            <li key={option.href}>
              <Link href={option.href}>
                <strong>{option.title}</strong>
                <span>{option.body}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="step-hint">
          Praja prepares the filing packet. You file it on the official portal or the correct State channel.
        </p>
      </div>
    </article>
  );
}
