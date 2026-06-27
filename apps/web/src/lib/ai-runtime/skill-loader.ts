import "server-only";
import { loadKnowledge } from "@/lib/knowledge-docs";
import type { KnowledgeExcerpt, SkillBundle } from "@/lib/ai-runtime/types";

/**
 * Load a Skill and its declared dependencies from the Knowledge Library.
 *
 * The Skill markdown is the operating manual for a work mode; its frontmatter
 * declares the related Principles and Mental Models. We load those files and
 * keep a bounded excerpt of each so the runtime context stays useful without
 * bloating the prompt. Markdown files remain the single source of truth.
 */

/** First meaningful paragraphs of a body, with the leading H1 removed. */
function excerptOf(body: string, max = 600): string {
  const withoutTitle = body.replace(/^#\s+.*$/m, "").trim();
  const text = withoutTitle.split(/\n#{1,2}\s/)[0].trim() || withoutTitle;
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

function loadExcerpt(
  category: "principles" | "mental-models",
  id: string
): KnowledgeExcerpt | null {
  const doc = loadKnowledge(category, id);
  if (!doc) return null;
  return {
    id,
    title: doc.meta.title ?? id,
    excerpt: excerptOf(doc.body),
  };
}

/** Build the full Skill bundle (skill body + related principles + models). */
export function loadSkillBundle(skillId: string): SkillBundle | null {
  const skill = loadKnowledge("skills", skillId);
  if (!skill) return null;

  const dep = skill.meta.dependsOn;
  const principles = (dep?.principles ?? [])
    .map((id) => loadExcerpt("principles", id))
    .filter((x): x is KnowledgeExcerpt => x !== null);
  const mentalModels = (dep?.mentalModels ?? [])
    .map((id) => loadExcerpt("mental-models", id))
    .filter((x): x is KnowledgeExcerpt => x !== null);

  return {
    skill: {
      id: skillId,
      title: skill.meta.title ?? skillId,
      body: skill.body,
    },
    principles,
    mentalModels,
  };
}
