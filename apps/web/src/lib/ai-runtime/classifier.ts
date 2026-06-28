/**
 * ATELIER — Task classifier.
 *
 * Pure-rules classification of a user message into a task type. No LLM call,
 * instant and deterministic: a case-insensitive substring match over a set of
 * Portuguese + English cues, checked in a fixed priority order (first match
 * wins). The result feeds the routing table so the Council can pick the best
 * provider/model for the task without ever asking a model to classify.
 */

export type TaskType =
  | "search"
  | "code"
  | "writing"
  | "planning"
  | "summary"
  | "reasoning"
  | "general";

/** Ordered cue lists — first task type with a match wins. */
const RULES: { type: Exclude<TaskType, "general">; cues: string[] }[] = [
  {
    type: "search",
    cues: [
      "pesquis",
      "procur",
      "o que é",
      "o que são",
      "encontr",
      "http",
      "www",
      "search",
      "find",
      "what is",
    ],
  },
  {
    type: "code",
    cues: [
      "código",
      "code",
      "função",
      "function",
      "bug",
      "erro",
      "error",
      "script",
      "typescript",
      "javascript",
      "python",
      "debug",
      "implementa",
      "cria um",
      "escreve um",
    ],
  },
  {
    type: "writing",
    cues: [
      "escreve",
      "redige",
      "artigo",
      "texto",
      "email",
      "documento",
      "write",
      "draft",
      "post",
      "newsletter",
    ],
  },
  {
    type: "planning",
    cues: [
      "planea",
      "estratégia",
      "decisão",
      "roadmap",
      "próximos passos",
      "plan",
      "strategy",
      "next steps",
    ],
  },
  {
    type: "summary",
    cues: ["resum", "sintetiz", "extrai", "bullet", "summar", "extract", "tldr"],
  },
  {
    type: "reasoning",
    cues: [
      "analis",
      "compar",
      "avali",
      "recomend",
      "porquê",
      "analyz",
      "compare",
      "evaluate",
      "recommend",
      "why",
    ],
  },
];

/** Classify a message into a task type (pure rules, no network). */
export function classifyMessage(content: string): TaskType {
  const text = content.toLowerCase();
  for (const rule of RULES) {
    if (rule.cues.some((cue) => text.includes(cue))) return rule.type;
  }
  return "general";
}
