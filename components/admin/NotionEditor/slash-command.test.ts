import { describe, expect, it } from "vitest";
import { getSlashMatch } from "@/components/admin/NotionEditor/slash-command";

describe("getSlashMatch", () => {
  it("returns null when no slash on current line", () => {
    const parent = { textContent: "hello", type: { name: "paragraph" } };
    const state = {
      selection: {
        $from: {
          parent,
          parentOffset: 5,
          start: () => 0,
          pos: 5,
        },
      },
    };
    expect(getSlashMatch({ state } as never)).toBeNull();
  });

  it("detects slash query on current line", () => {
    const parent = { textContent: "/ima", type: { name: "paragraph" } };
    const state = {
      selection: {
        $from: {
          parent,
          parentOffset: 4,
          start: () => 10,
          pos: 14,
        },
      },
    };
    const match = getSlashMatch({ state } as never);
    expect(match?.query).toBe("ima");
    expect(match?.slashFrom).toBe(10);
    expect(match?.slashTo).toBe(14);
  });
});
