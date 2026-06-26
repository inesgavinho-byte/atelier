import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-atelier px-6 py-24 md:px-14">
      <div className="eyebrow mb-3">Not found</div>
      <h1 className="text-4xl">This page does not exist.</h1>
      <p className="mt-4 text-muted">
        The work you are looking for may have moved or never been here.
      </p>
      <Link href="/" className="action mt-8">
        Return to ATELIER
      </Link>
    </div>
  );
}
