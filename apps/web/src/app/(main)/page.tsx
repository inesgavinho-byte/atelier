import Link from "next/link";
import { QuickActions, QuickCaptureList } from "@/components/app/HomeIslands";

export const dynamic = "force-dynamic";

/**
 * Atelier Home — faithful structure of the approved mockup.
 *
 * Phase 1: the structure is implemented exactly as designed, with illustrative
 * placeholder content. Real data is wired in a follow-up (Phase 2): the
 * "Continuar", "Atividade", "Leituras" and "Agenda" sections will read from
 * their real sources, keeping graceful empty states where no source exists.
 */
export default function HomePage() {
  return (
    <div>
      <h1 className="home-title">Bom dia, Inês.</h1>
      <p className="home-subtitle">O que queres fazer hoje?</p>

      <div className="home-grid">
        {/* Main column */}
        <div className="content-stack">
          {/* Quick actions + workspace launcher */}
          <div className="quick-row">
            <QuickActions />
            <div className="card workspace-launcher">
              <p className="card-label" style={{ marginBottom: 0 }}>
                Abrir Workspace
              </p>
              <div className="workspace-buttons">
                {[
                  { i: "P", n: "PAPERS" },
                  { i: "D", n: "DECIMA" },
                  { i: "G", n: "GAVINHO" },
                  { i: "N", n: "NUDO" },
                  { i: "＋", n: "Novo" },
                ].map((w) => (
                  <Link key={w.n} href="/workspaces" className="workspace-button">
                    <span className="workspace-initial">{w.i}</span>
                    <span>{w.n}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Continue + Activity */}
          <div className="two-col">
            <section className="card">
              <div className="card-inner">
                <p className="card-label">Continuar a partir de onde ficaste</p>
                <div className="recent-list">
                  {[
                    { t: "006", dark: true, title: "Issue 006 — O futuro do trabalho", meta: "PAPERS · Chat", when: "2min atrás" },
                    { t: "D", dark: false, title: "Manifesto ATELIER", meta: "PAPERS · Documento", when: "1h atrás" },
                    { t: "D", dark: false, title: "Reunião Estratégica — Notas", meta: "DECIMA · Nota", when: "3h atrás" },
                    { t: "IMG", dark: false, title: "Casa em Ourique — Decisões", meta: "GAVINHO · Decisões", when: "Ontem" },
                  ].map((r, idx) => (
                    <Link key={idx} href="/workspaces" className="recent-row">
                      <span className={`recent-thumb${r.dark ? " dark" : ""}`}>
                        {r.t}
                      </span>
                      <span>
                        <span className="recent-title">{r.title}</span>
                        <span className="recent-meta">{r.meta}</span>
                      </span>
                      <span className="recent-meta">{r.when} ›</span>
                    </Link>
                  ))}
                </div>
              </div>
            </section>

            <section className="card">
              <div className="card-inner">
                <p className="card-label">Atividade Recente</p>
                {[
                  { ic: "▤", t: "Nova leitura guardada", m: "The Design of Everyday Things", w: "7min" },
                  { ic: "✓", t: "Decisão tomada", m: "Fornecedores — Esquadrias", w: "2h" },
                  { ic: "▧", t: "Documento atualizado", m: "Brief — Issue 006", w: "Ontem" },
                ].map((a, idx) => (
                  <div key={idx} className="activity-row">
                    <span className="activity-icon">{a.ic}</span>
                    <span>
                      <span className="activity-title">{a.t}</span>
                      <span className="recent-meta">{a.m}</span>
                    </span>
                    <span className="activity-meta">{a.w}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Recent readings */}
          <section className="card">
            <div className="card-inner">
              <div className="rail-header">
                <p className="card-label" style={{ marginBottom: 0 }}>
                  Leituras Recentes
                </p>
                <Link href="/readings" className="rail-link">
                  Ver tudo
                </Link>
              </div>
              <div className="readings-row">
                {[
                  { s: "W", time: "12min", title: "The creative act: A way of being", a: "Rick Rubin" },
                  { s: "HBR", time: "8min", title: "The second-order thinker", a: "Harvard Business Review" },
                  { s: "fs", time: "15min", title: "How to build systems that learn", a: "Farnam Street" },
                  { s: "oe", time: "10min", title: "The cost of not deciding", a: "Observer Effect" },
                ].map((r, idx) => (
                  <Link key={idx} href="/readings" className="reading-card">
                    <span className="reading-source">
                      <b>{r.s}</b>
                      <span>{r.time}</span>
                    </span>
                    <span className="reading-title">{r.title}</span>
                    <span className="reading-author">{r.a}</span>
                  </Link>
                ))}
                <Link href="/readings" className="reading-card">
                  <span className="reading-title">Ver todas as leituras →</span>
                </Link>
              </div>
            </div>
          </section>
        </div>

        {/* Right rail */}
        <div className="right-rail">
          <section className="rail-card">
            <div className="rail-inner">
              <div className="rail-header">
                <span className="rail-label">Agenda de Hoje</span>
                <Link href="/agenda" className="rail-link">
                  Ver agenda
                </Link>
              </div>
              {[
                { time: "10:00", title: "Reunião de Projeto", meta: "PAPERS — Issue 006" },
                { time: "14:30", title: "Call com Equipa", meta: "DECIMA" },
                { time: "16:00", title: "Revisão de Decisões", meta: "GAVINHO" },
              ].map((e, idx) => (
                <div key={idx} className="agenda-row">
                  <span className="agenda-time">{e.time}</span>
                  <span className="agenda-dot" />
                  <span>
                    <span className="agenda-title">{e.title}</span>
                    <span className="agenda-meta">{e.meta}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rail-card">
            <div className="rail-inner">
              <div className="rail-header">
                <span className="rail-label">Capturas Rápidas</span>
              </div>
              <QuickCaptureList />
            </div>
          </section>

          <section className="rail-card quote-card">
            <span className="quote-mark">“</span>
            <p className="quote-text">O tempo é o recurso mais valioso.</p>
            <span className="quote-foot">Princípio Fundador N.º 9</span>
          </section>
        </div>
      </div>
    </div>
  );
}
