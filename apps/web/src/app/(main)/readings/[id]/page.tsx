import { notFound } from "next/navigation";
import ReaderView from "@/components/readings/ReaderView";
import { getReading } from "@/lib/readings";
import { getInitiatives } from "@/lib/mission";

export const dynamic = "force-dynamic";

/**
 * Leitor integrado — a distraction-free reader for a single saved article.
 * Renders the clean content extracted at save time; degrades to the excerpt /
 * note and a link to the original when no content could be extracted.
 */
export default async function ReadingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [reading, initiatives] = await Promise.all([
    getReading(id),
    getInitiatives(),
  ]);

  if (!reading) notFound();

  const options = initiatives.map((i) => ({ id: i.id, name: i.name }));
  return <ReaderView reading={reading} initiatives={options} />;
}
