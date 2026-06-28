import "server-only";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

/**
 * ATELIER — server-side article extraction for the Leituras reader.
 *
 * Fetches a URL, reads its Open Graph metadata, and runs Mozilla Readability to
 * produce clean reader-mode HTML. The HTML is sanitised here (no scripts, no
 * iframes, no inline event handlers) so what we store and later render is safe
 * to inject with dangerouslySetInnerHTML. Everything runs on the server; the
 * browser never fetches the third-party page.
 */

export interface ReadingMetadata {
  title?: string;
  excerpt?: string;
  thumbnail?: string;
  author?: string;
  siteName?: string;
}

export interface ReadingExtraction extends ReadingMetadata {
  /** Sanitised reader-mode HTML, or undefined when extraction failed. */
  content?: string;
  textContent?: string;
  length?: number;
  readTimeMinutes?: number;
}

const WORDS_PER_MINUTE = 200;
const UA =
  "Mozilla/5.0 (compatible; AtelierReader/1.0; +https://atelier.local)";

/** Reading time in whole minutes from a word count (min 1 when there is text). */
export function readingTimeMinutes(text: string | undefined | null): number {
  const words = (text ?? "").trim().split(/\s+/).filter(Boolean).length;
  if (!words) return 0;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** The bare domain of a URL (no www.), for use as a fallback site name. */
export function domainOf(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

async function fetchHtml(url: string, ms = 15000): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (type && !/html/i.test(type)) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function meta(doc: Document, names: string[]): string | undefined {
  for (const n of names) {
    const el =
      doc.querySelector(`meta[property="${n}"]`) ??
      doc.querySelector(`meta[name="${n}"]`);
    const v = el?.getAttribute("content")?.trim();
    if (v) return v;
  }
  return undefined;
}

/** Read OG / standard metadata from a parsed document. */
function readMetadata(doc: Document, baseUrl: string): ReadingMetadata {
  const title =
    meta(doc, ["og:title", "twitter:title"]) ??
    (doc.querySelector("title")?.textContent?.trim() || undefined);
  const excerpt = meta(doc, ["og:description", "twitter:description", "description"]);
  let thumbnail = meta(doc, ["og:image", "twitter:image", "twitter:image:src"]);
  if (thumbnail) {
    try {
      thumbnail = new URL(thumbnail, baseUrl).toString();
    } catch {
      /* keep raw value */
    }
  }
  const author = meta(doc, ["article:author", "author"]);
  const siteName = meta(doc, ["og:site_name"]) ?? domainOf(baseUrl);
  return { title, excerpt, thumbnail, author, siteName };
}

const DROP_TAGS = [
  "script",
  "iframe",
  "object",
  "embed",
  "style",
  "link",
  "meta",
  "noscript",
  "form",
  "input",
  "button",
];

/** Strip scripts, iframes, inline handlers and javascript: URLs from a fragment. */
function sanitizeHtml(html: string): string {
  const dom = new JSDOM(`<body>${html}</body>`);
  const { document } = dom.window;

  document.querySelectorAll(DROP_TAGS.join(",")).forEach((el) => el.remove());

  document.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
      } else if (
        (name === "href" || name === "src") &&
        value.startsWith("javascript:")
      ) {
        el.removeAttribute(attr.name);
      } else if (name === "srcdoc") {
        el.removeAttribute(attr.name);
      }
    }
  });

  return document.body.innerHTML;
}

/**
 * Extract clean reader content + metadata for a URL. Never throws: on any
 * failure it returns whatever metadata it managed to read (possibly just the
 * domain), so the caller can still save a usable reading.
 */
export async function extractReading(url: string): Promise<ReadingExtraction> {
  const fallback: ReadingExtraction = { siteName: domainOf(url) };

  const html = await fetchHtml(url);
  if (!html) return fallback;

  let dom: JSDOM;
  try {
    dom = new JSDOM(html, { url });
  } catch {
    return fallback;
  }

  const metadata = readMetadata(dom.window.document, url);

  let article: ReturnType<Readability["parse"]> = null;
  try {
    // Readability mutates the document, so metadata is read first (above).
    article = new Readability(dom.window.document).parse();
  } catch {
    article = null;
  }

  if (!article || !article.content) {
    return { ...fallback, ...metadata };
  }

  const content = sanitizeHtml(article.content);
  const textContent = article.textContent ?? "";

  return {
    title: metadata.title ?? article.title ?? undefined,
    excerpt: metadata.excerpt ?? article.excerpt ?? undefined,
    thumbnail: metadata.thumbnail,
    author: metadata.author ?? article.byline ?? undefined,
    siteName: article.siteName ?? metadata.siteName,
    content,
    textContent,
    length: article.length ?? textContent.length,
    readTimeMinutes: readingTimeMinutes(textContent),
  };
}
