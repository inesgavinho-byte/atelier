/**
 * ATELIER — Constitutional document library
 *
 * The internal viewer (/atelier) reads documents directly from the foundation
 * folder `atelier/` at the repository root. The markdown files are the single
 * source of truth — nothing is duplicated here. Adding a future document means
 * adding one entry to `DOCS` below; the viewer and routes pick it up
 * automatically.
 */

import {
  type DocMeta,
  loadMarkdown,
  neighboursOf,
} from "@/lib/docs-core";

export type { DocMeta };

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
  {
    id: "AT-0004",
    section: "Constituição",
    label: "Product Specification",
    relativePath: "atelier/040-product/AT-0004-product-specification.md",
  },
  {
    id: "AT-0008",
    section: "Constituição",
    label: "Roadmap",
    relativePath: "atelier/080-roadmap/AT-0008-roadmap.md",
  },
];

export function getDocs(): DocEntry[] {
  return DOCS;
}

export function getDocEntry(id: string): DocEntry | undefined {
  return DOCS.find((d) => d.id === id);
}

export function loadDoc(id: string): LoadedDoc | undefined {
  const entry = getDocEntry(id);
  if (!entry) return undefined;
  const { meta, body } = loadMarkdown(entry.relativePath);
  return { entry, meta, body };
}

/** Previous/next neighbours by registry order. */
export function getNeighbours(id: string): {
  prev?: DocEntry;
  next?: DocEntry;
} {
  return neighboursOf(
    DOCS,
    DOCS.findIndex((d) => d.id === id)
  );
}
