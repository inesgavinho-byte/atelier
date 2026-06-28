import type { Metadata } from "next";
import { Cormorant_Garamond, Quattrocento_Sans } from "next/font/google";
import "./globals.css";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Quattrocento_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ATELIER — Where thought becomes work",
  description:
    "The operating layer for Inês Gavinho's intellectual, editorial and strategic projects.",
};

/**
 * Synchronous theme bootstrap: reads the saved preference (or the OS setting)
 * and sets <html data-theme> before first paint, so there is no flash of the
 * wrong theme. Runs before React hydration.
 */
const themeInit = `(function(){try{var t=localStorage.getItem('atelier-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt"
      className={`${serif.variable} ${sans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
