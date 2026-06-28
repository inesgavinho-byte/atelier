import Link from "next/link";
import { ago } from "@/components/mission/bits";
import { HomeQuickActions } from "@/components/app/HomeIslands";
import Panel from "@/components/shell/Panel";
import PanelHeader from "@/components/shell/PanelHeader";
import ActivityDot from "@/components/shell/ActivityDot";
import {
  getActivity,
  getInitiatives,
  getPendingDecisions,
  getRecentWork,
} from "@/lib/mission";
import { getReadings } from "@/lib/readings";
import { getAgenda } from "@/lib/agenda";
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
  const [recent, activityAll, , , agenda, pending] = await Promise.all([
    getRecentWork(3).catch(() => []),
    getActivity().catch(() => []),
    getReadings().catch(() => []),
    getInitiatives().catch(() => []),
    getAgenda().catch(() => ({ connected: false, events: [] as const })),
    getPendingDecisions().catch(() => []),
  ]);

  const activity = activityAll.slice(0, 5);
  const pendingTop = pending.slice(0, 4);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia," : hour < 20 ? "Boa tarde," : "Boa noite,";
  const dateLabel = new Intl.DateTimeFormat("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="home">
      <h1 className="home-greeting">
        {greeting} {owner}.
      </h1>
      <p className="home-sub">
        {dateLabel} · {pending.length} decisões pendentes
      </p>

      <div className="home-quick-row">
        <HomeQuickActions />
        <Link href="/workspaces" className="home-quick-card">
          <span className="home-quick-glyph" aria-hidden>
            ⊞
          </span>
          <span className="home-quick-title">Novo workspace</span>
          <span className="home-quick-copy">Cria um espaço de trabalho.</span>
        </Link>
      </div>

      <div className="home-cols">
        <Panel>
          <PanelHeader title="Continuar" />
          {recent.length === 0 ? (
            <p className="home-empty">Ainda não há trabalho recente.</p>
          ) : (
            <div className="home-list">
              {recent.map((r) => (
                <Link
                  key={`${r.type}-${r.id}`}
                  href={r.href}
                  className="home-list-row"
                >
                  <span>
                    <span className="home-list-title">{r.title}</span>
                    <span className="home-list-meta">
                      {[r.context, r.type === "chat" ? "Chat" : "Artefacto"]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="home-list-timing">{ago(r.updatedAt)}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Decisões pendentes"
            action={{ label: "Ver tudo", href: "/decisions" }}
          />
          {pendingTop.length === 0 ? (
            <p className="home-empty">Sem decisões pendentes.</p>
          ) : (
            <div className="home-list">
              {pendingTop.map((d) => (
                <div key={d.id} className="home-decision">
                  <div className="home-decision-title">{d.title}</div>
                  <div className="home-decision-actions">
                    <Link
                      href={`/decisions/${d.id}`}
                      className="btn-approve btn-sm"
                    >
                      Aprovar
                    </Link>
                    <Link
                      href={`/decisions/${d.id}`}
                      className="btn-quiet btn-sm"
                    >
                      Rever
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="home-cols">
        <Panel>
          <PanelHeader title="Atividade recente" />
          {activity.length === 0 ? (
            <p className="home-empty">Sem atividade recente.</p>
          ) : (
            <div className="home-list">
              {activity.map((e) => (
                <div key={e.id} className="home-activity-row">
                  <ActivityDot kind={e.kind} />
                  <span className="home-activity-title">{e.title}</span>
                  <span className="home-activity-meta">{ago(e.at)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Agenda de hoje" />
          {!agenda.connected ? (
            <p className="home-empty">Liga um calendário em Ecossistema.</p>
          ) : agenda.events.length === 0 ? (
            <p className="home-empty">Sem eventos hoje.</p>
          ) : (
            <div className="home-list">
              {agenda.events.map((e) => (
                <div key={e.id} className="home-agenda-row">
                  <span className="home-agenda-time">{e.timeLabel}</span>
                  <span>
                    <span className="home-agenda-title">{e.title}</span>
                    {e.location ? (
                      <span className="home-agenda-loc">{e.location}</span>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
