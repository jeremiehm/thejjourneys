import type { GridSpan } from "@/lib/blocks/types";

export type ColumnPreset = {
  id: string;
  label: string;
  spans: GridSpan[];
};

export const COLUMN_PRESETS: ColumnPreset[] = [
  { id: "2-equal", label: "2 colonnes égales", spans: [6, 6] },
  { id: "3-equal", label: "3 colonnes égales", spans: [4, 4, 4] },
  { id: "1-2", label: "1/3 · 2/3", spans: [4, 8] },
  { id: "2-1", label: "2/3 · 1/3", spans: [8, 4] },
  { id: "1-3", label: "1/4 · 3/4", spans: [3, 9] },
  { id: "3-1", label: "3/4 · 1/4", spans: [9, 3] },
  { id: "1-2-1", label: "1/4 · 1/2 · 1/4", spans: [3, 6, 3] },
  { id: "4-equal", label: "4 colonnes", spans: [3, 3, 3, 3] },
];

export function spanToColClass(span: GridSpan): string {
  const map: Record<GridSpan, string> = {
    3: "col-span-3",
    4: "col-span-4",
    6: "col-span-6",
    8: "col-span-8",
    9: "col-span-9",
    12: "col-span-12",
  };
  return map[span];
}

export function findPresetBySpans(spans: GridSpan[]): ColumnPreset | undefined {
  const key = spans.join("-");
  return COLUMN_PRESETS.find((preset) => preset.spans.join("-") === key);
}
