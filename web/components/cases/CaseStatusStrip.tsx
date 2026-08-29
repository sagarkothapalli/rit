import type { CaseRecord } from "@/lib/domain/case";
import { isOfficiallyFiled } from "@/lib/domain/status";

type StepState = "complete" | "current" | "upcoming" | "attention";

interface StatusStep {
  label: string;
  value: string;
  state: StepState;
}

function statusCopy(record: CaseRecord) {
  const filed = isOfficiallyFiled(record.filingStatus);

  if (record.filingStatus === "RETURNED") {
    return {
      title: "Your filing needs attention.",
      detail: "The application was returned. Review the latest update before continuing.",
    };
  }

  if (record.outcomeStatus === "ACTION_REQUIRED") {
    return {
      title: "The authority needs more information.",
      detail: "A response has been recorded. Review it and complete the requested action.",
    };
  }

  if (record.outcomeStatus === "REPLY_RECEIVED") {
    return {
      title: "A response has been received.",
      detail: `The reply from ${record.authorityName} is ready to review.`,
    };
  }

  if (record.outcomeStatus === "DISPOSED" || record.outcomeStatus === "CLOSED") {
    return {
      title: "The application review is complete.",
      detail: `This application with ${record.authorityName} has reached its recorded outcome.`,
    };
  }

  if (filed) {
    return {
      title: "Filing complete. Waiting for review.",
      detail: `Your filing is recorded with ${record.authorityName}. You are now waiting for the authority's review and response.`,
    };
  }

  if (record.filingStatus === "EXTERNAL_FILING_IN_PROGRESS") {
    return {
      title: "Filing is in progress.",
      detail: "Add the filing confirmation when you receive it to start response tracking.",
    };
  }

  if (record.preparationStatus === "PACKET_GENERATED") {
    return {
      title: "Your application is ready for filing.",
      detail: "The generated application and acknowledgement are ready below.",
    };
  }

  if (record.preparationStatus === "READY_FOR_REVIEW" || record.preparationStatus === "READY_TO_FILE") {
    return {
      title: "Your application is ready for review.",
      detail: "Check the application details before completing the filing.",
    };
  }

  return {
    title: "Your application is in progress.",
    detail: "Complete the remaining details to generate the application documents.",
  };
}

function statusSteps(record: CaseRecord): StatusStep[] {
  const applicationReady =
    record.preparationStatus === "PACKET_GENERATED" || isOfficiallyFiled(record.filingStatus);
  const filed = isOfficiallyFiled(record.filingStatus);
  const responseRecorded =
    record.outcomeStatus === "ACTION_REQUIRED" ||
    record.outcomeStatus === "REPLY_RECEIVED" ||
    record.outcomeStatus === "DISPOSED" ||
    record.outcomeStatus === "CLOSED";
  const reviewFinished =
    record.outcomeStatus === "REPLY_RECEIVED" ||
    record.outcomeStatus === "DISPOSED" ||
    record.outcomeStatus === "CLOSED";

  return [
    {
      label: "Application",
      value: applicationReady ? "Generated" : "In progress",
      state: applicationReady ? "complete" : "current",
    },
    {
      label: "Filing",
      value: filed
        ? "Filed"
        : record.filingStatus === "RETURNED"
          ? "Needs attention"
          : record.filingStatus === "EXTERNAL_FILING_IN_PROGRESS"
            ? "In progress"
            : applicationReady
              ? "Ready next"
              : "Waiting",
      state: filed
        ? "complete"
        : record.filingStatus === "RETURNED"
          ? "attention"
          : applicationReady
            ? "current"
            : "upcoming",
    },
    {
      label: "Review",
      value: reviewFinished
        ? "Complete"
        : filed && !responseRecorded
          ? "Under review"
          : "Waiting",
      state: reviewFinished ? "complete" : filed && !responseRecorded ? "current" : "upcoming",
    },
    {
      label: "Response",
      value:
        record.outcomeStatus === "ACTION_REQUIRED"
          ? "Action needed"
          : responseRecorded
            ? "Received"
            : "Waiting",
      state:
        record.outcomeStatus === "ACTION_REQUIRED"
          ? "attention"
          : responseRecorded
            ? record.outcomeStatus === "DISPOSED" || record.outcomeStatus === "CLOSED"
              ? "complete"
              : "current"
            : "upcoming",
    },
  ];
}

function StepMarker({ index, state }: { index: number; state: StepState }) {
  if (state === "complete") {
    return (
      <span className="application-status-marker" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none">
          <path
            d="m5.25 10.35 3.05 3.05 6.45-6.8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  return <span className="application-status-marker" aria-hidden="true">{index + 1}</span>;
}

export default function CaseStatusStrip({ record }: { record: CaseRecord }) {
  const copy = statusCopy(record);
  const steps = statusSteps(record);

  return (
    <section className="application-status" aria-labelledby="application-status-title">
      <div className="application-status-copy" role="status">
        <h2 id="application-status-title">Application status</h2>
        <strong>{copy.title}</strong>
        <p>{copy.detail}</p>
      </div>
      <ol className="application-status-steps" aria-label="Application progress">
        {steps.map((step, index) => (
          <li key={step.label} data-state={step.state} aria-current={step.state === "current" ? "step" : undefined}>
            <StepMarker index={index} state={step.state} />
            <span className="application-status-step-copy">
              <span>{step.label}</span>
              <strong>{step.value}</strong>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
