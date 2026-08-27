import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_Devanagari, Public_Sans } from "next/font/google";
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
    "Describe a problem in your own language and leave with a formal RTI application, addressed to the authority that holds the records. Independent citizen assistance, not a government portal.",
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${publicSans.variable} ${devanagari.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
