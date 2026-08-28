import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_Devanagari, Public_Sans } from "next/font/google";
import { PREFS_SCRIPT } from "@/lib/prefs-script";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  display: "swap",
  preload: false,
  adjustFontFallback: true,
  fallback: ["Noto Sans Devanagari", "Noto Sans", "ui-sans-serif", "sans-serif"],
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#082f5b",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${publicSans.variable} ${devanagari.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: PREFS_SCRIPT }}
          suppressHydrationWarning
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
