import "server-only";
import { gateway } from "@/lib/ai/gateway";
import type { AIMessage, AIRunResponse, ProviderId } from "@/lib/ai/types";
import { buildSystemPrompt } from "@/lib/ai-runtime/context-builder";
import { loadSkillBundle } from "@/lib/ai-runtime/skill-loader";
import { skillIdForMode } from "@/lib/ai-runtime/types";

/**
 * ATELIER — AI Runtime.
 *
 * The single entry point for running an AI session. It assembles the session
 * context (work mode → Skill → Principles + Mental Models from the Knowledge
 * Library), prepends it as a system message, and executes through the AI
 * gateway. The rest of ATELIER calls only `runtime.run()`; no UI calls a
 * provider directly.
 */

export interface RunSessionInput {
  provider: ProviderId;
  model?: string;
  temperature?: number;
  /** Work mode id (binds to a Skill) — or null for Livre. */
  modeId?: string | null;
  /** Explicit skill id override; falls back to the mode's skill. */
  skillId?: string | null;
  workspaceName?: string;
  projectName?: string;
  /** The conversation so far (user/assistant turns). */
  messages: AIMessage[];
}

export interface RunSessionResult extends AIRunResponse {
  /** The skill id that shaped the context (if any). */
  skillId: string | null;
}

export const runtime = {
  /** Skill id a session will use, from explicit id or work mode. */
  resolveSkillId(modeId?: string | null, skillId?: string | null): string | null {
    return skillId ?? skillIdForMode(modeId);
  },

  async run(input: RunSessionInput): Promise<RunSessionResult> {
    const skillId = this.resolveSkillId(input.modeId, input.skillId);
    const bundle = skillId ? loadSkillBundle(skillId) : null;
    const system = buildSystemPrompt(
      {
        workspaceName: input.workspaceName,
        projectName: input.projectName,
        modeId: input.modeId,
      },
      bundle
    );

    const messages: AIMessage[] = [
      { role: "system", content: system },
      ...input.messages,
    ];

    const res = await gateway.run({
      provider: input.provider,
      messages,
      model: input.model,
      temperature: input.temperature,
    });

    return { ...res, skillId: bundle?.skill.id ?? null };
  },
};
