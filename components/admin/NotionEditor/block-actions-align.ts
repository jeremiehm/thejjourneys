function lineHeightPx(style: CSSStyleDeclaration): number {
  const fontSize = parseFloat(style.fontSize) || 16;
  const lh = style.lineHeight;
  if (lh === "normal") return fontSize * 1.2;
  if (lh.endsWith("px")) return parseFloat(lh);
  const n = parseFloat(lh);
  if (Number.isNaN(n)) return fontSize * 1.75;
  return n < 10 ? n * fontSize : n;
}

function firstTextNode(root: Element): Text | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });
  return (walker.nextNode() as Text | null) ?? null;
}

function firstLineRectFromElement(el: Element): { top: number; height: number } | null {
  const text = firstTextNode(el);
  if (text?.length) {
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 1);
    const rect = range.getClientRects()[0];
    if (rect?.height) return { top: rect.top, height: rect.height };
  }
  const box = el.getBoundingClientRect();
  if (box.height > 0) {
    const style = window.getComputedStyle(el);
    const lh = lineHeightPx(style);
    return { top: box.top, height: Math.min(lh, box.height) };
  }
  return null;
}

export type BlockActionsMetrics = {
  top: number;
  height: number;
  capOffset: number;
  align: "default" | "heading";
};

export function measureBlockActionsAlign(
  contentRoot: HTMLElement,
  blockRoot: HTMLElement,
): BlockActionsMetrics {
  const blockTop = blockRoot.getBoundingClientRect().top;
  const fallbackHeight = lineHeightPx(window.getComputedStyle(contentRoot));

  const prose = contentRoot.querySelector<HTMLElement>(".ProseMirror");
  if (prose) {
    const firstBlock = prose.querySelector<HTMLElement>(
      ":scope > p, :scope > h1, :scope > h2, :scope > h3, :scope > blockquote, :scope > ul, :scope > ol, :scope > pre, :scope > div[data-type='callout']",
    );
    if (firstBlock) {
      const tag = firstBlock.tagName.toLowerCase();
      const isHeading = tag === "h1" || tag === "h2" || tag === "h3";
      if (isHeading) {
        const style = window.getComputedStyle(firstBlock);
        const fontSize = parseFloat(style.fontSize) || 16;
        const lh = lineHeightPx(style);
        const box = firstBlock.getBoundingClientRect();
        return {
          top: box.top - blockTop,
          height: fontSize,
          capOffset: Math.max(0, (lh - fontSize) / 2),
          align: "heading",
        };
      }

      const lineTarget =
        firstBlock.tagName === "UL" || firstBlock.tagName === "OL"
          ? (firstBlock.querySelector("li") ?? firstBlock)
          : firstBlock;
      const line = firstLineRectFromElement(lineTarget);
      if (line) {
        return {
          top: line.top - blockTop,
          height: line.height,
          capOffset: 0,
          align: "default",
        };
      }
    }
    const proseLine = firstLineRectFromElement(prose);
    if (proseLine) {
      return {
        top: proseLine.top - blockTop,
        height: proseLine.height,
        capOffset: 0,
        align: "default",
      };
    }
  }

  const textarea = contentRoot.querySelector("textarea");
  if (textarea) {
    const lh = lineHeightPx(window.getComputedStyle(textarea));
    return { top: 0, height: lh, capOffset: 0, align: "default" };
  }

  const hr = contentRoot.querySelector("hr");
  if (hr) {
    const box = hr.getBoundingClientRect();
    return {
      top: box.top - blockTop + box.height / 2 - 12,
      height: 24,
      capOffset: 0,
      align: "default",
    };
  }

  const visual = contentRoot.firstElementChild as HTMLElement | null;
  if (visual) {
    const box = visual.getBoundingClientRect();
    return {
      top: Math.max(0, box.top - blockTop),
      height: 24,
      capOffset: 0,
      align: "default",
    };
  }

  return { top: 0, height: fallbackHeight, capOffset: 0, align: "default" };
}
