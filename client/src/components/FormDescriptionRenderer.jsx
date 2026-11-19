"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Custom remark plugin to preserve intentional single line breaks in Markdown text.
 * Converts single newline characters (\n) inside text nodes into mdast 'break' nodes (<br />).
 */
export function remarkBreaks() {
  return (tree) => {
    function visit(node) {
      if (!node.children || !Array.isArray(node.children)) return;
      const nextChildren = [];
      for (const child of node.children) {
        if (child.type === "text" && typeof child.value === "string" && child.value.includes("\n")) {
          const segments = child.value.split("\n");
          segments.forEach((segment, index) => {
            if (segment) {
              nextChildren.push({ type: "text", value: segment });
            }
            if (index < segments.length - 1) {
              nextChildren.push({ type: "break" });
            }
          });
        } else {
          visit(child);
          nextChildren.push(child);
        }
      }
      node.children = nextChildren;
    }
    visit(tree);
  };
}

/**
 * Checks if a given URL is safe for navigation.
 * Allows http, https, mailto, and relative hashes/paths.
 * Disallows javascript:, data:, vbscript:, file:, etc.
 */
export function isSafeUrl(url) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  return /^(https?:|mailto:|\/|#)/i.test(trimmed);
}

/**
 * Link component that renders safe links with proper attributes and word-wrapping,
 * or an inert non-navigable element if an unsafe protocol is attempted.
 */
function SafeLink({ href, children, node, ...props }) {
  if (!isSafeUrl(href)) {
    return (
      <span className="underline underline-offset-4 text-muted-foreground break-all" title="Link disabled for security">
        {children}
      </span>
    );
  }

  const isExternal = href.startsWith("http://") || href.startsWith("https://");

  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className="font-medium underline underline-offset-4 text-foreground hover:text-primary transition-colors break-all"
      {...props}
    >
      {children}
    </a>
  );
}

const customComponents = {
  // Safe links with break-all to prevent horizontal overflow on narrow viewports
  a: SafeLink,
  // Images are rendered inert to prevent arbitrary image injection / tracking
  img: () => null,
  p: ({ children }) => (
    <p className="leading-6 break-words [overflow-wrap:anywhere] first:mt-0 mt-2">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => (
    <ul className="my-2 list-disc pl-5 space-y-1 text-inherit">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal pl-5 space-y-1 text-inherit">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-6">{children}</li>,
  code: ({ inline, children }) => (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
      {children}
    </code>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-border pl-3 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  h1: ({ children }) => (
    <h2 className="mt-3 text-lg font-semibold text-foreground first:mt-0">{children}</h2>
  ),
  h2: ({ children }) => (
    <h3 className="mt-2 text-base font-semibold text-foreground first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="mt-2 text-sm font-semibold text-foreground first:mt-0">{children}</h4>
  ),
};

/**
 * FormDescriptionRenderer
 * Safe Markdown renderer for campaign and template descriptions.
 * Preserves newlines, autolinks, lists, bold, italic, without raw HTML execution.
 */
export default function FormDescriptionRenderer({ content, fallback = "", className = "" }) {
  if (!content || typeof content !== "string" || !content.trim()) {
    return fallback ? <p className={className}>{fallback}</p> : null;
  }

  return (
    <div className={`space-y-2 text-sm leading-6 break-words [overflow-wrap:anywhere] ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={customComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
