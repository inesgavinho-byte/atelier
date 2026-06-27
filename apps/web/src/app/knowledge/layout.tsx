import type { Metadata } from "next";
import Link from "next/link";

/**
 * Internal Knowledge Library layout.
 *
 * Not public documentation. The same focused, book-like reading surface used
 * by the constitutional library: a single centred column, generous whitespace,
 * no application sidebar. Indexing is disabled for the whole section.
 */
export const metadata: Metadata = {
  title: "ATELIER — Knowledge",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function KnowledgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[760px] items-baseline justify-between px-6 py-6">
          <Link
            href="/knowledge"
            className="font-serif text-lg tracking-[0.22em] text-charcoal"
          >
            ATELIER
          </Link>
          <span className="eyebrow">Knowledge</span>
        </div>
      </header>
      <div className="mx-auto max-w-[760px] px-6 py-16 md:py-24">
        {children}
      </div>
    </div>
  );
}
