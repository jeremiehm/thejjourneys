"use client";

import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { createLayoutBlock } from "@/lib/blocks/defaults";
import { layoutBlockLabels, type Article, type LayoutBlock } from "@/lib/blocks/types";

const layoutTypes = Object.keys(layoutBlockLabels) as LayoutBlock["type"][];

export function LayoutBuilder({ name, defaultValue, articles }: { name: string; defaultValue: LayoutBlock[]; articles: Article[] }) {
  const [blocks, setBlocks] = useState<LayoutBlock[]>(defaultValue);
  const [newType, setNewType] = useState<LayoutBlock["type"]>("hero");
  const sensors = useSensors(useSensor(PointerSensor));
  const ids = useMemo(() => blocks.map((block) => block.id), [blocks]);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((items) => arrayMove(items, items.findIndex((item) => item.id === active.id), items.findIndex((item) => item.id === over.id)));
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value={JSON.stringify(blocks)} />
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">{blocks.map((block) => <SortableLayoutBlock key={block.id} block={block} articles={articles} onChange={(next) => setBlocks((items) => items.map((item) => item.id === next.id ? next : item))} onDelete={() => setBlocks((items) => items.filter((item) => item.id !== block.id))} />)}</div>
        </SortableContext>
      </DndContext>
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-dashed border-stone-300 p-4">
        <select value={newType} onChange={(event) => setNewType(event.target.value as LayoutBlock["type"])} className="rounded-2xl border border-stone-300 px-3 py-2">{layoutTypes.map((type) => <option key={type} value={type}>{layoutBlockLabels[type]}</option>)}</select>
        <button type="button" onClick={() => setBlocks((items) => [...items, createLayoutBlock(newType)])} className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white"><Plus size={16} /> Add block</button>
      </div>
    </div>
  );
}

function SortableLayoutBlock({ block, articles, onChange, onDelete }: { block: LayoutBlock; articles: Article[]; onChange: (block: LayoutBlock) => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  function setData<T extends LayoutBlock>(patch: Partial<T["data"]>) {
    onChange({ ...block, data: { ...block.data, ...patch } } as LayoutBlock);
  }

  return (
    <section ref={setNodeRef} style={style} className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2 font-semibold text-stone-900"><button type="button" {...attributes} {...listeners} className="cursor-grab rounded-full p-2 text-stone-400 hover:bg-stone-100"><GripVertical size={18} /></button>{layoutBlockLabels[block.type]}</div>
        <button type="button" onClick={onDelete} className="rounded-full p-2 text-red-600 hover:bg-red-50"><Trash2 size={18} /></button>
      </div>
      {block.type === "hero" ? <div className="grid gap-3 md:grid-cols-2"><Field label="Title" value={block.data.title} onChange={(title) => setData<typeof block>({ title })} /><Field label="Subtitle" value={block.data.subtitle ?? ""} onChange={(subtitle) => setData<typeof block>({ subtitle })} /><Field label="Image" value={block.data.imageUrl} onChange={(imageUrl) => setData<typeof block>({ imageUrl })} /><Select label="Alignment" value={block.data.align} options={["left", "center"]} onChange={(align) => setData<typeof block>({ align: align as "left" | "center" })} /></div> : null}
      {block.type === "text" ? <div className="grid gap-3 md:grid-cols-2"><Field label="Title" value={block.data.heading ?? ""} onChange={(heading) => setData<typeof block>({ heading })} /><Textarea label="Text" value={block.data.body} onChange={(body) => setData<typeof block>({ body })} /></div> : null}
      {block.type === "article_grid" ? <div className="grid gap-3 md:grid-cols-2"><Field label="Title" value={block.data.title ?? ""} onChange={(title) => setData<typeof block>({ title })} /><Select label="Columns" value={String(block.data.columns)} options={["2", "3"]} onChange={(columns) => setData<typeof block>({ columns: Number(columns) as 2 | 3 })} /></div> : null}
      {block.type === "article_list" ? <Field label="Title" value={block.data.title ?? ""} onChange={(title) => setData<typeof block>({ title })} /> : null}
      {block.type === "featured_article" ? <div className="grid gap-3 md:grid-cols-2"><Field label="Title" value={block.data.title ?? ""} onChange={(title) => setData<typeof block>({ title })} /><label className="block space-y-1 text-sm font-medium text-stone-700"><span>Article</span><select value={block.data.articleId ?? ""} onChange={(event) => setData<typeof block>({ articleId: event.target.value })} className="w-full rounded-2xl border border-stone-300 px-3 py-2 font-normal"><option value="">First published article</option>{articles.map((article) => <option key={article.id} value={article.id}>{article.title}</option>)}</select></label></div> : null}
      {block.type === "image" ? <ImageFields url={block.data.url} caption={block.data.caption ?? ""} alt={block.data.alt ?? ""} onChange={(patch) => setData<typeof block>(patch)} /> : null}
      {block.type === "gallery" ? <ImageList images={block.data.images} onChange={(images) => setData<typeof block>({ images })} /> : null}
      {block.type === "quote" ? <div className="grid gap-3 md:grid-cols-2"><Textarea label="Quote" value={block.data.text} onChange={(text) => setData<typeof block>({ text })} /><Field label="Attribution" value={block.data.attribution ?? ""} onChange={(attribution) => setData<typeof block>({ attribution })} /></div> : null}
      {block.type === "divider" ? <Field label="Label" value={block.data.label ?? ""} onChange={(label) => setData<typeof block>({ label })} /> : null}
      {block.type === "spacer" ? <Select label="Size" value={block.data.size} options={["sm", "md", "lg"]} onChange={(size) => setData<typeof block>({ size: size as "sm" | "md" | "lg" })} /> : null}
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block space-y-1 text-sm font-medium text-stone-700"><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-stone-300 px-3 py-2 font-normal" /></label>; }
function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block space-y-1 text-sm font-medium text-stone-700"><span>{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={5} className="w-full rounded-2xl border border-stone-300 px-3 py-2 font-normal" /></label>; }
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label className="block space-y-1 text-sm font-medium text-stone-700"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-stone-300 px-3 py-2 font-normal">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }
function ImageFields({ url, caption, alt, onChange }: { url: string; caption: string; alt: string; onChange: (patch: { url?: string; caption?: string; alt?: string }) => void }) { return <div className="grid gap-3 md:grid-cols-3"><Field label="Image URL" value={url} onChange={(next) => onChange({ url: next })} /><Field label="Caption" value={caption} onChange={(next) => onChange({ caption: next })} /><Field label="Alt" value={alt} onChange={(next) => onChange({ alt: next })} /></div>; }
function ImageList({ images, onChange }: { images: Array<{ url: string; caption?: string; alt?: string }>; onChange: (images: Array<{ url: string; caption?: string; alt?: string }>) => void }) { return <div className="space-y-3">{images.map((image, index) => <ImageFields key={index} url={image.url} caption={image.caption ?? ""} alt={image.alt ?? ""} onChange={(patch) => onChange(images.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))} />)}<button type="button" onClick={() => onChange([...images, { url: "", caption: "", alt: "" }])} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold">Add image</button></div>; }
