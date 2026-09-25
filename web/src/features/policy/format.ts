export type Block =
  { kind: 'heading'; text: string; id: string } | { kind: 'paragraph'; text: string };

/** "1. What we collect" — a numbered line on its own is a section heading. */
const HEADING = /^(\d+)\.\s+(.{1,80})$/;

/**
 * A policy is written as plain text: paragraphs split by blank lines, sections
 * numbered. This turns it into blocks to render, with anchors for each section.
 */
export function policyBlocks(body: string): Block[] {
  return body
    .split(/\n\s*\n/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(text => {
      const heading = HEADING.exec(text);
      return heading && !text.includes('\n')
        ? { kind: 'heading' as const, text, id: `section-${heading[1]}` }
        : { kind: 'paragraph' as const, text };
    });
}
