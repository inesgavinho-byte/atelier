import Link from "next/link";
import { ago } from "@/components/mission/bits";
import {
  getActivity,
  getInitiatives,
  getNextAction,
  getPendingDecisions,
  getRecentCaptures,
  getTodaySummary,
} from "@/lib/mission";
import { countUnreadReadings } from "@/lib/readings";
import { owner, todayLabel } from "@/data/mission";

export const dynamic = "force-dynamic";

/** Timing label derived from a decision's priority. */
const TIMING: Record<string, string> = {
  alta: "Hoje",
  média: "Esta semana",
  baixa: "Quando possível",
};

/**
 * Atelier Desk — the working surface at `/`.
 *
 * Answers one question: "where do I continue working?". Work-first, not
 * metric-first (metrics live in Mission Control). Every section degrades to a
 * calm empty state when its data source is not yet available.
 */
export default async function AtelierDeskPage() {
  const [initiatives, pending, activityAll, captures, summary, unreadReadings] =
    await Promise.all([
      getInitiatives(),
      getPendingDecisions(),
      getActivity(),
      getRecentCaptures(50),
      getTodaySummary(),
      countUnreadReadings(),
    ]);
  const next = getNextAction();

  // The lead piece of work to resume: the most-advanced unfinished initiative.
  const ranked = [...initiatives].sort((a, b) => b.progress - a.progress);
  const lead = ranked.find((i) => i.progress < 100) ?? ranked[0];

  const nextSteps = pending.slice(0, 5);
  const activity = activityAll.slice(0, 5);

  // Inbox counts grouped from the captured items by kind.
  const countKind = (...kinds: string[]) =>
    captures.filter((c) => kinds.includes(c.kind)).length;
  const inbox = [
    { label: "Leituras", value: unreadReadings, href: "/readings" },
    { label: "Capturas", value: captures.length },
    { label: "Emails", value: countKind("email") },
    { label: "Ideias", value: countKind("nota", "texto") },
    { label: "Documentos", value: countKind("pdf", "imagem", "url") },
    { label: "Áudios", value: countKind("áudio") },
  ];

  const iniById = new Map(initiatives.map((i) => [i.id, i]));

  return (
    <div>
      {/* 1 — Greeting */}
      <header>
        <p className="atelier-date">{todayLabel}</p>
        <h1 className="atelier-title">Bom dia, {owner}.</h1>
        <p className="atelier-subtitle">Onde queres continuar a trabalhar?</p>
      </header>

      <div className="atelier-desk-grid">
        {/* Left column */}
        <div className="atelier-left-stack">
          {/* 2 — Continue working */}
          <section className="atelier-card">
            <div className="atelier-card-inner">
              <p className="atelier-section-label">Continuar a trabalhar</p>
              {lead ? (
                <div className="continue-card">
                  <div className="issue-cover">
                    <span className="issue-number">{lead.name}</span>
                  </div>
                  <div>
                    <p className="atelier-card-meta">{lead.name}</p>
                    <h2 className="atelier-card-title mt-2">{lead.focus}</h2>
                    <p className="atelier-list-subtitle">{lead.intent}</p>
                    <div
                      className="progress-line"
                      style={
                        { ["--progress" as string]: `${lead.progress}%` }
                      }
                    >
                      <span />
                    </div>
                    <p className="atelier-list-subtitle">{lead.progress}%</p>
                  </div>
                  <div className="continue-actions">
                    <Link
                      href={`/initiatives/${lead.slug}`}
                      className="atelier-button primary"
                    >
                      Continuar a trabalhar
                    </Link>
                    <Link
                      href={`/initiatives/${lead.slug}`}
                      className="atelier-button"
                    >
                      Abrir projeto
                    </Link>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="atelier-empty">
                    Ainda não há trabalho activo. Começa por capturar uma ideia
                    ou abrir um projeto.
                  </p>
                  <div className="continue-actions mt-5">
                    <Link href="/initiatives" className="atelier-button">
                      Ver projetos
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 3 — Today */}
          <section className="atelier-card">
            <div className="atelier-card-inner">
              <p className="atelier-section-label">Hoje</p>
              <div className="today-grid">
                <Link href="/decisions" className="today-item">
                  <div className="today-number">{summary.decisions}</div>
                  <div className="today-label">Decisões</div>
                  <div className="today-detail">pendentes</div>
                </Link>
                <Link href="/agenda" className="today-item">
                  <div className="today-number">—</div>
                  <div className="today-label">Reunião</div>
                  <div className="today-detail">sem agenda</div>
                </Link>
                <div className="today-item">
                  <div className="today-number">{captures.length}</div>
                  <div className="today-label">Capturas</div>
                  <div className="today-detail">por organizar</div>
                </div>
                <Link href="/decisions" className="today-item">
                  <div className="today-number">{summary.publications}</div>
                  <div className="today-label">Publicação</div>
                  <div className="today-detail">por aprovar</div>
                </Link>
              </div>
            </div>
          </section>

          {/* 4 — Active work */}
          <section className="atelier-card">
            <div className="atelier-card-inner">
              <p className="atelier-section-label">Trabalho activo</p>
              {initiatives.length === 0 ? (
                <p className="atelier-empty">
                  Ainda não há projetos activos.
                </p>
              ) : (
                <div className="work-grid">
                  {initiatives.map((i) => (
                    <Link
                      key={i.id}
                      href={`/initiatives/${i.slug}`}
                      className="work-card"
                    >
                      <h3>{i.name}</h3>
                      <div className="work-status">
                        {i.progress < 100 ? "Em curso" : "Concluído"} ·{" "}
                        {i.progress}%
                      </div>
                      <div className="work-focus">{i.focus}</div>
                      <p className="work-description">{i.intent}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 5 — Next steps */}
          <section className="atelier-card">
            <div className="atelier-card-inner">
              <p className="atelier-section-label">Próximos passos</p>
              {nextSteps.length === 0 ? (
                <p className="atelier-empty">Nada requer decisão agora.</p>
              ) : (
                <div className="atelier-list">
                  {nextSteps.map((d) => {
                    const ini = iniById.get(d.initiativeId);
                    return (
                      <Link
                        key={d.id}
                        href={`/decisions/${d.id}`}
                        className="atelier-list-row"
                      >
                        <div>
                          <div className="atelier-list-title">{d.title}</div>
                          <div className="atelier-list-subtitle">
                            {ini?.name ?? "—"}
                          </div>
                        </div>
                        <div className="atelier-list-timing">
                          {TIMING[d.priority] ?? d.priority}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right rail */}
        <div className="atelier-right-stack">
          {/* Inbox */}
          <section className="atelier-card rail-card">
            <div className="atelier-card-inner">
              <div className="rail-header">
                <p className="atelier-section-label" style={{ marginBottom: 0 }}>
                  Inbox
                </p>
              </div>
              <div>
                {inbox.map((row) =>
                  row.href ? (
                    <Link key={row.label} href={row.href} className="inbox-row">
                      <span>{row.label}</span>
                      <span className="count">{row.value}</span>
                    </Link>
                  ) : (
                    <div key={row.label} className="inbox-row">
                      <span>{row.label}</span>
                      <span className="count">{row.value}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </section>

          {/* Recent activity */}
          <section className="atelier-card rail-card">
            <div className="atelier-card-inner">
              <div className="rail-header">
                <p className="atelier-section-label" style={{ marginBottom: 0 }}>
                  Atividade recente
                </p>
                <Link href="/activity" className="rail-link">
                  Ver tudo
                </Link>
              </div>
              {activity.length === 0 ? (
                <p className="atelier-empty">Sem atividade recente.</p>
              ) : (
                <div>
                  {activity.map((e) => (
                    <div key={e.id} className="activity-row">
                      <span className="activity-icon">
                        {e.kind.charAt(0).toUpperCase()}
                      </span>
                      <span className="atelier-list-title">{e.title}</span>
                      <span className="activity-meta">{ago(e.at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Quote */}
          <section className="atelier-card">
            <div className="quote-card">
              Clareza não é simplificar. É tornar o essencial inevitável.
              <div className="quote-author">— Inês Gavinho</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
