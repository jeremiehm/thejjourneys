import { marked } from "marked";
import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

marked.setOptions({ gfm: true, breaks: true });

export function markdownToHtml(markdown: string) {
  if (!markdown.trim()) return "";
  if (markdown.trim().startsWith("<")) return markdown;
  return marked.parse(markdown, { async: false }) as string;
}

export function htmlToMarkdown(html: string) {
  if (!html.trim()) return "";
  return turndown.turndown(html);
}
