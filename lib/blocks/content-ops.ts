import { createArticleBlock, createId } from "@/lib/blocks/defaults";
import type { DropZone } from "@/lib/blocks/editor-types";
import { columnsToRow, isLeafBlock, isRowBlock, type EditorBlock, type EditorLeafBlock } from "@/lib/blocks/editor-types";
import type { RowBlock, RowChildBlock, RowSlot } from "@/lib/blocks/types";

const SNAP_RATIOS = [
  [0.5, 0.5],
  [0.33, 0.67],
  [0.67, 0.33],
  [0.33, 0.33, 0.34],
];

export function detectDropZone(rect: DOMRect, clientX: number, clientY: number): DropZone {
  const relX = (clientX - rect.left) / rect.width;
  const relY = (clientY - rect.top) / rect.height;
  const edgeX = 0.3;
  const edgeY = 0.3;

  if (relX < edgeX) return "left";
  if (relX > 1 - edgeX) return "right";
  if (relY < edgeY) return "before";
  return "after";
}

export function snapRowFlexes(count: number, flexes: number[]): number[] {
  if (count === 2) {
    const left = flexes[0] ?? 0.5;
    let best = SNAP_RATIOS.filter((r) => r.length === 2)[0]!;
    let bestDist = Infinity;
    for (const ratio of SNAP_RATIOS.filter((r) => r.length === 2)) {
      const dist = Math.abs(ratio[0]! - left);
      if (dist < bestDist) {
        bestDist = dist;
        best = ratio;
      }
    }
    if (bestDist <= 0.03) return [...best];
    return [left, 1 - left];
  }
  const total = flexes.reduce((a, b) => a + b, 0) || 1;
  return flexes.map((f) => f / total);
}

export function countLeafBlocks(blocks: EditorBlock[]): number {
  let count = 0;
  for (const block of blocks) {
    if (isRowBlock(block)) count += block.data.children.length;
    else count += 1;
  }
  return count;
}

export function getPreviousLeafBlockId(blocks: EditorBlock[], targetId: string): string | null {
  const loc = findBlockLocation(blocks, targetId);
  if (!loc) return null;

  if (loc.kind === "row") {
    if (loc.slotIndex > 0) {
      return loc.row.data.children[loc.slotIndex - 1]!.block.id;
    }
    for (let i = loc.rowIndex - 1; i >= 0; i -= 1) {
      const block = blocks[i]!;
      if (isRowBlock(block)) return block.data.children[block.data.children.length - 1]!.block.id;
      return block.id;
    }
    return null;
  }

  if (loc.index === 0) return null;
  for (let i = loc.index - 1; i >= 0; i -= 1) {
    const block = blocks[i]!;
    if (isRowBlock(block)) return block.data.children[block.data.children.length - 1]!.block.id;
    return block.id;
  }
  return null;
}

export function findBlockLocation(blocks: EditorBlock[], targetId: string) {
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!;
    if (block.id === targetId) return { kind: "root" as const, index: i, block };
    if (isRowBlock(block)) {
      const slotIndex = block.data.children.findIndex(
        (slot) => slot.block.id === targetId || slot.slotId === targetId,
      );
      if (slotIndex >= 0) {
        return { kind: "row" as const, rowIndex: i, slotIndex, row: block, slot: block.data.children[slotIndex]! };
      }
    }
  }
  return null;
}

function cloneBlocks(blocks: EditorBlock[]) {
  return structuredClone(blocks) as EditorBlock[];
}

export function removeBlockAt(blocks: EditorBlock[], location: NonNullable<ReturnType<typeof findBlockLocation>>) {
  const next = cloneBlocks(blocks);
  if (location.kind === "root") {
    next.splice(location.index, 1);
    return collapseRows(next);
  }
  const row = next[location.rowIndex] as RowBlock;
  const children = row.data.children.filter((_, i) => i !== location.slotIndex);
  if (children.length <= 1) {
    const remaining = children[0]?.block;
    next.splice(location.rowIndex, 1, ...(remaining ? [remaining as EditorBlock] : []));
  } else {
    const total = children.reduce((s, c) => s + c.flex, 0);
    row.data.children = children.map((c) => ({ ...c, flex: c.flex / total }));
    next[location.rowIndex] = row;
  }
  return collapseRows(next);
}

function collapseRows(blocks: EditorBlock[]): EditorBlock[] {
  return blocks.flatMap((block) => {
    if (isRowBlock(block) && block.data.children.length === 1) {
      return [block.data.children[0]!.block as EditorBlock];
    }
    return [block];
  });
}

export function insertRootBlock(blocks: EditorBlock[], index: number, block: EditorLeafBlock) {
  const next = cloneBlocks(blocks);
  next.splice(index, 0, block);
  return next;
}

export function duplicateBlock(blocks: EditorBlock[], targetId: string): EditorBlock[] {
  const loc = findBlockLocation(blocks, targetId);
  if (!loc) return blocks;
  const next = cloneBlocks(blocks);
  if (loc.kind === "root") {
    const copy = structuredClone(loc.block) as EditorBlock;
    copy.id = createId();
    next.splice(loc.index + 1, 0, copy);
    return next;
  }
  const row = next[loc.rowIndex] as RowBlock;
  const copy = structuredClone(loc.slot.block) as RowChildBlock;
  copy.id = createId();
  const flex = 1 / (row.data.children.length + 1);
  row.data.children = [
    ...row.data.children.map((c) => ({ ...c, flex })),
    { slotId: createId(), flex, block: copy },
  ];
  next[loc.rowIndex] = row;
  return next;
}

export function applyDrop(
  blocks: EditorBlock[],
  activeId: string,
  overId: string,
  zone: DropZone,
): EditorBlock[] {
  if (activeId === overId) return blocks;

  let next = cloneBlocks(blocks);
  const activeLoc = findBlockLocation(next, activeId);
  const overLoc = findBlockLocation(next, overId);
  if (!activeLoc || !overLoc) return blocks;

  const activeBlock =
    activeLoc.kind === "root"
      ? (activeLoc.block as EditorLeafBlock)
      : activeLoc.slot.block;

  next = removeBlockAt(next, activeLoc);
  const overLocAfter = findBlockLocation(next, overId);
  if (!overLocAfter) return blocks;

  if (zone === "left" || zone === "right") {
    return dropHorizontal(next, overLocAfter, activeBlock, zone);
  }
  return dropVertical(next, overLocAfter, activeBlock, zone);
}

function dropVertical(
  blocks: EditorBlock[],
  overLoc: NonNullable<ReturnType<typeof findBlockLocation>>,
  activeBlock: RowChildBlock,
  zone: DropZone,
) {
  const next = blocks;
  if (overLoc.kind === "root") {
    const insertAt = zone === "before" ? overLoc.index : overLoc.index + 1;
    next.splice(insertAt, 0, activeBlock as EditorBlock);
    return next;
  }
  const row = next[overLoc.rowIndex] as RowBlock;
  const insertAt = zone === "before" ? overLoc.slotIndex : overLoc.slotIndex + 1;
  const newRow: EditorBlock[] = [
    ...row.data.children.slice(0, insertAt).map((s) => s.block as EditorBlock),
    activeBlock as EditorBlock,
    ...row.data.children.slice(insertAt).map((s) => s.block as EditorBlock),
  ];
  next.splice(overLoc.rowIndex, 1, ...newRow);
  return collapseRows(next);
}

function dropHorizontal(
  blocks: EditorBlock[],
  overLoc: NonNullable<ReturnType<typeof findBlockLocation>>,
  activeBlock: RowChildBlock,
  zone: DropZone,
) {
  const next = blocks;

  if (overLoc.kind === "row") {
    const row = next[overLoc.rowIndex] as RowBlock;
    const insertAt = zone === "left" ? overLoc.slotIndex : overLoc.slotIndex + 1;
    const children = [...row.data.children];
    children.splice(insertAt, 0, { slotId: createId(), flex: 1 / (children.length + 1), block: activeBlock });
    const flex = 1 / children.length;
    row.data.children = children.map((c) => ({ ...c, flex }));
    next[overLoc.rowIndex] = row;
    return next;
  }

  const overBlock = overLoc.block;
  if (!isLeafBlock(overBlock)) return next;

  const newRow: RowBlock = {
    id: createId(),
    type: "row",
    data: {
      fullWidth: false,
      children:
        zone === "left"
          ? [
              { slotId: createId(), flex: 0.5, block: activeBlock },
              { slotId: createId(), flex: 0.5, block: overBlock },
            ]
          : [
              { slotId: createId(), flex: 0.5, block: overBlock },
              { slotId: createId(), flex: 0.5, block: activeBlock },
            ],
    },
  };
  next.splice(overLoc.index, 1, newRow);
  return next;
}

export function updateRowFlexes(blocks: EditorBlock[], rowId: string, flexes: number[]) {
  const next = cloneBlocks(blocks);
  const index = next.findIndex((b) => b.id === rowId);
  if (index < 0 || !isRowBlock(next[index]!)) return blocks;
  const row = next[index] as RowBlock;
  const snapped = snapRowFlexes(row.data.children.length, flexes);
  row.data.children = row.data.children.map((child, i) => ({
    ...child,
    flex: snapped[i] ?? child.flex,
  }));
  next[index] = row;
  return next;
}

export function createEmptyLeaf(type: EditorLeafBlock["type"] = "text"): EditorLeafBlock {
  return createArticleBlock(type) as EditorLeafBlock;
}

