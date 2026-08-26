import Link from "next/link";
import type { ReactNode } from "react";
import AccessibilityControls from "@/components/AccessibilityControls";
import Emblem from "@/components/Emblem";

interface SiteMastheadProps {
  notice: ReactNode;
  links?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
  truth: ReactNode;
}

export default function SiteMasthead({
  notice,
  links,
  children,
  compact = false,
  truth,
}: SiteMastheadProps) {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>

      <div className="tricolour" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="utility-bar">
        <div className="site-container utility-inner">
          <span className="utility-notice">{notice}</span>
          <div className="utility-end">
            {links ? <div className="utility-links">{links}</div> : null}
            <AccessibilityControls />
          </div>
        </div>
      </div>

      <header className="civic-header">
        <div className={`site-container header-inner${compact ? " header-inner-compact" : ""}`}>
          <Link className="brand" href="/" aria-label="Praja RTI home">
            <Emblem
              className="brand-emblem"
              height={compact ? 64 : 78}
              width={compact ? 38 : 47}
            />
            <span className="brand-rule" aria-hidden="true" />
            <span>
              <strong>Praja RTI</strong>
              <small lang="hi">प्रजा आरटीआई</small>
            </span>
            <span className="brand-context">Independent<br />Citizen Assistance</span>
          </Link>
          {children}
        </div>
      </header>

      <div className="truth-strip">
        <div className="site-container">{truth}</div>
      </div>
    </>
  );
}
