/**
 * ATELIER — Constitutional document library
 *
 * The internal viewer (/atelier) reads documents directly from the foundation
 * folder `atelier/` at the repository root. The markdown files are the single
 * source of truth — nothing is duplicated here. Adding a future document means
 * adding one entry to `DOCS` below; the viewer and routes pick it up
 * automatically.
 */

import fs from "node:fs";
import path from "node:path";

export interface DocMeta {
  id?: string;
  title?: string;
  version?: string;
  status?: string;
  owner?: string;
  created?: string;
  updated?: string;
}

export interface DocEntry {
  /** Stable id used in the URL, e.g. "AT-0001". */
  id: string;
  /** Section within the constitutional library, e.g. "Constituição". */
  section: string;
  /** Human label shown in the index. */
  label: string;
  /** Path to the markdown file, relative to the repository root. */
  relativePath: string;
}

export interface LoadedDoc {
  entry: DocEntry;
  meta: DocMeta;
  /** Markdown body with the frontmatter block removed. */
  body: string;
}

/**
 * Registry of constitutional documents. Order defines previous/next.
 * Future documents are added here only — the file stays the source of truth.
 */
export const DOCS: DocEntry[] = [
  {
    id: "AT-0001",
    section: "Constituição",
    label: "Manifesto",
    relativePath: "atelier/010-philosophy/AT-0001-manifesto.md",
  },
  {
    id: "AT-0009",
    section: "Constituição",
    label: "Ontologia",
    relativePath: "atelier/100-ontology/AT-0009-ontology.md",
  },
  {
    id: "AT-0006",
    section: "Constituição",
    label: "Canon",
    relativePath: "atelier/000-canon/AT-0006-canon.md",
  },
  {
    id: "AT-0003",
    section: "Constituição",
    label: "Organisation",
    relativePath: "atelier/030-organisation/AT-0003-organisation.md",
  },
  {
    id: "AT-0002",
    section: "Constituição",
    label: "Operating System",
    relativePath: "atelier/020-operating-system/AT-0002-operating-system.md",
  },
  {
    id: "AT-0005",
    section: "Constituição",
    label: "Agent Architecture",
    relativePath: "atelier/050-agent-architecture/AT-0005-agent-architecture.md",
  },
];

/** Resolve the repository root from the web app's working directory. */
function repoRoot(): string {
  // `next build` runs with cwd = apps/web; the foundation lives two levels up.
  // Walk up until we find the `atelier/` folder so this is resilient to cwd.
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, "atelier"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback to the conventional layout.
  return path.resolve(process.cwd(), "..", "..");
}

/** Minimal frontmatter parser — avoids an extra dependency. */
function parseFrontmatter(raw: string): { meta: DocMeta; body: string } {
  if (!raw.startsWith("---")) return { meta: {}, body: raw };

  const lines = raw.split(/\r?\n/);
  // First line is the opening "---"; find the closing "---".
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) return { meta: {}, body: raw };

  const meta: DocMeta = {};
  const scalarKeys: (keyof DocMeta)[] = [
    "id",
    "title",
    "version",
    "status",
    "owner",
    "created",
    "updated",
  ];
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    const m = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1] as keyof DocMeta;
    const value = m[2].trim();
    if (scalarKeys.includes(key) && value) {
      meta[key] = value;
    }
  }

  const body = lines.slice(end + 1).join("\n").replace(/^\s+/, "");
  return { meta, body };
}

export function getDocs(): DocEntry[] {
  return DOCS;
}

export function getDocEntry(id: string): DocEntry | undefined {
  return DOCS.find((d) => d.id === id);
}

export function loadDoc(id: string): LoadedDoc | undefined {
  const entry = getDocEntry(id);
  if (!entry) return undefined;
  const filePath = path.join(repoRoot(), entry.relativePath);
  const raw = fs.readFileSync(filePath, "utf8");
  const { meta, body } = parseFrontmatter(raw);
  return { entry, meta, body };
}

/** Previous/next neighbours by registry order. */
export function getNeighbours(id: string): {
  prev?: DocEntry;
  next?: DocEntry;
} {
  const i = DOCS.findIndex((d) => d.id === id);
  if (i === -1) return {};
  return {
    prev: i > 0 ? DOCS[i - 1] : undefined,
    next: i < DOCS.length - 1 ? DOCS[i + 1] : undefined,
  };
}
