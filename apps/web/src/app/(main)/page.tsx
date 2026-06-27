import Link from "next/link";
import { ago } from "@/components/mission/bits";
import { QuickActions, QuickCaptureList } from "@/components/app/HomeIslands";
import {
  getActivity,
  getArtifacts,
  getInitiatives,
} from "@/lib/mission";
import { getReadings } from "@/lib/readings";
import { owner } from "@/data/mission";

export const dynamic = "force-dynamic";

/**
 * Atelier Home — a daily working launcher. Answers "o que queres fazer hoje?":
 * quick actions, a workspace launcher, what to continue, recent activity and
 * readings, with a calm right rail. All sections degrade to empty states.
 */
export default async function HomePage() {
  const [initiatives, artifacts, activityAll, readings] = await Promise.all([
    getInitiatives(),
    getArtifacts(),
    getActivity(),
    getReadings(),
  ]);

  const iniById = new Map(initiatives.map((i) => [i.id, i]));
  const continueItems = artifacts.slice(0, 5);
  const activity = activityAll.slice(0, 5);
  const recentReadings = readings.slice(0, 5);

  const workspaceHref = (name: string) => {
    const hit = initiatives.find(
      (i) => i.name.toLowerCase() === name.toLowerCase()
    );
    return hit ? `/initiatives/${hit.slug}` : "/workspaces";
  };
  const launchers = ["PAPERS", "DECIMA", "GAVINHO", "NUDO"];

  return (
    <div>
      <header>
        <h1 className="home-title">Bom dia, {owner}.</h1>
        <p className="home-subtitle">O que queres fazer hoje?</p>
      </header>

      <div className="home-grid">
        {/* Main column */}
        <div className="content-stack">
          {/* Quick actions + workspace launcher */}
          <div className="quick-row">
            <QuickActions />
            <div className="card workspace-launcher">
              <p className="card-label" style={{ marginBottom: 0 }}>
                Abrir workspace
              </p>
              <div className="workspace-buttons">
                {launchers.map((name) => (
                  <Link
                    key={name}
                    href={workspaceHref(name)}
                    className="workspace-button"
                  >
                    <span className="workspace-initial">{name.charAt(0)}</span>
                    <span>{name}</span>
                  </Link>
                ))}
                <Link href="/workspaces" className="workspace-button">
                  <span className="workspace-initial">+</span>
                  <span>Novo</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Continue */}
          <section className="card">
            <div className="card-inner">
              <p className="card-label">Continuar a partir de onde ficaste</p>
              {continueItems.length === 0 ? (
                <p className="atelier-empty">
                  Ainda não há trabalho recente. Começa por capturar ou abrir um
                  workspace.
                </p>
              ) : (
                <div className="recent-list">
                  {continueItems.map((a) => {
                    const ini = iniById.get(a.initiativeId);
                    return (
                      <Link
                        key={a.id}
                        href={ini ? `/initiatives/${ini.slug}` : "/workspaces"}
                        className="recent-row"
                      >
                        <span className="recent-thumb">
                          {a.title.charAt(0).toUpperCase()}
                        </span>
                        <span>
                          <span className="recent-title">{a.title}</span>
                          <span className="recent-meta">
                            {ini?.name ?? "—"} · {a.kind}
                          </span>
                        </span>
                        <span className="recent-meta">{ago(a.updatedAt)}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Activity + (placeholder) */}
          <div className="two-col">
            <section className="card">
              <div className="card-inner">
                <p className="card-label">Atividade recente</p>
                {activity.length === 0 ? (
                  <p className="atelier-empty">Sem atividade recente.</p>
                ) : (
                  <div>
                    {activity.map((e) => (
                      <div key={e.id} className="activity-row">
                        <span className="activity-icon">
                          {e.kind.charAt(0).toUpperCase()}
                        </span>
                        <span>
                          <span className="activity-title">{e.title}</span>
                        </span>
                        <span className="activity-meta">{ago(e.at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="card">
              <div className="card-inner">
                <p className="card-label">Decisões e capturas</p>
                <p className="atelier-empty">
                  Usa Capturar para guardar ideias e Decisões para o que requer
                  julgamento.
                </p>
              </div>
            </section>
          </div>

          {/* Recent readings */}
          <section className="card">
            <div className="card-inner">
              <div className="rail-header">
                <p className="card-label" style={{ marginBottom: 0 }}>
                  Leituras recentes
                </p>
                <Link href="/readings" className="rail-link">
                  Ver tudo
                </Link>
              </div>
              {recentReadings.length === 0 ? (
                <p className="atelier-empty">
                  Ainda não guardaste leituras. Cola um link em Leituras.
                </p>
              ) : (
                <div className="readings-row">
                  {recentReadings.map((r) => {
                    const card = (
                      <>
                        <div className="reading-source">
                          <span>{r.tags[0] ?? "Leitura"}</span>
                        </div>
                        <div className="reading-title">
                          {r.title || r.url || "Sem título"}
                        </div>
                        {r.note ? (
                          <div className="reading-author">{r.note}</div>
                        ) : null}
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
                        {card}
                      </a>
                    ) : (
                      <Link key={r.id} href="/readings" className="reading-card">
                        {card}
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
                Sem eventos. Liga um calendário em Ecossistema.
              </p>
            </div>
          </section>

          <section className="rail-card">
            <div className="rail-inner">
              <div className="rail-header">
                <span className="rail-label">Capturas rápidas</span>
              </div>
              <QuickCaptureList />
            </div>
          </section>

          <section className="rail-card quote-card">
            <span className="quote-mark">“</span>
            <p className="quote-text">O tempo é o recurso mais valioso.</p>
            <span className="quote-foot">Princípio Fundador n.º 9</span>
          </section>
        </div>
      </div>
    </div>
  );
}
