import "server-only";
import { gateway } from "@/lib/ai/gateway";
import type { AIMessage, AIRunResponse, ProviderId } from "@/lib/ai/types";
import { buildSystemPrompt } from "@/lib/ai-runtime/context-builder";
import { loadSkillBundle } from "@/lib/ai-runtime/skill-loader";
import { skillIdForMode } from "@/lib/ai-runtime/types";
import { classifyMessage, type TaskType } from "@/lib/ai-runtime/classifier";
import {
  ROUTING_TABLE,
  routeToGatewayProvider,
} from "@/lib/ai-runtime/routing-table";

/** Fallback preference order when the routed provider isn't available. */
const FALLBACK_ORDER: ProviderId[] = [
  "claude",
  "openai",
  "perplexity",
  "groq",
  "deepseek",
];

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
  /** Manual provider override. Omit to let the Council route by task type. */
  provider?: ProviderId;
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
  /** The task type the message was classified as. */
  taskType: TaskType;
  /** Why the routed model was chosen (from the routing table). */
  routeReason: string;
}

/** The resolved execution plan for a session, before the gateway runs it. */
export interface SessionPlan {
  provider: ProviderId;
  model: string | undefined;
  temperature: number | undefined;
  /** Full message list (system prompt prepended). */
  messages: AIMessage[];
  taskType: TaskType;
  routeReason: string;
  skillId: string | null;
}

export const runtime = {
  /** Skill id a session will use, from explicit id or work mode. */
  resolveSkillId(modeId?: string | null, skillId?: string | null): string | null {
    return skillId ?? skillIdForMode(modeId);
  },

  /**
   * Resolve the provider, model and full message list for an input — the same
   * routing run() uses, but without executing. Lets the streaming path share
   * exactly one routing implementation with the blocking path.
   */
  plan(input: RunSessionInput): SessionPlan {
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

    // Classify the latest user turn (pure rules) and look up its ideal route.
    const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
    const taskType = classifyMessage(lastUser?.content ?? "");
    const route = ROUTING_TABLE[taskType];

    let provider: ProviderId;
    let model: string | undefined;
    if (input.provider) {
      // Manual override — honour it exactly; routing metadata still computed.
      provider = input.provider;
      model = input.model;
    } else {
      const routedId = routeToGatewayProvider(route.provider);
      if (routedId && gateway.get(routedId)?.available()) {
        provider = routedId;
        model = input.model ?? route.model;
      } else {
        // Fallback: first available provider in preference order. Don't carry
        // the routed model to a different provider — let its default apply.
        const avail = new Map(
          gateway.availability().map((a) => [a.id, a.available])
        );
        provider = FALLBACK_ORDER.find((id) => avail.get(id)) ?? "claude";
        model = input.model;
      }
    }

    return {
      provider,
      model,
      temperature: input.temperature,
      messages,
      taskType,
      routeReason: route.reason,
      skillId: bundle?.skill.id ?? null,
    };
  },

  async run(input: RunSessionInput): Promise<RunSessionResult> {
    const plan = this.plan(input);
    const res = await gateway.run({
      provider: plan.provider,
      messages: plan.messages,
      model: plan.model,
      temperature: plan.temperature,
    });
    return {
      ...res,
      skillId: plan.skillId,
      taskType: plan.taskType,
      routeReason: plan.routeReason,
    };
  },
};
