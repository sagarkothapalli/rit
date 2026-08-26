import type { Metadata } from "next";
import { Noto_Sans_Devanagari, Public_Sans } from "next/font/google";
import RevealObserver from "@/components/RevealObserver";
import { PREFS_SCRIPT } from "@/lib/prefs-script";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Praja RTI | Independent citizen assistance",
  description:
    "Speak or type your concern, review a records focused RTI draft, and compare explained Central public authority suggestions. Independent citizen assistance, not a government portal.",
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${publicSans.variable} ${devanagari.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col" data-design-seed="2d3f5aee">
        <template
          dangerouslySetInnerHTML={{
            __html: `<!--
              THESIS: Citizen words become a precise records request in one visible workspace. It refuses the promotional landing page and decorative government pastiche.
              OWN-WORLD: India navy civic masthead, off white service paper, thin neutral rules, small saffron and green signals, compact corners, bilingual public service sans.
              STORY: Understand the independent service, see speech become numbered records, learn the drafting steps and official RTI lifecycle, then start a reviewable request.
              FIRST VIEWPORT: Bilingual emblem masthead above a 40/60 split. A modest headline and action sit left; the working speech to records transformation leads right.
              FORM: Pinned government and Apple inspired civic workspace, comp A, seed 2d3f5aee.
              FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md.
            -->`,
          }}
        />
        <RevealObserver />
        {children}
      </body>
    </html>
  );
}
