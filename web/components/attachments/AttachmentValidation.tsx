import type { RuleProblem } from "@/lib/filing-rules/validate";

export default function AttachmentValidation({ problems }: { problems: RuleProblem[] }) {
  if (problems.length === 0) return null;
  return (
    <ul className="attachment-problems">
      {problems.map((problem) => (
        <li key={problem.code} className={problem.blocking ? "is-blocking" : ""}>
          {problem.message}
        </li>
      ))}
    </ul>
  );
}
