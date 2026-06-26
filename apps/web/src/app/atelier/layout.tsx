import type { Metadata } from "next";
import Link from "next/link";

/**
 * Internal constitutional library layout.
 *
 * Not public documentation. A focused, book-like reading surface: a single
 * centred column, generous whitespace, no application sidebar. Indexing is
 * disabled for the whole section.
 */
export const metadata: Metadata = {
  title: "ATELIER — Constituição",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function AtelierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[760px] items-baseline justify-between px-6 py-6">
          <Link
            href="/atelier"
            className="font-serif text-lg tracking-[0.22em] text-charcoal"
          >
            ATELIER
          </Link>
          <span className="eyebrow">Constituição</span>
        </div>
      </header>
      <div className="mx-auto max-w-[760px] px-6 py-16 md:py-24">
        {children}
      </div>
    </div>
  );
}
