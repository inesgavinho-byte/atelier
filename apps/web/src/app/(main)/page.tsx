import Link from "next/link";
import { ago } from "@/components/mission/bits";
import { QuickActions, QuickCaptureList } from "@/components/app/HomeIslands";
import { getActivity, getInitiatives, getRecentWork } from "@/lib/mission";
import { getReadings } from "@/lib/readings";
import { owner } from "@/data/mission";

export const dynamic = "force-dynamic";

/**
 * Atelier Home — the daily working launcher, on real data.
 *
 * Every section reads from its real source and degrades to a calm empty state
 * when there is nothing (or no source, like the calendar). Data is fetched
 * server-side in parallel; each query is isolated so one failure never blanks
 * the page. The interactive cards (search/capture) stay as client islands.
 */
export default async function HomePage() {
  const [recent, activityAll, readingsAll, initiatives] = await Promise.all([
    getRecentWork(3).catch(() => []),
    getActivity().catch(() => []),
    getReadings().catch(() => []),
    getInitiatives().catch(() => []),
  ]);

  const activity = activityAll.slice(0, 5);
  const readings = readingsAll.slice(0, 4);
  const launchers = initiatives.slice(0, 3);

  return (
    <div>
      <h1 className="home-title">Bom dia, {owner}.</h1>
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
                {launchers.map((i) => (
                  <Link
                    key={i.id}
                    href={`/initiatives/${i.slug}`}
                    className="workspace-button"
                  >
                    <span className="workspace-initial">
                      {i.name.charAt(0).toUpperCase()}
                    </span>
                    <span>{i.name}</span>
                  </Link>
                ))}
                <Link href="/workspaces" className="workspace-button">
                  <span className="workspace-initial">＋</span>
                  <span>Novo</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Continue + Activity */}
          <div className="two-col">
            <section className="card">
              <div className="card-inner">
                <p className="card-label">Continuar a partir de onde ficaste</p>
                {recent.length === 0 ? (
                  <p className="atelier-empty">
                    Ainda não há trabalho recente. Captura ou abre um workspace.
                  </p>
                ) : (
                  <div className="recent-list">
                    {recent.map((r) => (
                      <Link key={`${r.type}-${r.id}`} href={r.href} className="recent-row">
                        <span className="recent-thumb">
                          {r.title.charAt(0).toUpperCase()}
                        </span>
                        <span>
                          <span className="recent-title">{r.title}</span>
                          <span className="recent-meta">
                            {[r.context, r.type === "chat" ? "Chat" : "Artefacto"]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                        <span className="recent-meta">{ago(r.updatedAt)} ›</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="card">
              <div className="card-inner">
                <p className="card-label">Atividade Recente</p>
                {activity.length === 0 ? (
                  <p className="atelier-empty">Sem atividade recente.</p>
                ) : (
                  activity.map((e) => (
                    <div key={e.id} className="activity-row">
                      <span className="activity-icon">
                        {e.kind.charAt(0).toUpperCase()}
                      </span>
                      <span>
                        <span className="activity-title">{e.title}</span>
                      </span>
                      <span className="activity-meta">{ago(e.at)}</span>
                    </div>
                  ))
                )}
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
              {readings.length === 0 ? (
                <p className="atelier-empty">Ainda não guardaste leituras.</p>
              ) : (
                <div className="readings-row">
                  {readings.map((r) => {
                    const inner = (
                      <>
                        <span className="reading-source">
                          <b>{r.tags[0] ?? "Leitura"}</b>
                        </span>
                        <span className="reading-title">
                          {r.title || r.url || "Sem título"}
                        </span>
                      </>
                    );
                    return r.url ? (
                      <a
                        key={r.id}
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="reading-card"
                      >
                        {inner}
                      </a>
                    ) : (
                      <Link key={r.id} href="/readings" className="reading-card">
                        {inner}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right rail */}
        <div className="right-rail">
          <section className="rail-card">
            <div className="rail-inner">
              <div className="rail-header">
                <span className="rail-label">Agenda de Hoje</span>
              </div>
              <p className="atelier-empty">
                Liga um calendário em Ecossistema.
              </p>
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
