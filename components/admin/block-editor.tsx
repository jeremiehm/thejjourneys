"use client";

import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { articleBlockLabels, type ArticleBlock } from "@/lib/blocks/types";
import { createArticleBlock } from "@/lib/blocks/defaults";
import { RichEditor } from "@/components/admin/Editor/RichEditor";

const articleTypes = Object.keys(articleBlockLabels) as ArticleBlock["type"][];

type BlockEditorProps = { name: string; defaultValue: ArticleBlock[] };

export function BlockEditor({ name, defaultValue }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<ArticleBlock[]>(defaultValue);
  const [newType, setNewType] = useState<ArticleBlock["type"]>("text");
  const sensors = useSensors(useSensor(PointerSensor));
  const ids = useMemo(() => blocks.map((block) => block.id), [blocks]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      window.localStorage.setItem(`draft:${name}`, JSON.stringify(blocks));
    }, 30000);
    return () => window.clearInterval(timer);
  }, [blocks, name]);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((items) => arrayMove(items, items.findIndex((item) => item.id === active.id), items.findIndex((item) => item.id === over.id)));
  }

  function updateBlock(next: ArticleBlock) {
    setBlocks((items) => items.map((item) => (item.id === next.id ? next : item)));
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value={JSON.stringify(blocks)} />
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {blocks.map((block) => (
              <SortableArticleBlock key={block.id} block={block} onChange={updateBlock} onDelete={() => setBlocks((items) => items.filter((item) => item.id !== block.id))} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-dashed border-stone-300 p-4">
        <select value={newType} onChange={(event) => setNewType(event.target.value as ArticleBlock["type"])} className="rounded-2xl border border-stone-300 px-3 py-2">
          {articleTypes.map((type) => <option key={type} value={type}>{articleBlockLabels[type]}</option>)}
        </select>
        <button type="button" onClick={() => setBlocks((items) => [...items, createArticleBlock(newType)])} className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white">
          <Plus size={16} /> Add block
        </button>
      </div>
    </div>
  );
}

function SortableArticleBlock({ block, onChange, onDelete }: { block: ArticleBlock; onChange: (block: ArticleBlock) => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <section ref={setNodeRef} style={style} className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2 font-semibold text-stone-900">
          <button type="button" {...attributes} {...listeners} className="cursor-grab rounded-full p-2 text-stone-400 hover:bg-stone-100"><GripVertical size={18} /></button>
          {articleBlockLabels[block.type]}
        </div>
        <button type="button" onClick={onDelete} className="rounded-full p-2 text-red-600 hover:bg-red-50"><Trash2 size={18} /></button>
      </div>
      <ArticleBlockFields block={block} onChange={onChange} />
    </section>
  );
}

function ArticleBlockFields({ block, onChange }: { block: ArticleBlock; onChange: (block: ArticleBlock) => void }) {
  function setData<T extends ArticleBlock>(patch: Partial<T["data"]>) {
    onChange({ ...block, data: { ...block.data, ...patch } } as ArticleBlock);
  }

  if (block.type === "text") {
    return (
      <RichEditor
        value={block.data.markdown}
        onChange={(markdown) => setData<typeof block>({ markdown })}
      />
    );
  }
  if (block.type === "map") return <Field label="Place or coordinates" value={block.data.query} onChange={(query) => setData<typeof block>({ query })} />;
  if (block.type === "tip_card") return <div className="grid gap-3 md:grid-cols-3"><Field label="Icon" value={block.data.icon} onChange={(icon) => setData<typeof block>({ icon })} /><Field label="Label" value={block.data.label} onChange={(label) => setData<typeof block>({ label })} /><Textarea label="Description" value={block.data.body} onChange={(body) => setData<typeof block>({ body })} /></div>;
  if (block.type === "affiliate") return <div className="grid gap-3 md:grid-cols-2"><Field label="URL" value={block.data.url} onChange={(url) => setData<typeof block>({ url })} /><Field label="Title" value={block.data.title} onChange={(title) => setData<typeof block>({ title })} /><Field label="CTA" value={block.data.cta} onChange={(cta) => setData<typeof block>({ cta })} /><Field label="Description" value={block.data.description ?? ""} onChange={(description) => setData<typeof block>({ description })} /></div>;
  if (block.type === "video") return <Field label="Video URL" value={block.data.url} onChange={(url) => setData<typeof block>({ url })} />;
  if (block.type === "quote") return <div className="grid gap-3 md:grid-cols-2"><Textarea label="Quote" value={block.data.text} onChange={(text) => setData<typeof block>({ text })} /><Field label="Attribution" value={block.data.attribution ?? ""} onChange={(attribution) => setData<typeof block>({ attribution })} /></div>;
  if (block.type === "divider") return <Field label="Optional label" value={block.data.label ?? ""} onChange={(label) => setData<typeof block>({ label })} />;
  if (block.type === "image") return <ImageFields url={block.data.url} caption={block.data.caption ?? ""} alt={block.data.alt ?? ""} onChange={(patch) => setData<typeof block>(patch)} />;
  if (block.type === "gallery") return <ImageList images={block.data.images} onChange={(images) => setData<typeof block>({ images })} />;
  if (block.type === "timeline") return <TimelineFields items={block.data.items} onChange={(items) => setData<typeof block>({ items })} />;
  return null;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block space-y-1 text-sm font-medium text-stone-700"><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-stone-300 px-3 py-2 font-normal" /></label>;
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block space-y-1 text-sm font-medium text-stone-700"><span>{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={6} className="w-full rounded-2xl border border-stone-300 px-3 py-2 font-normal" /></label>;
}

function ImageFields({ url, caption, alt, onChange }: { url: string; caption: string; alt: string; onChange: (patch: { url?: string; caption?: string; alt?: string }) => void }) {
  return <div className="grid gap-3 md:grid-cols-3"><Field label="Image URL" value={url} onChange={(next) => onChange({ url: next })} /><Field label="Caption" value={caption} onChange={(next) => onChange({ caption: next })} /><Field label="Alt" value={alt} onChange={(next) => onChange({ alt: next })} /></div>;
}

function ImageList({ images, onChange }: { images: Array<{ url: string; caption?: string; alt?: string }>; onChange: (images: Array<{ url: string; caption?: string; alt?: string }>) => void }) {
  return <div className="space-y-3">{images.map((image, index) => <ImageFields key={index} url={image.url} caption={image.caption ?? ""} alt={image.alt ?? ""} onChange={(patch) => onChange(images.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))} />)}<button type="button" onClick={() => onChange([...images, { url: "", caption: "", alt: "" }])} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold">Add image</button></div>;
}

function TimelineFields({ items, onChange }: { items: Array<{ label: string; title: string; date?: string; text: string }>; onChange: (items: Array<{ label: string; title: string; date?: string; text: string }>) => void }) {
  return <div className="space-y-3">{items.map((item, index) => <div key={index} className="grid gap-3 rounded-2xl bg-stone-50 p-3 md:grid-cols-2"><Field label="Label" value={item.label} onChange={(label) => onChange(items.map((entry, entryIndex) => entryIndex === index ? { ...entry, label } : entry))} /><Field label="Title" value={item.title} onChange={(title) => onChange(items.map((entry, entryIndex) => entryIndex === index ? { ...entry, title } : entry))} /><Field label="Date" value={item.date ?? ""} onChange={(date) => onChange(items.map((entry, entryIndex) => entryIndex === index ? { ...entry, date } : entry))} /><Textarea label="Text" value={item.text} onChange={(text) => onChange(items.map((entry, entryIndex) => entryIndex === index ? { ...entry, text } : entry))} /></div>)}<button type="button" onClick={() => onChange([...items, { label: `Day ${items.length + 1}`, title: "", text: "" }])} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold">Add step</button></div>;
}
