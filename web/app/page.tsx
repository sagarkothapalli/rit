import Image from "next/image";
import Link from "next/link";
import HeroDraftActions from "@/components/HeroDraftActions";

const serviceSteps = [
  {
    title: "Tell us what happened",
    body: "Speak or type in the language that feels natural. Your transcript stays visible and editable.",
  },
  {
    title: "Confirm the facts",
    body: "Review the place, period, records sought, and anything clearly visible in an attached photo.",
  },
  {
    title: "Review the draft",
    body: "Your concern becomes a neutral request for existing records, written as clear numbered points.",
  },
  {
    title: "Choose an authority",
    body: "Compare three explained Central public authority suggestions and make the final choice yourself.",
  },
  {
    title: "Save your application",
    body: "Copy or download the prepared request so you can review it again before filing.",
  },
  {
    title: "Use the official portal",
    body: "When you are ready, continue through RTI Online to complete the official filing process.",
  },
];

const draftRequests = [
  "Certified copy of the work order and sanctioned budget for Road 12, Sector 4.",
  "Contractor details, scheduled completion date, and delay clauses recorded for the work.",
  "Copies of quality inspection reports submitted for the road work.",
];

function ArrowIcon({ direction = "right" }: { direction?: "right" | "down" }) {
  return (
    <svg
      aria-hidden="true"
      className={direction === "down" ? "rotate-90" : ""}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path d="M5 12h14M14 7l5 5l-5 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <rect height="10" rx="4" stroke="currentColor" strokeWidth="1.7" width="7" x="8.5" y="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M7 2.75h7l4 4V21.25H7z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
      <path d="M14 2.75v4h4M9.5 11h6M9.5 14.5h6M9.5 18h4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M12 2.75c2.3 1.6 4.9 2.45 7.25 2.7v5.4c0 4.6-2.8 8.35-7.25 10.4c-4.45-2.05-7.25-5.8-7.25-10.4v-5.4C7.1 5.2 9.7 4.35 12 2.75Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" />
      <path d="m8.8 12l2.1 2.1l4.4-4.6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

function StepIcon({ index }: { index: number }) {
  const common = { stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 1.6 };
  if (index === 0) return <MicIcon />;
  if (index === 1) {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path d="M8 6h11M8 12h11M8 18h11M3.5 6l1.2 1.2L6.8 5M3.5 12l1.2 1.2l2.1-2.2M3.5 18l1.2 1.2l2.1-2.2" {...common} />
      </svg>
    );
  }
  if (index === 2) return <DocumentIcon />;
  if (index === 3) {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path d="M3 9h18M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 19.5h18M12 3l9 4H3z" {...common} />
      </svg>
    );
  }
  if (index === 4) {
    return (
      <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
        <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 20h14" {...common} />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" {...common} />
      <path d="M3.5 12h17M12 3c2.3 2.5 3.4 5.5 3.4 9S14.3 18.5 12 21M12 3C9.7 5.5 8.6 8.5 8.6 12s1.1 6.5 3.4 9" {...common} />
    </svg>
  );
}

export default function Page() {
  return (
    <main className="site-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>

      <div className="tricolour" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="utility-bar">
        <div className="site-container utility-inner">
          <span>Independent citizen assistance for RTI</span>
          <div className="utility-links" aria-label="Utility links">
            <a href="#accessibility">Accessibility</a>
            <a href="https://rtionline.gov.in/" rel="noreferrer" target="_blank">Official RTI portal</a>
          </div>
        </div>
      </div>

      <header className="civic-header">
        <div className="site-container header-inner">
          <Link className="brand" href="/" aria-label="Praja RTI home">
            <Image
              alt="State Emblem of India"
              className="brand-emblem"
              height={72}
              priority
              src="/india-emblem-white.png"
              width={50}
            />
            <span className="brand-rule" aria-hidden="true" />
            <span>
              <strong>Praja RTI</strong>
              <small lang="hi">प्रजा आरटीआई</small>
            </span>
            <span className="brand-context">Independent<br />Citizen Assistance</span>
          </Link>

          <nav className="primary-nav" aria-label="Primary navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#rti-lifecycle">RTI lifecycle</a>
            <a href="#safeguards">Safeguards</a>
          </nav>

          <Link className="header-action header-start-action" href="/request">Start drafting</Link>
        </div>
      </header>

      <div className="truth-strip">
        <div className="site-container">
          <strong>Important:</strong> Praja RTI is independent citizen assistance. It is not a government portal and does not file an application on your behalf.
        </div>
      </div>

      <section className="hero site-container" id="main-content">
        <div className="hero-copy">
          <h1>Speak naturally. Leave with a clear RTI request.</h1>
          <p>
            Turn a spoken concern into a focused request for records. Review every word, compare explained Central authority suggestions, and decide what to take forward.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" href="/request">
              <MicIcon />
              Start your request
            </Link>
            <a className="text-link" href="#how-it-works">See the full process</a>
          </div>
          <dl className="hero-assurances">
            <div>
              <dt>Language</dt>
              <dd>English, हिन्दी, and Hinglish</dd>
            </div>
            <div>
              <dt>Control</dt>
              <dd>You confirm every consequential choice</dd>
            </div>
          </dl>
        </div>

        <div className="transformation" aria-label="Example of a spoken concern becoming an RTI records request">
          <div className="transform-toolbar">
            <span>Draft workspace</span>
            <span className="workspace-status"><i aria-hidden="true" /> Ready for review</span>
          </div>
          <div className="transform-grid">
            <section className="transcript-panel">
              <div className="panel-heading">
                <span className="panel-icon"><MicIcon /></span>
                <span>
                  <small>Your words</small>
                  <strong>Editable transcript</strong>
                </span>
              </div>
              <div className="voice-line" aria-hidden="true">
                {[10, 22, 15, 28, 18, 31, 24, 12, 26, 17, 9, 21, 13, 7].map((height, index) => (
                  <i key={index} style={{ height }} />
                ))}
              </div>
              <blockquote>
                The road outside my house in Sector 4 has been broken for months. I want to know what work was approved and whether it was inspected.
              </blockquote>
              <div className="transcript-meta">
                <span>English with Hinglish supported</span>
                <span>Text remains editable</span>
              </div>
            </section>

            <div className="transform-arrow" aria-hidden="true"><ArrowIcon /></div>

            <section className="draft-panel">
              <div className="panel-heading">
                <span className="panel-icon"><DocumentIcon /></span>
                <span>
                  <small>Prepared output</small>
                  <strong>Records focused request</strong>
                </span>
              </div>
              <ol className="request-list">
                {draftRequests.map((request) => <li key={request}>{request}</li>)}
              </ol>
              <HeroDraftActions />
              <div className="draft-footer">
                <span><ShieldIcon /> Facts kept neutral</span>
                <span>3 request points</span>
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="service-principles reveal reveal-wipe" aria-labelledby="principles-title">
        <div className="site-container principles-grid">
          <h2 id="principles-title">Built around citizen control</h2>
          <div>
            <strong>Records, not accusations</strong>
            <p>Your concern is rewritten as a request for existing files, orders, budgets, registers, or reports.</p>
          </div>
          <div>
            <strong>Reasons, not silent routing</strong>
            <p>Each suggested Central authority comes with a reason and an uncertainty note.</p>
          </div>
          <div>
            <strong>Review before action</strong>
            <p>The transcript, facts, request points, and destination remain yours to correct.</p>
          </div>
        </div>
      </section>

      <section className="process-section site-container reveal reveal-rise" id="how-it-works">
        <div className="section-intro">
          <h2>A clear path from concern to application</h2>
          <p>One decision at a time, with the citizen in control throughout.</p>
        </div>
        <ol className="service-path">
          {serviceSteps.map((step, index) => (
            <li key={step.title}>
              <span className="step-icon"><StepIcon index={index} /></span>
              <div>
                <span className="step-index">Step {index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="lifecycle-section reveal reveal-fade" id="rti-lifecycle">
        <div className="site-container">
          <div className="section-intro lifecycle-intro">
            <div>
              <h2>Understand the official RTI lifecycle</h2>
              <p>This simplified view follows the lifecycle published by RTI Online and keeps the main reply, transfer, appeal, and complaint branches readable.</p>
            </div>
            <a href="https://rtionline.gov.in/images/rti_lifecycle.jpg" rel="noreferrer" target="_blank">
              View the original flowchart
              <ArrowIcon />
            </a>
          </div>

          <div className="lifecycle-flow" aria-label="RTI lifecycle adapted from RTI Online">
            <div className="life-node life-start">
              <small>Application</small>
              <strong>RTI request submitted</strong>
            </div>

            <div className="life-branches">
              <article>
                <span className="time-chip">30 days</span>
                <h3>Reply received</h3>
                <p>If the response is complete, the process can close. If it is incomplete, a first appeal may follow.</p>
                <div className="life-outcomes">
                  <span className="outcome-good">Satisfied</span>
                  <span className="outcome-action">First appeal</span>
                </div>
              </article>

              <article>
                <span className="time-chip">5 days</span>
                <h3>Request transferred</h3>
                <p>The receiving public authority then follows the applicable response period.</p>
                <div className="life-outcomes">
                  <span className="outcome-neutral">Reply</span>
                  <span className="outcome-action">First appeal if needed</span>
                </div>
              </article>

              <article>
                <span className="time-chip">30 days</span>
                <h3>No reply received</h3>
                <p>No response within the period can lead to a first appeal or a Section 18 complaint.</p>
                <div className="life-outcomes">
                  <span className="outcome-action">First appeal</span>
                  <span className="outcome-neutral">Complaint to CIC</span>
                </div>
              </article>
            </div>

            <div className="appeal-track">
              <div>
                <span className="time-chip">30 to 45 days</span>
                <strong>First appellate decision</strong>
                <p>The appellate authority may decide within 30 days, or record reasons for extending up to 45 days.</p>
              </div>
              <ArrowIcon />
              <div>
                <span className="time-chip">Within 90 days</span>
                <strong>Second appeal</strong>
                <p>If the citizen remains unsatisfied, a second appeal may be made to the CIC or SIC as applicable.</p>
              </div>
            </div>
          </div>

          <figure className="source-reference">
            <Image alt="Original RTI lifecycle flowchart published by RTI Online" height={543} src="/rti-lifecycle.jpg" width={571} />
            <figcaption>
              <strong>Source reference</strong>
              Original lifecycle chart published on RTI Online. The accessible flow above is a simplified interpretation for orientation and is not legal advice.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="safeguards-section site-container reveal reveal-rise" id="safeguards">
        <div className="section-intro">
          <h2>Safeguards inside the drafting process</h2>
          <p>The service should help you ask clearly without inventing facts or overstepping the Act.</p>
        </div>
        <div className="safeguards-grid">
          <article>
            <span className="safeguard-icon"><ShieldIcon /></span>
            <div>
              <h3>Sensitive request check</h3>
              <p>Requests aimed at exempt information are not drafted. You receive a plain explanation and a lawful reframing where one is available.</p>
              <ul>
                <li>National security and protected material</li>
                <li>Cabinet papers and protected deliberations</li>
                <li>Private details unrelated to public duty</li>
              </ul>
            </div>
          </article>
          <article>
            <span className="safeguard-icon"><DocumentIcon /></span>
            <div>
              <h3>Photo evidence check</h3>
              <p>Only clearly observable details are proposed. Nothing enters the draft until you confirm it.</p>
              <ul>
                <li>Visible scene, condition, and signboards</li>
                <li>No accusations inferred from an image</li>
                <li>Attachments referenced as supporting material</li>
              </ul>
            </div>
          </article>
        </div>
      </section>

      <section className="official-next-step reveal reveal-wipe">
        <div className="site-container next-step-inner">
          <div>
            <h2>Ready to prepare your request?</h2>
            <p>Draft here, review every detail, then use the official RTI Online portal when you are ready to file.</p>
          </div>
          <div className="next-step-actions">
            <Link className="light-button" href="/request">Start drafting</Link>
            <a href="https://rtionline.gov.in/" rel="noreferrer" target="_blank">Go to RTI Online</a>
          </div>
        </div>
      </section>

      <footer className="site-footer" id="accessibility">
        <div className="site-container footer-grid">
          <div className="footer-brand">
            <Image alt="State Emblem of India" height={54} src="/india-emblem-white.png" width={37} />
            <div>
              <strong>Praja RTI</strong>
              <span>Independent citizen assistance</span>
            </div>
          </div>
          <div>
            <strong>Service</strong>
            <a href="#how-it-works">How it works</a>
            <a href="#safeguards">Safeguards</a>
          </div>
          <div>
            <strong>Official resources</strong>
            <a href="https://rtionline.gov.in/" rel="noreferrer" target="_blank">RTI Online</a>
            <a href="https://rtionline.gov.in/faq.php" rel="noreferrer" target="_blank">RTI FAQ</a>
          </div>
          <div>
            <strong>Accessibility</strong>
            <span>Keyboard friendly</span>
            <span>Reduced motion supported</span>
          </div>
        </div>
        <div className="site-container footer-bottom">
          <span>Praja RTI is not affiliated with the Government of India.</span>
          <span>Information last reviewed August 2026</span>
        </div>
      </footer>
    </main>
  );
}
