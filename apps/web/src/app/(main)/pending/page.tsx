import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getRecentPendingItems } from "@/lib/conversation-watch";
import { getWorkspaces } from "@/lib/workspaces";
import PendingInbox, {
  type PendingInboxItem,
} from "@/components/pending/PendingInbox";

export const dynamic = "force-dynamic";

export const metadata = { title: "Pendentes — ATELIER" };

/**
 * Pending Intelligence (Personal Decimin v2). The personal living list of what
 * was asked and not yet received, detected by Conversation Watch across the
 * observed channels and routed to the right Space. RLS-locked tables → read via
 * the service role; clear empty state when it isn't configured.
 */
export default async function PendingPage() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return (
      <div>
        <header className="mb-10">
          <p className="atelier-date">Personal Decimin</p>
          <h1 className="atelier-title">Pendentes</h1>
          <p className="atelier-subtitle">
            O que foi pedido e ainda não foi recebido.
          </p>
        </header>
        <p className="panel p-4 meta">
          Define SUPABASE_SERVICE_ROLE_KEY no ambiente para ver os pendentes (as
          tabelas estão fechadas por RLS ao service role).
        </p>
      </div>
    );
  }

  const [items, workspaces] = await Promise.all([
    getRecentPendingItems(100),
    getWorkspaces(),
  ]);
  const wsName = new Map(workspaces.map((w) => [w.id, w.name] as const));

  const enriched: PendingInboxItem[] = items.map((it) => ({
    id: it.id,
    space: it.workspaceId ? wsName.get(it.workspaceId) ?? "Workspace" : "Pessoal",
    groupTitle: it.groupTitle,
    kind: it.kind,
    description: it.description,
    fromPerson: it.fromPerson,
    dueDate: it.dueDate,
    createdAt: it.createdAt,
  }));

  return (
    <div>
      <header className="mb-10">
        <p className="atelier-date">Personal Decimin</p>
        <h1 className="atelier-title">Pendentes</h1>
        <p className="atelier-subtitle">
          O que foi pedido e ainda não foi recebido — detectado nas conversas
          observadas, agrupado por Space. Nada de listas mantidas à mão.
        </p>
      </header>

      <PendingInbox items={enriched} />
    </div>
  );
}
