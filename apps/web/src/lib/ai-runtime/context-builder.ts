import "server-only";
import type { SessionContext, SkillBundle } from "@/lib/ai-runtime/types";

/**
 * Build the system prompt for a session from its ATELIER context: the
 * workspace/project, the work mode, and the selected Skill with its related
 * Principles and Mental Models. The conversation belongs to ATELIER — this
 * context travels with the session regardless of which provider executes it.
 */
export function buildSystemPrompt(
  ctx: SessionContext,
  bundle: SkillBundle | null
): string {
  const lines: string[] = [];

  lines.push(
    "És um agente do ATELIER, o ambiente de trabalho editorial da Inês Gavinho.",
    "O contexto e o conhecimento pertencem ao ATELIER. O provider é apenas o motor de execução.",
    "Responde em português europeu, com rigor e concisão."
  );

  const place = [ctx.workspaceName, ctx.projectName].filter(Boolean).join(" › ");
  if (place) lines.push("", `Contexto: ${place}.`);

  if (!bundle) {
    lines.push("", "Modo: Livre (sem Skill fixa).");
    return lines.join("\n");
  }

  lines.push(
    "",
    `Modo de trabalho: ${bundle.skill.title} (${bundle.skill.id}).`,
    "",
    "## Skill",
    bundle.skill.body.trim()
  );

  if (bundle.principles.length) {
    lines.push("", "## Princípios aplicáveis");
    for (const p of bundle.principles) {
      lines.push(`### ${p.title} (${p.id})`, p.excerpt);
    }
  }

  if (bundle.mentalModels.length) {
    lines.push("", "## Modelos Mentais aplicáveis");
    for (const m of bundle.mentalModels) {
      lines.push(`### ${m.title} (${m.id})`, m.excerpt);
    }
  }

  lines.push(
    "",
    "Aplica a Skill, os Princípios e os Modelos Mentais acima ao responder."
  );

  return lines.join("\n");
}
