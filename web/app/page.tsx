import Link from "next/link";
import ApplicationAccess from "@/components/ApplicationAccess";
import Emblem from "@/components/Emblem";
import RtiLifecycleChart from "@/components/RtiLifecycleChart";
import SiteMasthead from "@/components/SiteMasthead";
import { directoryStats } from "@/lib/directory-tree";

/* ============================================================
   Home. One job: explain what this is, show what it produces,
   and start the request. The lifecycle chart and the safeguards
   stay because they teach something the citizen cannot get from
   the official portal; everything decorative has gone.
   ============================================================ */

const steps = [
  {
    title: "Describe the problem",
    body: "Speak to the assistant or type it yourself, in any of twelve languages. Plain words are enough.",
  },
  {
    title: "Confirm what to ask for",
    body: "Your words become requests for records that already exist on an official file. You review them.",
  },
  {
    title: "Check it is allowed",
    body: "Requests aimed at exempt material are refused with the exact section, and a lawful alternative.",
  },
  {
    title: "Find the right authority",
    body: "Search the full Central directory, or compare three explained suggestions. You choose.",
  },
  {
    title: "Add your details",
    body: "The same particulars the official form asks for, verified by email so your copy stays yours.",
  },
  {
    title: "Take it to the portal",
    body: "Download the completed application as a PDF, then file it and pay on the official portal.",
  },
];

const exampleRequests = [
  "Certified copies of the work order and sanctioned estimate for the road work in Ward 12.",
  "The contractor's name, agreement, and the scheduled date of completion recorded on the file.",
  "Copies of every quality inspection report submitted for that work.",
  "The file notings recording why the work remained incomplete after the scheduled date.",
];

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

function ScaleIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M12 3v18M7 21h10M12 6l-6 2m6-2l6 2M6 8l-2.5 5h5zM18 8l-2.5 5h5z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  );
}

export default function Page() {
  const stats = directoryStats();

  return (
    <main className="site-shell">
      <SiteMasthead
        notice="Independent citizen assistance for RTI applications"
        links={
          <>
            <Link href="/departments">Authority directory</Link>
            <a href="https://rtionline.gov.in/" rel="noreferrer" target="_blank">Official RTI portal</a>
          </>
        }
        truth={
          <>
            <strong>Important:</strong> Praja RTI is independent citizen assistance. It is not a government portal
            and it does not file an application on your behalf.
          </>
        }
      >
        <nav className="primary-nav" aria-label="Primary navigation">
          <a href="#how-it-works">How it works</a>
          <Link href="/departments">Authorities</Link>
          <a href="#rti-lifecycle">The RTI process</a>
          <a href="#saved-applications">Saved applications</a>
        </nav>
        <Link className="header-action" href="/request">Start a request</Link>
      </SiteMasthead>

      <section className="hero site-container" id="main-content">
        <div className="hero-copy">
          <h1>Say what went wrong. Leave with a filed-ready RTI application.</h1>
          <p>
            Describe the problem in your own language. We turn it into a formal request for the records that prove
            what happened, addressed to the authority that actually holds them.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" href="/request">
              <MicIcon />
              Start a request
            </Link>
            <Link className="text-link" href="/departments">
              Browse {stats.authorities.toLocaleString("en-IN")} public authorities
            </Link>
          </div>
          <dl className="hero-assurances">
            <div>
              <dt>Languages</dt>
              <dd>Twelve, including Hindi, Telugu, Tamil, and Bengali</dd>
            </div>
            <div>
              <dt>Directory</dt>
              <dd>{stats.ministries} ministries, {stats.authorities.toLocaleString("en-IN")} authorities</dd>
            </div>
            <div>
              <dt>Control</dt>
              <dd>You confirm every step</dd>
            </div>
          </dl>
        </div>

        <div className="example-panel" aria-label="Example of a spoken concern becoming an RTI application">
          <div className="example-head">
            <span>What you say</span>
          </div>
          <blockquote className="example-quote">
            The road in our colony was dug up eight months ago and never repaired. Nobody tells us who was
            supposed to fix it or where the money went.
          </blockquote>
          <div className="example-divider" aria-hidden="true">
            <span>becomes</span>
          </div>
          <div className="example-head">
            <span>What the authority receives</span>
          </div>
          <ol className="example-requests">
            {exampleRequests.map((request) => <li key={request}>{request}</li>)}
          </ol>
          <p className="example-note">
            <ShieldIcon />
            No accusation, no adjective of blame — only records the authority must produce.
          </p>
        </div>
      </section>

      <section className="service-principles" aria-labelledby="principles-title">
        <div className="site-container principles-grid">
          <h2 id="principles-title">Why applications get rejected, and how we avoid it</h2>
          <div>
            <strong>Records, not complaints</strong>
            <p>
              The Act compels documents, not answers. A &ldquo;why did nobody fix this&rdquo; question is refused; a
              request for the file notings that record the reason is not.
            </p>
          </div>
          <div>
            <strong>The right government</strong>
            <p>
              The Central portal returns State and municipal applications without refunding the fee. We tell you
              which government holds your record before you pay anything.
            </p>
          </div>
          <div>
            <strong>Exemptions checked first</strong>
            <p>
              Section 8, 9, 11, and 24 are screened before drafting. If your request is not allowed, you find out
              here rather than 30 days later.
            </p>
          </div>
        </div>
      </section>

      <ApplicationAccess />

      <section className="process-section site-container" id="how-it-works">
        <div className="section-intro">
          <h2>From a problem to a filed-ready application</h2>
          <p>Nine steps, one decision at a time. You can go back and change any answer.</p>
        </div>
        <ol className="service-path">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className="step-icon">{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="lifecycle-section" id="rti-lifecycle">
        <div className="site-container">
          <div className="section-intro">
            <h2>What happens after you file</h2>
            <p>
              Thirty days for a reply, forty if a third party must be consulted. Select any block to trace the
              stages that follow it — reply, transfer, appeal, or complaint.
            </p>
          </div>
          <RtiLifecycleChart />
        </div>
      </section>

      <section className="safeguards-section site-container" id="safeguards">
        <div className="section-intro">
          <h2>What we refuse to draft</h2>
          <p>An application that asks for exempt material wastes your fee and your thirty days.</p>
        </div>
        <div className="safeguards-grid">
          <article>
            <span className="safeguard-icon"><ScaleIcon /></span>
            <div>
              <h3>Exempt under the Act</h3>
              <p>
                Screened in code before anything is written, so a refusal never depends on a service being
                available.
              </p>
              <ul>
                <li>National security and strategic matters — 8(1)(a)</li>
                <li>Cabinet papers on an incomplete decision — 8(1)(i)</li>
                <li>A third party&apos;s trade secrets — 8(1)(d)</li>
                <li>An official&apos;s private life — 8(1)(j)</li>
                <li>Anything identifying an informant — 8(1)(g)</li>
                <li>Live investigations — 8(1)(h)</li>
                <li>Second Schedule organisations — Section 24</li>
              </ul>
            </div>
          </article>
          <article>
            <span className="safeguard-icon"><DocumentIcon /></span>
            <div>
              <h3>Not information at all</h3>
              <p>
                The Act gives you material already on record. These get rewritten into something an authority can
                actually be compelled to produce.
              </p>
              <ul>
                <li>Opinions, advice, and justifications</li>
                <li>&ldquo;Why did you decide that?&rdquo; questions</li>
                <li>Promises about future action</li>
                <li>Records that do not exist yet</li>
                <li>Demands for punishment, refunds, or redress</li>
              </ul>
            </div>
          </article>
        </div>
      </section>

      <section className="official-next-step">
        <div className="site-container next-step-inner">
          <div>
            <h2>Ready to start?</h2>
            <p>Prepare it here, review every detail, then file it on the official portal.</p>
          </div>
          <div className="next-step-actions">
            <Link className="light-button" href="/request">Start a request</Link>
            <a href="https://rtionline.gov.in/" rel="noreferrer" target="_blank">Go to RTI Online</a>
          </div>
        </div>
      </section>

      <footer className="site-footer" id="accessibility">
        <div className="site-container footer-grid">
          <div className="footer-brand">
            <Emblem className="footer-emblem" size={44} />
            <div>
              <strong>Praja RTI</strong>
              <span>Independent citizen assistance</span>
            </div>
          </div>
          <div>
            <strong>Service</strong>
            <a href="#how-it-works">How it works</a>
            <Link href="/departments">Authority directory</Link>
            <a href="#safeguards">What we refuse</a>
          </div>
          <div>
            <strong>Official resources</strong>
            <a href="https://rtionline.gov.in/" rel="noreferrer" target="_blank">RTI Online</a>
            <a href="https://rtionline.gov.in/request/allpa.php" rel="noreferrer" target="_blank">All public authorities</a>
            <a href="https://rtionline.gov.in/faq.php" rel="noreferrer" target="_blank">Official FAQ</a>
          </div>
          <div>
            <strong>Accessibility</strong>
            <span>Light and dark appearance</span>
            <span>Text size control in the top bar</span>
            <span>Keyboard navigation and reduced motion</span>
          </div>
        </div>
        <div className="site-container footer-bottom">
          <span>Praja RTI is not affiliated with the Government of India.</span>
          <span>Directory reviewed August 2026</span>
        </div>
      </footer>
    </main>
  );
}
