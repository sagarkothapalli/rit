import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  display: "swap",
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Praja-RTI · Voice-first RTI drafting, calmly done",
  description:
    "An independent hackathon demo. Speak naturally; the agent writes an RTI application for specific records, explains the right Central public authority, and prepares a clearly simulated DEMO receipt. Not affiliated with the Government of India; nothing is filed with any government system.",
};

const NO_FLASH_THEME = `(function(){var t='light';try{if(localStorage.getItem('praja-theme')==='dark'){t='dark';}}catch(e){}document.documentElement.dataset.theme=t;})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME }} />
        {/*
          THESIS: A quiet editorial desk by a window — ivory paper ground,
          pastel light through glass, one calm indigo signal. Refuses the
          dark-instrument console and every government-portal habit.
          OWN-WORLD: warm ivory (#f7f5f0), frosted-glass panels (white 65%
          + blur + hairline + soft layered shadow), Fraunces editorial
          display with an italic accent line, Inter body, JetBrains Mono
          labels, indigo #4f46e5 as the single interactive colour. React
          Bits: pastel Aurora wash, BlurText headline, glass SpotlightCard
          hover, CountUp instruments.
          STORY: The citizen lands in a calm, bright room. The headline
          blurs into focus, pastel light moves behind glass, live counters
          state the real portal numbers, and a solid indigo pill leads into
          the demo. The demo keeps the same glass language across six steps.
          FIRST VIEWPORT: hairline ribbon, nav with indigo pill CTA, pastel
          Aurora behind a centred BlurText headline with italic indigo
          second line, one sub-line, two actions, four glass stat cards.
          FORM: Light glass editor. User-directed replacement of the dark
          console ("re do the design" → light glass editor pick).
          FINISH: unreviewed and undocumented is unfinished; this build ends
          with the finish review, the verdict, and DESIGN.md.
        */}
        {children}
      </body>
    </html>
  );
}
