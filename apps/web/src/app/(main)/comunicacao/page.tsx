export const dynamic = "force-dynamic";

/**
 * Comunicação — placeholder surface.
 *
 * No messaging or email source is wired in yet, so this is a calm empty state
 * rather than a fabricated inbox. The navigation link is real; the data
 * arrives when a source exists.
 */
export default function ComunicacaoPage() {
  return (
    <div>
      <header className="mb-12">
        <p className="atelier-date">Comunicação</p>
        <h1 className="atelier-title">Comunicação</h1>
        <p className="atelier-subtitle">
          Mensagens, emails e publicações.
        </p>
      </header>

      <section className="atelier-card">
        <div className="atelier-card-inner">
          <p className="atelier-empty">
            Ainda não há comunicações. Quando ligares uma fonte, as tuas
            mensagens e publicações aparecem aqui.
          </p>
        </div>
      </section>
    </div>
  );
}
