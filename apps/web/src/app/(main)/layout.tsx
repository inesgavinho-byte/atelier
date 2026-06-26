import Link from "next/link";
import Nav from "@/components/Nav";

/**
 * Main application shell — desktop sidebar + mobile top bar.
 * The internal constitutional viewer (/atelier) intentionally lives outside
 * this group so it can present a focused, book-like reading surface.
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:justify-between md:border-r md:border-line md:px-8 md:py-10 md:sticky md:top-0 md:h-screen">
        <div>
          <Link href="/" className="block">
            <div className="font-serif text-2xl tracking-[0.22em] text-charcoal">
              ATELIER
            </div>
            <p className="meta mt-2 italic">Where thought becomes work.</p>
          </Link>
          <div className="rule my-8" />
          <Nav />
        </div>
        <div className="meta leading-relaxed">
          <div className="eyebrow mb-2">Operating layer</div>
          Inês judges.
          <br />
          Agents work.
        </div>
      </aside>

      {/* Top bar — mobile */}
      <header className="md:hidden border-b border-line px-6 py-5">
        <Link href="/" className="block">
          <div className="font-serif text-xl tracking-[0.22em] text-charcoal">
            ATELIER
          </div>
        </Link>
        <div className="mt-4">
          <Nav orientation="horizontal" />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-atelier px-6 py-10 md:px-14 md:py-16">
          {children}
        </div>
      </main>
    </div>
  );
}
