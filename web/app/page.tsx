import Link from "@/components/SiteLink";
import ApplicationAccess from "@/components/ApplicationAccess";
import Emblem from "@/components/Emblem";
import LazyRtiLifecycleChart from "@/components/LazyRtiLifecycleChart";
import SiteMasthead from "@/components/SiteMasthead";
import { MINISTRY_COUNT, PORTAL_TOTAL } from "@/lib/directory-meta";

/* ============================================================
   Home. One job: explain what this is, show what it produces,
   and start the request. The lifecycle chart and the safeguards
   stay because they teach something the citizen cannot get from
   the official portal; everything decorative has gone.
   ============================================================ */

const steps = [
  {
    title: "Describe the problem",
    body: "Speak to the RTI agent or type it yourself, in any of twelve languages. Plain words are enough.",
  },
  {
    title: "Confirm what to ask for",
    body: "Your words become requests for records that already exist on an official file. You review them.",
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

function WaveformIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M2.75 10.25v3.5M6.25 7v10M9.75 3.75v16.5M13.25 6.5v11M16.75 9v6M20.25 10.25v3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
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
  const portalTotal = PORTAL_TOTAL.toLocaleString("en-IN");

  return (
    <main className="site-shell">
      <SiteMasthead
        notice="Independent citizen assistance for RTI applications"
        links={
          <a href="https://rtionline.gov.in/" rel="noreferrer" target="_blank">Official RTI portal</a>
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
          <Link href="/cases">My RTI cases</Link>
        </nav>
        <Link className="header-action" href="/cases/new/request">Start an RTI request</Link>
      </SiteMasthead>

      <section className="hero" id="main-content">
        <div className="site-container hero-inner">
          <p className="hero-eyebrow">Independent RTI assistance · not a government portal</p>
          <h1>Say it plainly. Prepare it properly.</h1>
          <p className="hero-lede">
            Tell us what went wrong, in your own words and your own language. We turn it into a formal RTI
            application that asks for the exact records proving what happened — addressed to the authority that
            actually holds the file.
          </p>
          <div className="hero-actions">
            <Link className="primary-button hero-cta" href="/cases/new/request">
              <WaveformIcon />
              Start an RTI request
            </Link>
            <Link className="text-link" href="/departments">
              Browse {portalTotal} public authorities
            </Link>
          </div>
        </div>
        <div className="hero-stats">
          <div className="site-container hero-stats-grid">
            <div>
              <strong>{portalTotal}</strong>
              <span>authorities listed on rtionline.gov.in</span>
            </div>
            <div>
              <strong>{MINISTRY_COUNT}</strong>
              <span>ministries and departments covered</span>
            </div>
            <div>
              <strong>12</strong>
              <span>languages, including Hindi, Telugu, Tamil, and Bengali</span>
            </div>
            <div>
              <strong>Every step</strong>
              <span>confirmed by you before your filing packet is prepared</span>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label="Example of a spoken complaint becoming an RTI application"
        className="example-band"
      >
        <div className="site-container">
          <div className="section-intro">
            <h2>From a complaint to a formal request</h2>
            <p>
              A complaint spoken in plain words becomes a numbered request for records that already exist on an
              official file.
            </p>
          </div>
          <div className="example-grid">
            <div className="example-card example-say">
              <div className="example-head">
                <span>What you say</span>
              </div>
              <blockquote className="example-quote">
                The road in our colony was dug up eight months ago and never repaired. Nobody tells us who was
                supposed to fix it or where the money went.
              </blockquote>
            </div>
            <div className="example-becomes" aria-hidden="true">
              <span>becomes</span>
            </div>
            <div className="example-card example-gets">
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
          </div>
        </div>
      </section>

      <section className="service-principles" aria-labelledby="principles-title">
        <div className="site-container principles-grid">
          <h2 id="principles-title">What makes a stronger RTI application</h2>
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
            <strong>You make the final call</strong>
            <p>
              Praja suggests record requests and lets you edit every line. It does not decide whether a request is
              legally allowed or whether an authority must disclose a record.
            </p>
          </div>
        </div>
      </section>

      <ApplicationAccess />

      <section className="process-section site-container" id="how-it-works">
        <div className="section-intro">
          <h2>From a problem to a filed-ready application</h2>
          <p>Eight steps, one decision at a time. You can go back and change any answer.</p>
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
          <LazyRtiLifecycleChart />
        </div>
      </section>

      <section className="safeguards-section site-container" id="safeguards">
        <div className="section-intro">
          <h2>What to review before filing</h2>
          <p>Praja offers drafting guidance, not a legal decision about what an authority will disclose.</p>
        </div>
        <div className="safeguards-grid">
          <article>
            <span className="safeguard-icon"><ScaleIcon /></span>
            <div>
              <h3>Records that may be withheld</h3>
              <p>
                The public authority applies the Act to the records it holds. These categories may require closer
                review and can be challenged through the appeal process if withheld incorrectly.
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
            <h2>Ready to file?</h2>
            <p>Prepare it here, review every detail, then file it on the official portal.</p>
          </div>
          <div className="next-step-actions">
            <Link className="light-button" href="/cases/new/request">Start an RTI request</Link>
            <a href="https://rtionline.gov.in/" rel="noreferrer" target="_blank">Go to RTI Online</a>
          </div>
        </div>
      </section>

      <footer className="site-footer" id="accessibility">
        <div className="site-container footer-grid">
          <div className="footer-brand">
            <Emblem className="footer-emblem" priority={false} size={44} />
            <div>
              <strong>Praja RTI</strong>
              <span>Independent citizen assistance</span>
            </div>
          </div>
          <div>
            <strong>Service</strong>
            <a href="#how-it-works">How it works</a>
            <Link href="/departments">Authority directory</Link>
            <a href="#safeguards">Filing guidance</a>
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
            <span>Scales with your browser zoom (Ctrl/Cmd + or −)</span>
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
