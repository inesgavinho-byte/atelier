import ImportClient from "@/components/import/ImportClient";
import { getInitiatives } from "@/lib/mission";

export const dynamic = "force-dynamic";

/**
 * Importação em batch — upload an export from Claude.ai / ChatGPT / Perplexity,
 * preview the conversations, map each to a workspace (or auto-detect), and
 * import. All parsing/extraction happens server-side.
 */
export default async function ImportPage() {
  const workspaces = await getInitiatives();
  const options = workspaces.map((w) => ({ id: w.id, name: w.name }));

  return (
    <div className="import-page">
      <header className="mb-8">
        <p className="atelier-date">Ferramentas</p>
        <h1 className="atelier-title">Importação de Chats</h1>
        <p className="atelier-subtitle">
          Importa conversas do Claude.ai, ChatGPT e Perplexity em batch. O
          sistema extrai o contexto e distribui pelos workspaces.
        </p>
      </header>

      <ImportClient workspaces={options} />
    </div>
  );
}
