import ReadingsClient from "@/components/readings/ReadingsClient";
import { getReadings } from "@/lib/readings";
import { getInitiatives } from "@/lib/mission";

export const dynamic = "force-dynamic";

/**
 * Leituras — a lightweight reading inbox. Paste a link to review later or use
 * as a source. No scraping, no reader mode: just save, organise and retrieve.
 */
export default async function ReadingsPage() {
  const [readings, initiatives] = await Promise.all([
    getReadings(),
    getInitiatives(),
  ]);
  const options = initiatives.map((i) => ({ id: i.id, name: i.name }));

  return (
    <div>
      <header className="mb-12">
        <p className="atelier-date">Inbox de leitura</p>
        <h1 className="atelier-title">Leituras</h1>
        <p className="atelier-subtitle">
          Guarda links, artigos e referências para rever mais tarde ou usar como
          fonte.
        </p>
      </header>

      <ReadingsClient readings={readings} initiatives={options} />
    </div>
  );
}
