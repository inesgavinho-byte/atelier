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
  | "github_read"
  | "search"
  | "code"
  | "writing"
  | "planning"
  | "brainstorming"
  | "summary"
  | "reasoning"
  | "general";

/** Ordered cue lists — first task type with a match wins. */
const RULES: { type: Exclude<TaskType, "general">; cues: string[] }[] = [
  {
    // Reading a repository: a GitHub URL or an explicit README/repo request.
    // Checked first so a github.com URL isn't captured by "search" ("http").
    type: "github_read",
    cues: ["github.com/", "readme", "lê o repo", "ler o repo", "vê o repo"],
  },
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
    type: "brainstorming",
    cues: [
      "brainstorm",
      "ideias",
      "ideas",
      "imagina",
      "e se",
      "what if",
      "possibilidades",
      "possibilities",
      "opções",
      "options",
      "alternativas",
      "criativo",
      "criatividade",
      "creative",
      "explora",
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

/** Cues that a question has multiple angles and benefits from a full debate. */
const COMPLEX_CUES = [
  "prós e contras",
  "pros e contras",
  "vantagens e desvantagens",
  "trade-off",
  "tradeoff",
  "compara",
  "comparar",
  "vale a pena",
  "devo ",
  "deve-se",
  "qual é melhor",
  "qual a melhor",
  "perspectivas",
  "perspetivas",
  "abordagens",
  " ou ", // "X ou Y?"
];

/**
 * Heuristic: is this a complex, multi-angle question worth a full Council
 * debate? Pure rules — used only to *suggest* the debate, never to force it.
 */
export function isComplexQuestion(content: string): boolean {
  const text = content.toLowerCase().trim();
  if (text.length < 40) return false;
  const hasCue = COMPLEX_CUES.some((c) => text.includes(c));
  const isQuestion = text.includes("?");
  return hasCue && (isQuestion || text.length > 140);
}
