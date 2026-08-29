import Link from "@/components/SiteLink";
import type { CaseSummary } from "@/lib/domain/case";
import { CASE_TYPE_LABEL } from "@/lib/domain/status";
import { casePath } from "@/lib/storage/paths";

export default function CaseChain({
  currentId,
  chain,
}: {
  currentId: string;
  chain: CaseSummary[];
}) {
  if (chain.length <= 1) return null;
  return (
    <nav className="case-chain" aria-label="Linked cases">
      <ol>
        {chain.map((item) => (
          <li key={item.id} className={item.id === currentId ? "is-current" : ""}>
            {item.id === currentId ? (
              <span>
                {CASE_TYPE_LABEL[item.caseType]} · {item.prajaReference}
              </span>
            ) : (
              <Link href={casePath(item.id)}>
                {CASE_TYPE_LABEL[item.caseType]} · {item.prajaReference}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
