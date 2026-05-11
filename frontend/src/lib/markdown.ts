/**
 * Tiny inline markdown renderer for LLM output. Handles only the patterns
 * Claude actually produces in this app:
 *   - **bold** + __bold__ → <strong>
 *   - `inline code` → <code>
 *
 * Everything else (headings, lists, links) passes through unchanged. Line
 * breaks are preserved by the consuming CSS (`white-space: pre-wrap`).
 *
 * Safety: HTML is escaped FIRST so user-supplied content (echoed back by
 * Claude) can't smuggle in tags. Only the bold/code substitutions add HTML
 * after the escape pass, so the output is safe for v-html.
 */
export function renderInline(text: string): string {
  if (!text) return '';
  // 1. Escape HTML special chars.
  let s = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  // 2. Inline code first — backticks shouldn't be reinterpreted as bold.
  s = s.replace(/`([^`\n]+?)`/g, '<code>$1</code>');
  // 3. Bold: ** and __ variants.
  s = s.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_\n]+?)__/g, '<strong>$1</strong>');
  return s;
}
