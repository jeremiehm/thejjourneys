import { describe, expect, it } from "vitest";
import { estimateReadingTime } from "@/lib/reading-time";

describe("estimateReadingTime", () => {
  it("returns at least one minute", () => {
    expect(estimateReadingTime([{ id: "1", type: "text", data: { markdown: "Court texte" } }])).toBe(1);
  });
});
