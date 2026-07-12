import { describe, expect, it } from "vitest";
import { measureBlockActionsAlign } from "@/components/admin/NotionEditor/block-actions-align";

describe("measureBlockActionsAlign", () => {
  it("aligns on textarea first line", () => {
    const block = document.createElement("div");
    const content = document.createElement("div");
    const textarea = document.createElement("textarea");
    textarea.style.lineHeight = "28px";
    textarea.style.fontSize = "20px";
    content.appendChild(textarea);
    block.appendChild(content);
    document.body.appendChild(block);

    const metrics = measureBlockActionsAlign(content, block);
    expect(metrics.top).toBe(0);
    expect(metrics.height).toBeGreaterThan(20);
    expect(metrics.align).toBe("default");

    document.body.removeChild(block);
  });
});
