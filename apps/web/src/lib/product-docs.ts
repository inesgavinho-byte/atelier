/**
 * ATELIER — Product backlog library
 *
 * The internal viewer (/product) reads backlog documents directly from
 * `atelier/200-product/` at the repository root. The markdown files are the
 * single source of truth — nothing is duplicated. Adding a backlog item means
 * adding one entry to `PRODUCT_DOCS` below; the viewer and routes pick it up
 * automatically.
 *
 * This is the implementation backlog. It is separate from the constitutional
 * documents (see `atelier-docs.ts`), but reuses the same markdown core and
 * renderer.
 */

import {
  type DocMeta,
  loadMarkdown,
  neighboursOf,
} from "@/lib/docs-core";

export type { DocMeta };

/** Backlog levels, in display order. */
export type ProductKind = "Epic" | "Feature" | "Story" | "Task";

export const PRODUCT_KINDS: ProductKind[] = [
  "Epic",
  "Feature",
  "Story",
  "Task",
];

export const PRODUCT_KIND_LABELS: Record<ProductKind, string> = {
  Epic: "Epics",
  Feature: "Features",
  Story: "Stories",
  Task: "Tasks",
};

export interface ProductEntry {
  /** Stable id used in the URL, e.g. "EPIC-001". */
  id: string;
  kind: ProductKind;
  /** Human label shown in the index. */
  label: string;
  /** Path to the markdown file, relative to the repository root. */
  relativePath: string;
}

export interface LoadedProductDoc {
  entry: ProductEntry;
  meta: DocMeta;
  body: string;
}

/**
 * The product backlog. Order defines previous/next. Future items are added
 * here only — the markdown file stays the source of truth.
 */
export const PRODUCT_DOCS: ProductEntry[] = [
  {
    id: "EPIC-001",
    kind: "Epic",
    label: "Mission Control",
    relativePath: "atelier/200-product/epics/EPIC-001-mission-control.md",
  },
];

export function getProductDocs(): ProductEntry[] {
  return PRODUCT_DOCS;
}

export function getProductDocsByKind(kind: ProductKind): ProductEntry[] {
  return PRODUCT_DOCS.filter((d) => d.kind === kind);
}

export function getProductEntry(id: string): ProductEntry | undefined {
  return PRODUCT_DOCS.find((d) => d.id === id);
}

export function loadProductDoc(id: string): LoadedProductDoc | undefined {
  const entry = getProductEntry(id);
  if (!entry) return undefined;
  const { meta, body } = loadMarkdown(entry.relativePath);
  return { entry, meta, body };
}

/** Previous/next neighbours by registry order. */
export function getProductNeighbours(id: string): {
  prev?: ProductEntry;
  next?: ProductEntry;
} {
  return neighboursOf(
    PRODUCT_DOCS,
    PRODUCT_DOCS.findIndex((d) => d.id === id)
  );
}
