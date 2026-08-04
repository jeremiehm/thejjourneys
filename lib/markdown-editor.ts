import { marked } from "marked";
import TurndownService from "turndown";
import {
  CALLOUT_VARIANT_META,
  calloutVariantFromToken,
  normalizeCalloutVariant,
} from "@/lib/callout-variants";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

/** Inline-only turndown so cell / callout body conversion cannot re-enter table/callout rules. */
const inlineTurndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

marked.setOptions({ gfm: true, breaks: true });

/** Escape literal pipes so GFM cells stay intact. */
function escapeCellPipes(text: string): string {
  return text.replace(/\|/g, "\\|");
}

function cellToMarkdown(cell: HTMLElement): string {
  const html = cell.innerHTML;
  if (!html.trim()) return "";
  return escapeCellPipes(inlineTurndown.turndown(html).trim().replace(/\n+/g, " "));
}

function trimTrailingEmptyColumns(matrix: string[][]): string[][] {
  if (matrix.length === 0) return matrix;
  let colCount = Math.max(...matrix.map((row) => row.length));
  while (colCount > 1 && matrix.every((row) => !(row[colCount - 1] ?? "").trim())) {
    colCount -= 1;
  }
  return matrix.map((row) => {
    const next = row.slice(0, colCount);
    while (next.length < colCount) next.push("");
    return next;
  });
}

/** Custom GFM table rule — escapes `|`, skips colgroup, drops empty trailing cols. */
turndown.addRule("gfmTable", {
  filter: "table",
  replacement(_content, node) {
    const table = node as HTMLTableElement;
    const rows = Array.from(table.querySelectorAll("tr"));
    if (rows.length === 0) return "";

    const matrix = rows.map((tr) =>
      Array.from(tr.children)
        .filter((child): child is HTMLTableCellElement => {
          const tag = child.tagName;
          return tag === "TH" || tag === "TD";
        })
        .map((cell) => cellToMarkdown(cell)),
    );

    const normalized = trimTrailingEmptyColumns(matrix);
    if (normalized.length === 0) return "";

    const header = normalized[0]!;
    const separator = header.map(() => "---");
    const lines = [
      `| ${header.join(" | ")} |`,
      `| ${separator.join(" | ")} |`,
      ...normalized.slice(1).map((row) => `| ${row.join(" | ")} |`),
    ];
    return `\n\n${lines.join("\n")}\n\n`;
  },
});

turndown.addRule("gfmCallout", {
  filter(node) {
    return (
      node.nodeName === "DIV" &&
      (node as HTMLElement).getAttribute("data-type") === "callout"
    );
  },
  replacement(_content, node) {
    const el = node as HTMLElement;
    const variant = normalizeCalloutVariant(el.getAttribute("data-variant")).toUpperCase();
    const body =
      (el.querySelector(".notion-callout-body") as HTMLElement | null) ??
      (el.querySelector('[data-node-view-content]') as HTMLElement | null) ??
      el;
    const bodyHtml = body === el ? el.innerHTML : body.innerHTML;
    // Strip icon chrome if we fell back to the whole element
    const cleaned = bodyHtml
      .replace(/<div[^>]*class="[^"]*notion-callout-icon[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "")
      .replace(/<div[^>]*class="[^"]*notion-callout-chrome[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");
    const bodyMd = inlineTurndown.turndown(cleaned).trim();
    if (!bodyMd) return `\n\n> [!${variant}]\n> \n\n`;
    const prefixed = bodyMd
      .split("\n")
      .map((line) => (line.length ? `> ${line}` : ">"))
      .join("\n");
    return `\n\n> [!${variant}]\n${prefixed}\n\n`;
  },
});

const ALERT_TOKEN = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i;

function extractAlertVariantFromBlockquote(blockquote: HTMLElement): string | null {
  const walker = document.createTreeWalker(blockquote, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();
  while (textNode) {
    const raw = textNode.textContent ?? "";
    if (!raw.trim()) {
      textNode = walker.nextNode();
      continue;
    }
    const match = raw.trim().match(ALERT_TOKEN);
    if (!match) return null;
    const variant = calloutVariantFromToken(`[!${match[1]}]`);
    // Strip token from this text node
    textNode.textContent = raw.replace(ALERT_TOKEN, "").replace(/^\s+/, "");
    // Remove empty leading paragraphs left behind
    cleanupEmptyLeadingNodes(blockquote);
    return variant;
  }
  return null;
}

function cleanupEmptyLeadingNodes(root: HTMLElement) {
  while (root.firstChild) {
    const child = root.firstChild;
    if (child.nodeType === Node.TEXT_NODE && !(child.textContent ?? "").trim()) {
      root.removeChild(child);
      continue;
    }
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      if (el.tagName === "BR") {
        root.removeChild(child);
        continue;
      }
      if ((el.tagName === "P" || el.tagName === "DIV") && !el.textContent?.trim() && el.children.length === 0) {
        root.removeChild(child);
        continue;
      }
    }
    break;
  }
}

/** Rewrite `> [!NOTE]` blockquotes into callout HTML TipTap can parse. */
export function promoteGfmAlertsToCallouts(html: string): string {
  if (!html.includes("[!") || typeof document === "undefined") return html;

  const wrap = document.createElement("div");
  wrap.innerHTML = html;

  for (const blockquote of Array.from(wrap.querySelectorAll("blockquote"))) {
    const variant = extractAlertVariantFromBlockquote(blockquote as HTMLElement);
    if (!variant) continue;

    const callout = document.createElement("div");
    callout.setAttribute("data-type", "callout");
    callout.setAttribute("data-variant", variant);
    callout.className = "notion-callout";

    const icon = document.createElement("div");
    icon.className = "notion-callout-icon";
    icon.setAttribute("contenteditable", "false");
    icon.textContent = CALLOUT_VARIANT_META[normalizeCalloutVariant(variant)].icon;

    const body = document.createElement("div");
    body.className = "notion-callout-body";
    while (blockquote.firstChild) {
      body.appendChild(blockquote.firstChild);
    }
    if (!body.innerHTML.trim()) {
      body.innerHTML = "<p></p>";
    }

    callout.appendChild(icon);
    callout.appendChild(body);
    blockquote.replaceWith(callout);
  }

  return wrap.innerHTML;
}

export function markdownToHtml(markdown: string) {
  if (!markdown.trim()) return "";
  if (markdown.trim().startsWith("<")) return markdown;
  const html = marked.parse(markdown, { async: false }) as string;
  return promoteGfmAlertsToCallouts(html);
}

export function htmlToMarkdown(html: string) {
  if (!html.trim()) return "";
  return turndown.turndown(html);
}

/** When true, multi-heading / thematic-break pastes become sibling blocks. */
export const splitPastedMarkdownIntoBlocks = true;

const ATX_HEADING = /^#{1,6}\s+\S/;
const TABLE_SEP = /^\s*\|?\s*:?-{3,}/;
const FENCE = /^```/;
const BLOCKQUOTE = /^>\s?/;
const GFM_ALERT = /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i;
const LIST_MARKER = /^(\s*[-*+]\s+|\s*\d+\.\s+)/;
const THEMATIC_BREAK = /^---\s*$/;
const H1_H2 = /^#{1,2}\s+\S/;

function countInlineMarkdownSignals(text: string): number {
  let count = 0;
  if (/\*\*[^*\n]+?\*\*/.test(text)) count += 1;
  if (/(?<![\w*])_[^_\s][^_\n]*_(?![\w*])/.test(text)) count += 1;
  if (/`[^`\n]+`/.test(text)) count += 1;
  if (/\[[^\]]+\]\([^)\s]+\)/.test(text)) count += 1;
  return count;
}

function hasBlockLevelMarkdown(lines: string[]): boolean {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (ATX_HEADING.test(line)) return true;
    if (FENCE.test(line.trim())) return true;
    if (GFM_ALERT.test(line.trim())) return true;
    if (BLOCKQUOTE.test(line)) return true;
    if (line.trim().startsWith("|") && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1] ?? "")) {
      return true;
    }
  }

  let consecutiveList = 0;
  for (const line of lines) {
    if (LIST_MARKER.test(line)) {
      consecutiveList += 1;
      if (consecutiveList >= 2) return true;
    } else if (line.trim() === "") {
      consecutiveList = 0;
    } else {
      consecutiveList = 0;
    }
  }
  return false;
}

/**
 * Conservative markdown detector for paste. Prefers false negatives.
 * Block-level signal OR ≥2 inline signals → true.
 */
export function looksLikeMarkdown(text: string): boolean {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return false;

  const lines = trimmed.split(/\r?\n/);
  if (hasBlockLevelMarkdown(lines)) return true;
  return countInlineMarkdownSignals(trimmed) >= 2;
}

export type MarkdownEditorSegment =
  | { type: "text"; markdown: string }
  | { type: "divider" };

export function shouldSplitPastedMarkdown(markdown: string): boolean {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  if (lines.some((line) => THEMATIC_BREAK.test(line.trim()))) return true;
  const headings = lines.filter((line) => H1_H2.test(line)).length;
  return headings >= 2;
}

/** Split on `---` and before each subsequent H1/H2 when buffer already has content. */
export function splitMarkdownIntoEditorBlocks(markdown: string): MarkdownEditorSegment[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const segments: MarkdownEditorSegment[] = [];
  let buffer: string[] = [];

  const flushText = () => {
    const text = buffer.join("\n").trim();
    buffer = [];
    if (text) segments.push({ type: "text", markdown: text });
  };

  for (const line of lines) {
    if (THEMATIC_BREAK.test(line.trim())) {
      flushText();
      segments.push({ type: "divider" });
      continue;
    }
    if (H1_H2.test(line) && buffer.some((entry) => entry.trim())) {
      flushText();
    }
    buffer.push(line);
  }
  flushText();

  return segments.length > 0 ? segments : [{ type: "text", markdown: markdown.trim() }];
}
