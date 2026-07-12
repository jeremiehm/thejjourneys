import { describe, expect, it } from "vitest";
import { parseArticleContent, parseCollectionLayout } from "@/lib/blocks/validation";

describe("block validation", () => {
  it("accepts known article blocks", () => {
    const blocks = parseArticleContent([{ id: "1", type: "text", data: { markdown: "Bonjour" } }]);
    expect(blocks[0]?.type).toBe("text");
  });

  it("drops invalid article content", () => {
    expect(parseArticleContent([{ id: "1", type: "unknown", data: {} }])).toEqual([]);
  });

  it("keeps valid blocks when one block is invalid", () => {
    const blocks = parseArticleContent([
      { id: "1", type: "text", data: { markdown: "OK" } },
      { id: "2", type: "unknown", data: {} },
    ]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.type).toBe("text");
  });

  it("accepts row blocks with flex 1", () => {
    const blocks = parseArticleContent([
      {
        id: "row-1",
        type: "row",
        data: {
          children: [
            {
              slotId: "a",
              flex: 1,
              block: { id: "t1", type: "text", data: { markdown: "Colonne" } },
            },
          ],
        },
      },
    ]);
    expect(blocks[0]?.type).toBe("row");
  });

  it("accepts columns layout blocks", () => {
    const blocks = parseArticleContent([
      {
        id: "row-1",
        type: "columns",
        data: {
          fullWidth: false,
          columns: [
            { span: 6, blocks: [{ id: "a", type: "text", data: { markdown: "Gauche" } }] },
            { span: 6, blocks: [{ id: "b", type: "text", data: { markdown: "Droite" } }] },
          ],
        },
      },
    ]);
    expect(blocks[0]?.type).toBe("columns");
  });

  it("accepts collection layout blocks", () => {
    const blocks = parseCollectionLayout([{ id: "1", type: "article_grid", data: { columns: 3 } }]);
    expect(blocks[0]?.type).toBe("article_grid");
  });
});
