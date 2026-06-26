import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

/**
 * Reusable, minimal editorial markdown renderer.
 *
 * Supports headings, lists, horizontal rules, emphasis, links, blockquotes
 * and code blocks. Styling is intentionally quiet — built for reading, not
 * for documentation chrome. Future constitutional documents reuse this
 * component as-is.
 */

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mt-12 font-serif text-4xl leading-tight first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-12 font-serif text-2xl leading-snug">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-8 font-serif text-xl leading-snug">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-6 font-sans text-[15px] font-bold uppercase tracking-editorial text-muted">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="mt-5 text-[16px] leading-[1.75] text-charcoal/90">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mt-5 list-disc space-y-2 pl-6 text-[16px] leading-[1.7] text-charcoal/90 marker:text-beige">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-5 list-decimal space-y-2 pl-6 text-[16px] leading-[1.7] text-charcoal/90 marker:text-beige">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  hr: () => <hr className="my-10 border-0 border-t border-line" />,
  em: ({ children }) => <em className="italic">{children}</em>,
  strong: ({ children }) => (
    <strong className="font-bold text-charcoal">{children}</strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-l-2 border-line-strong pl-5 font-serif text-xl italic leading-relaxed text-charcoal">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-charcoal"
    >
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const isBlock = (className ?? "").includes("language-");
    if (isBlock) {
      return <code className="font-mono text-[13.5px]">{children}</code>;
    }
    return (
      <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[13.5px] text-charcoal">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-6 overflow-x-auto border border-line bg-surface p-4 leading-relaxed">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-[14.5px]">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-line-strong px-3 py-2 text-left font-sans text-[12px] uppercase tracking-editorial text-muted">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-line px-3 py-2 align-top">{children}</td>
  ),
};

export default function Markdown({ content }: { content: string }) {
  return (
    <div className="atelier-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
