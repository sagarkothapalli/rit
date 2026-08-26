import Link from "next/link";
import Aurora from "@/components/Aurora";
import BlurText from "@/components/BlurText";
import SpotlightCard from "@/components/SpotlightCard";
import CountUp from "@/components/CountUp";
import ThemeToggle from "@/components/ThemeToggle";

const flowSteps = [
  {
    title: "Speak, type, or attach a photo",
    body: "Voice first, with a visible editable transcript. Photos are read by vision; every finding is read back and enters the draft only after you confirm it.",
  },
  {
    title: "The agent writes the RTI application",
    body: "Records-focused, not grievance. One plain follow-up when something material is missing. It never invents dates, names, or authorities.",
  },
  {
    title: "Three explained departments",
    body: "A successful Central match returns exactly three candidates, each with a reason and an ambiguity warning. State matters stop safely.",
  },
  {
    title: "Confirm, mock pay, DEMO receipt",
    body: "Sandbox OTP sign-in, explicit confirmation of draft and destination, simulated fee (waived for BPL). Receipt labelled NOT SUBMITTED.",
  },
];

const guardrails = [
  {
    tag: "Sec 8 guard",
    title: "Refuses what the RTI Act already exempts",
    body: "If a request targets exempt material — national security, cabinet papers, an official's personal details unconnected to public duty — the agent does not draft. You get a plain-language summary of exactly which exemption applies, plus a lawful reframing where one exists.",
    spotlight: "rgba(185, 28, 28, 0.06)" as const,
    tagClass: "text-[var(--red)] border-[var(--red)]/20 bg-[var(--red)]/[0.04]",
  },
  {
    tag: "Evidence",
    title: "Reads the photo you attached",
    body: "Photos of the incident are analysed for what is clearly observable — scene, signboards, condition. Each finding is confirmed by you before it enters the draft, and images are cited as attached supporting evidence in the standard filing format. Never as accusations.",
    spotlight: "rgba(79, 70, 229, 0.07)" as const,
    tagClass: "text-[var(--iris)] border-[var(--iris)]/20 bg-[var(--iris-tint)]",
  },
];

export default function Page() {
  return (
    <main className="relative">
      {/* Independent-demo ribbon */}
      <div className="w-full border-b border-[var(--line)] bg-[var(--glass)] backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-2 flex items-center gap-2.5 text-[13px] text-[var(--fg-soft)]">
          <span className="size-1.5 rounded-full bg-[var(--amber)]" aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--amber)]">Independent</span>
          <span>
            Praja-RTI is a hackathon demo — not affiliated with the Government of India. No RTI is filed with any government system here.
          </span>
        </div>
      </div>

      {/* Nav */}
      <header className="mx-auto max-w-6xl w-full px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid place-items-center size-8 rounded-lg bg-[var(--iris)] text-white font-display text-[15px] font-semibold">
            P
          </span>
          <span className="font-display font-semibold text-[18px] tracking-tight">Praja&middot;RTI</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-[14px] text-[var(--fg-soft)]">
          <a href="#how" className="hover:text-[var(--fg)] transition-colors">How it works</a>
          <a href="#guardrails" className="hover:text-[var(--fg)] transition-colors">Guardrails</a>
          <a href="#facts" className="hover:text-[var(--fg)] transition-colors">Portal facts</a>
        </nav>
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Link
            href="/demo"
            className="rounded-full bg-[var(--iris)] px-4.5 py-2 text-[13.5px] font-medium text-white transition-all duration-200 hover:bg-[var(--iris-deep)] hover:shadow-[0_8px_20px_-8px_rgba(79,70,229,0.5)]"
          >
            Open the demo
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[560px] -z-10 hero-aurora [mask-image:radial-gradient(ellipse_75%_65%_at_50%_0%,#000_40%,transparent_100%)]">
          <Aurora
            colorStops={["#c4b5fd", "#bae6fd", "#fbcfe8"]}
            amplitude={0.7}
            blend={0.65}
            speed={0.7}
          />
        </div>

        <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 md:pt-28 md:pb-32 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--glass)] backdrop-blur px-3.5 py-1.5 text-[12.5px] text-[var(--fg-soft)] mb-9 shadow-[0_2px_8px_-2px_rgba(20,20,30,0.06)]">
            <span className="size-1.5 rounded-full bg-[var(--iris)]" aria-hidden />
            Voice-first · mock-only · not a government service
          </div>

          <h1 className="mx-auto max-w-4xl font-display text-[44px] sm:text-[58px] md:text-[68px] font-medium leading-[1.04] tracking-tight text-[var(--fg)]">
            <BlurText
              text="Speak it. The agent writes the RTI."
              delay={55}
              stepDuration={0.45}
              animateBy="words"
              className="justify-center"
            />
            <span className="block mt-2 font-display italic font-light text-[var(--iris)]">
              It picks the right department.
            </span>
          </h1>

          <p className="mt-7 text-[16.5px] sm:text-[17.5px] text-[var(--fg-soft)] max-w-2xl mx-auto leading-relaxed">
            A calm little console for a loud process: it turns a spoken complaint into a
            records-focused RTI application, explains the most likely Central public authority,
            and prepares a clearly simulated DEMO receipt — without ever contacting the government.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href="/demo"
              className="rounded-full bg-[var(--iris)] px-7 py-3 text-[15px] font-medium text-white transition-all duration-200 hover:bg-[var(--iris-deep)] hover:shadow-[0_12px_28px_-10px_rgba(79,70,229,0.55)] hover:scale-[1.02] active:scale-[0.99]"
            >
              Launch the console →
            </Link>
            <a
              href="#guardrails"
              className="rounded-full border border-[var(--line-strong)] bg-[var(--glass)] backdrop-blur px-7 py-3 text-[15px] text-[var(--fg-soft)] hover:text-[var(--fg)] hover:border-[var(--iris)]/40 transition-all duration-200"
            >
              See the guardrails
            </a>
          </div>

          {/* CountUp instruments */}
          <div id="facts" className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-3.5 max-w-3xl mx-auto">
            {[
              { to: 10, prefix: "Rs ", label: "fee, waived for BPL applicants" },
              { to: 2916, separator: ",", label: "Central public authorities (we mock a curated ~50)" },
              { to: 30, suffix: " days", label: "statutory response window (48 h life-and-liberty)" },
              { to: 3000, separator: ",", label: "character limit per request (attachments allowed)" },
            ].map((s) => (
              <div key={s.label} className="paper px-4 py-5 text-left">
                <div className="font-display text-[27px] font-semibold text-[var(--fg)] leading-none">
                  {s.prefix}
                  <CountUp to={s.to} separator={s.separator} duration={1.8} />
                  {s.suffix}
                </div>
                <div className="mt-2 text-[12px] leading-snug text-[var(--fg-faint)]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-rule mx-auto max-w-6xl" />

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-[32px] md:text-[40px] font-medium tracking-tight text-[var(--fg)] mb-3">
          Four motions, one honest request.
        </h2>
        <p className="text-[var(--fg-soft)] max-w-2xl leading-relaxed mb-10">
          No silent submission, no fake confidence. The console prepares an application, explains the
          destination, and hands you a labelled DEMO receipt.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          {flowSteps.map((s, i) => (
            <SpotlightCard
              key={s.title}
              spotlightColor={"rgba(79, 70, 229, 0.06)" as const}
              className="!rounded-[20px] !p-6"
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--iris)] mb-3">
                Step {i + 1}
              </div>
              <h3 className="font-display text-[20px] font-medium text-[var(--fg)] leading-snug mb-2">
                {s.title}
              </h3>
              <p className="text-[14px] leading-relaxed text-[var(--fg-soft)]">{s.body}</p>
            </SpotlightCard>
          ))}
        </div>

        {/* Grievance → draft */}
        <div className="mt-8 grid md:grid-cols-2 gap-4">
          <div className="paper p-7">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--red)] mb-2.5">
              What you said
            </div>
            <p className="font-display italic text-[17px] leading-relaxed text-[var(--fg-soft)]">
              &ldquo;The road outside my house in Sector 4 is broken for months. Why is the government not
              fixing it? Officers are corrupt!&rdquo;
            </p>
          </div>
          <div className="paper p-7">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--green)] mb-2.5">
              What the agent wrote
            </div>
            <p className="text-[14.5px] leading-relaxed text-[var(--fg)]">
              Please provide certified copies of: (1) the work order, sanctioned budget, and contractor
              details for Road #12, Sector 4; (2) the scheduled completion date and delay-penalty clauses;
              (3) quality inspection reports submitted by the site engineer.
            </p>
          </div>
        </div>
      </section>

      <div className="section-rule mx-auto max-w-6xl" />

      {/* GUARDRAILS */}
      <section id="guardrails" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-[32px] md:text-[40px] font-medium tracking-tight text-[var(--fg)] mb-3">
          Two things the console will not do.
        </h2>
        <p className="text-[var(--fg-soft)] max-w-2xl leading-relaxed mb-10">
          The guardrails run inside the same flow as the drafting. They are not a step you have to remember.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          {guardrails.map((g) => (
            <SpotlightCard key={g.tag} spotlightColor={g.spotlight} className="!rounded-[20px] !p-7">
              <div className={`inline-flex items-center rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] mb-4 ${g.tagClass}`}>
                {g.tag}
              </div>
              <h3 className="font-display text-[21px] font-medium text-[var(--fg)] leading-snug mb-2.5">
                {g.title}
              </h3>
              <p className="text-[14px] leading-relaxed text-[var(--fg-soft)]">{g.body}</p>
            </SpotlightCard>
          ))}
        </div>
      </section>

      <div className="section-rule mx-auto max-w-6xl" />

      {/* WHY ROUTING MATTERS */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="paper p-8 flex flex-wrap items-center justify-between gap-6">
          <p className="max-w-[62ch] text-[15px] leading-relaxed text-[var(--fg-soft)]">
            <span className="text-[var(--fg)] font-medium">Why the choice matters.</span> Picking the wrong
            Central public authority triggers a Section 6(3) transfer within up to five days — plus the
            new authority&apos;s own handling time. The console explains every recommendation, and you
            can always search or override it.
          </p>
          <a
            href="https://rtionline.gov.in/index.php"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[12px] uppercase tracking-[0.16em] text-[var(--iris)] hover:underline whitespace-nowrap"
          >
            Official portal ↗
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[var(--line)]">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-[var(--fg-faint)]">
          <div>© 2026 Praja&middot;RTI · Independent hackathon concept</div>
          <div className="font-mono">Aurora · BlurText · SpotlightCard · CountUp — React Bits</div>
        </div>
      </footer>
    </main>
  );
}
