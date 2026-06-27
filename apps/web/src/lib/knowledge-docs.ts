/**
 * ATELIER — Knowledge Library
 *
 * The internal viewer (/knowledge) reads documents directly from the
 * foundation folder `atelier/300-knowledge/` at the repository root. The
 * markdown files are the single source of truth — nothing is duplicated here.
 *
 * The registry is built automatically by scanning the three layer folders, so
 * adding a new Principle, Mental Model or Skill needs no code change: drop the
 * markdown file in the right folder and the viewer and routes pick it up.
 */

import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "@/lib/docs-core";

/** URL-facing category slugs. */
export type KnowledgeCategory = "principles" | "mental-models" | "skills";

export interface KnowledgeMeta {
  id?: string;
  title?: string;
  version?: string;
  status?: string;
  owner?: string;
  created?: string;
  updated?: string;
  category?: string;
  /** Normalised to a list even when the frontmatter used a scalar. */
  source?: string[];
  /** Structured dependencies declared in the frontmatter. */
  dependsOn?: {
    principles: string[];
    mentalModels: string[];
    /** Flat references that are neither (e.g. constitutional AT-* docs). */
    refs: string[];
  };
}

export interface KnowledgeEntry {
  /** Stable id from frontmatter, e.g. "PRINCIPLE-0001". */
  id: string;
  category: KnowledgeCategory;
  title: string;
  meta: KnowledgeMeta;
  /** Path to the markdown file, relative to the repository root. */
  relativePath: string;
}

export interface LoadedKnowledge {
  entry: KnowledgeEntry;
  meta: KnowledgeMeta;
  body: string;
}

interface LayerConfig {
  category: KnowledgeCategory;
  label: string;
  /** Folder relative to the repository root. */
  dir: string;
}

const KNOWLEDGE_ROOT = "atelier/300-knowledge";

const LAYERS: LayerConfig[] = [
  {
    category: "principles",
    label: "Princípios",
    dir: `${KNOWLEDGE_ROOT}/020-principles`,
  },
  {
    category: "mental-models",
    label: "Modelos Mentais",
    dir: `${KNOWLEDGE_ROOT}/030-mental-models`,
  },
  {
    category: "skills",
    label: "Skills",
    dir: `${KNOWLEDGE_ROOT}/040-skills`,
  },
];

export const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  principles: "Princípios",
  "mental-models": "Modelos Mentais",
  skills: "Skills",
};

/* ------------------------------------------------------------------ */
/* Frontmatter parsing                                                 */
/* ------------------------------------------------------------------ */

const SCALAR_KEYS = new Set([
  "id",
  "title",
  "version",
  "status",
  "owner",
  "created",
  "updated",
  "category",
]);

function bulletItem(trimmed: string): string | null {
  if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
    return trimmed.slice(2).trim();
  }
  return null;
}

/**
 * Knowledge-layer frontmatter parser.
 *
 * Handles the three shapes that appear across the library without pulling in a
 * YAML dependency:
 *   - scalars            (`source: Inês Gavinho`, `category: Mental Model`)
 *   - list values        (`source:` followed by `* item` bullets)
 *   - flat depends_on     (`depends_on:` followed by `* AT-0001` bullets)
 *   - nested depends_on   (`depends_on:` → `principles:` / `mental_models:`)
 */
export function parseKnowledgeFrontmatter(raw: string): {
  meta: KnowledgeMeta;
  body: string;
} {
  if (!raw.startsWith("---")) return { meta: {}, body: raw };

  const lines = raw.split(/\r?\n/);
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) return { meta: {}, body: raw };

  const meta: KnowledgeMeta = {};
  const source: string[] = [];
  const dependsOn = { principles: [] as string[], mentalModels: [] as string[], refs: [] as string[] };
  let hasSource = false;
  let hasDepends = false;

  // Tracks which collection subsequent bullet lines belong to.
  type ListTarget = "source" | "depends.principles" | "depends.mentalModels" | "depends.refs" | null;
  let target: ListTarget = null;

  for (let i = 1; i < end; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === "") continue;

    // Bullet line — append to the active list.
    const item = bulletItem(trimmed);
    if (item !== null) {
      switch (target) {
        case "source":
          hasSource = true;
          source.push(item);
          break;
        case "depends.principles":
          hasDepends = true;
          dependsOn.principles.push(item);
          break;
        case "depends.mentalModels":
          hasDepends = true;
          dependsOn.mentalModels.push(item);
          break;
        case "depends.refs":
          hasDepends = true;
          dependsOn.refs.push(item);
          break;
      }
      continue;
    }

    // key: value line.
    const m = trimmed.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    const value = m[2].trim();

    if (key === "principles") {
      target = "depends.principles";
      continue;
    }
    if (key === "mental_models") {
      target = "depends.mentalModels";
      continue;
    }
    if (key === "depends_on") {
      hasDepends = true;
      // Either a flat list of refs follows, or nested principles/mental_models.
      target = "depends.refs";
      continue;
    }
    if (key === "source") {
      if (value) {
        hasSource = true;
        source.push(value);
        target = null;
      } else {
        target = "source";
      }
      continue;
    }
    if (SCALAR_KEYS.has(key)) {
      if (value) (meta as Record<string, unknown>)[key] = value;
      target = null;
      continue;
    }
    // Unknown key — stop any active list.
    target = null;
  }

  if (hasSource && source.length) meta.source = source;
  if (hasDepends) meta.dependsOn = dependsOn;

  const body = lines.slice(end + 1).join("\n").replace(/^\s+/, "");
  return { meta, body };
}

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

function walkMarkdown(absDir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(absDir)) return out;
  for (const name of fs.readdirSync(absDir)) {
    const abs = path.join(absDir, name);
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      out.push(...walkMarkdown(abs));
    } else if (name.endsWith(".md")) {
      out.push(abs);
    }
  }
  return out;
}

let cachedRegistry: KnowledgeEntry[] | null = null;

/** Build (and memoise) the registry by scanning the three layer folders. */
export function getKnowledgeRegistry(): KnowledgeEntry[] {
  if (cachedRegistry) return cachedRegistry;

  const root = repoRoot();
  const entries: KnowledgeEntry[] = [];

  for (const layer of LAYERS) {
    const absDir = path.join(root, layer.dir);
    for (const abs of walkMarkdown(absDir)) {
      const raw = fs.readFileSync(abs, "utf8");
      const { meta } = parseKnowledgeFrontmatter(raw);
      const id = meta.id ?? path.basename(abs, ".md");
      const relativePath = path.relative(root, abs).split(path.sep).join("/");
      entries.push({
        id,
        category: layer.category,
        title: meta.title ?? id,
        meta,
        relativePath,
      });
    }
  }

  // Stable order: by category (as declared) then by id.
  const order: Record<KnowledgeCategory, number> = {
    principles: 0,
    "mental-models": 1,
    skills: 2,
  };
  entries.sort((a, b) => {
    if (order[a.category] !== order[b.category]) {
      return order[a.category] - order[b.category];
    }
    return a.id.localeCompare(b.id, undefined, { numeric: true });
  });

  cachedRegistry = entries;
  return entries;
}

export function getKnowledgeByCategory(
  category: KnowledgeCategory
): KnowledgeEntry[] {
  return getKnowledgeRegistry().filter((e) => e.category === category);
}

export function getKnowledgeEntry(
  category: KnowledgeCategory,
  id: string
): KnowledgeEntry | undefined {
  return getKnowledgeRegistry().find(
    (e) => e.category === category && e.id === id
  );
}

export function loadKnowledge(
  category: KnowledgeCategory,
  id: string
): LoadedKnowledge | undefined {
  const entry = getKnowledgeEntry(category, id);
  if (!entry) return undefined;
  const raw = fs.readFileSync(path.join(repoRoot(), entry.relativePath), "utf8");
  const { meta, body } = parseKnowledgeFrontmatter(raw);
  return { entry, meta, body };
}

/* ------------------------------------------------------------------ */
/* Relationships                                                       */
/* ------------------------------------------------------------------ */

export interface RelatedLink {
  id: string;
  title: string;
  /** Internal href, or undefined when the target is not in the library. */
  href?: string;
}

/** Resolve an id to a clickable link within ATELIER, if it is known. */
export function resolveLink(id: string): RelatedLink {
  const reg = getKnowledgeRegistry();
  const hit = reg.find((e) => e.id === id);
  if (hit) {
    return { id, title: hit.title, href: `/knowledge/${hit.category}/${hit.id}` };
  }
  // Constitutional documents (AT-*) live in the /atelier viewer.
  if (/^AT-\d+/i.test(id)) {
    return { id, title: id, href: `/atelier/${id}` };
  }
  return { id, title: id };
}

/** Build resolved relationship lists for a document's declared dependencies. */
export function relationshipsFor(entry: KnowledgeEntry): {
  principles: RelatedLink[];
  mentalModels: RelatedLink[];
  refs: RelatedLink[];
} {
  const dep = entry.meta.dependsOn;
  return {
    principles: (dep?.principles ?? []).map(resolveLink),
    mentalModels: (dep?.mentalModels ?? []).map(resolveLink),
    refs: (dep?.refs ?? []).map(resolveLink),
  };
}
