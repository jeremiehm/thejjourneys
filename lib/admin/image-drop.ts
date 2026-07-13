export function extractImageFiles(dataTransfer: DataTransfer): File[] {
  const fromItems = Array.from(dataTransfer.items)
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);

  if (fromItems.length > 0) return fromItems;

  return Array.from(dataTransfer.files).filter((file) => file.type.startsWith("image/"));
}

export function dataTransferHasImages(dataTransfer: DataTransfer): boolean {
  if (!dataTransfer.types.includes("Files")) return false;
  return extractImageFiles(dataTransfer).length > 0;
}

export function blockIdAtPoint(clientX: number, clientY: number): string | null {
  const el = document.elementFromPoint(clientX, clientY);
  return el?.closest("[data-block-id]")?.getAttribute("data-block-id") ?? null;
}
