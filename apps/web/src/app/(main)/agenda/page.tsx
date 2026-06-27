export const dynamic = "force-dynamic";

/**
 * Agenda — placeholder surface.
 *
 * There is no calendar source wired in yet, so this is a calm empty state
 * rather than a fabricated schedule. The navigation link is real; the data
 * arrives when a source exists.
 */
export default function AgendaPage() {
  return (
    <div>
      <header className="mb-12">
        <p className="atelier-date">Agenda</p>
        <h1 className="atelier-title">Agenda</h1>
        <p className="atelier-subtitle">
          Reuniões, prazos e compromissos.
        </p>
      </header>

      <section className="atelier-card">
        <div className="atelier-card-inner">
          <p className="atelier-empty">
            Ainda não há nada agendado. Quando ligares uma fonte de calendário,
            os teus compromissos aparecem aqui.
          </p>
        </div>
      </section>
    </div>
  );
}
