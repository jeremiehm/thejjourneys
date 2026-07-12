"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { CoverType } from "@/lib/blocks/types";
import { cn } from "@/lib/utils";

const COVER_TYPE_LABELS: Record<CoverType, string> = {
  banner: "Bannière pleine largeur",
  above_title: "Image au-dessus du titre",
  below_title: "Image sous le titre",
};

export function ArticleCoverAddButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="notion-meta-btn">
      <ImageIcon className="h-3.5 w-3.5" />
      Ajouter une cover
    </button>
  );
}

export function ArticleCoverDisplay({
  coverUrl,
  coverType,
  onEdit,
  onRemove,
}: {
  coverUrl: string;
  coverType: CoverType;
  onEdit: () => void;
  onRemove: () => void;
}) {
  if (!coverUrl) return null;

  if (coverType === "banner") {
    return (
      <div className="group/cover relative -mx-24 mb-6 h-[260px] w-[calc(100%+12rem)] max-w-none overflow-hidden">
        <Image src={coverUrl} alt="" fill className="object-cover" sizes="900px" priority />
        <CoverOverlay onEdit={onEdit} onRemove={onRemove} />
      </div>
    );
  }

  return (
    <figure
      className={cn(
        "group/cover relative mb-6 overflow-hidden rounded-xl",
        coverType === "above_title" ? "mx-auto max-w-[480px]" : "mx-auto max-w-[560px]",
      )}
    >
      <div className={cn("relative w-full", coverType === "above_title" ? "aspect-[4/3]" : "aspect-[16/10]")}>
        <Image src={coverUrl} alt="" fill className="object-cover" sizes="560px" />
      </div>
      <CoverOverlay onEdit={onEdit} onRemove={onRemove} />
    </figure>
  );
}

function CoverOverlay({ onEdit, onRemove }: { onEdit: () => void; onRemove: () => void }) {
  return (
    <div className="absolute inset-0 flex items-end justify-center gap-2 bg-black/0 pb-4 opacity-0 transition-all group-hover/cover:bg-black/20 group-hover/cover:opacity-100">
      <button type="button" onClick={onEdit} className="notion-meta-btn bg-white/90">
        Modifier
      </button>
      <button type="button" onClick={onRemove} className="notion-meta-btn bg-white/90">
        Supprimer
      </button>
    </div>
  );
}

export function ArticleCoverDialog({
  open,
  onOpenChange,
  coverUrl,
  coverType,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coverUrl: string;
  coverType: CoverType;
  onApply: (url: string, type: CoverType) => void;
}) {
  const [draftUrl, setDraftUrl] = useState(coverUrl);
  const [draftType, setDraftType] = useState<CoverType>(coverType);
  const [linkUrl, setLinkUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function upload(file: File) {
    startTransition(async () => {
      setMessage(null);
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setMessage("Configurez Supabase ou utilisez un lien.");
        return;
      }
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `uploads/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, file, { upsert: false });
      if (error) {
        setMessage(error.message);
        return;
      }
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      setDraftUrl(data.publicUrl);
    });
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraftUrl(coverUrl);
      setDraftType(coverType);
      setLinkUrl("");
      setMessage(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Image de couverture</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Type d&apos;affichage</p>
            <div className="grid gap-2">
              {(Object.keys(COVER_TYPE_LABELS) as CoverType[]).map((type) => (
                <label
                  key={type}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                    draftType === type
                      ? "border-stone-900 bg-stone-50 dark:border-stone-400 dark:bg-white/10"
                      : "border-stone-200 dark:border-stone-700",
                  )}
                >
                  <input
                    type="radio"
                    name="cover_type"
                    checked={draftType === type}
                    onChange={() => setDraftType(type)}
                    className="accent-stone-900"
                  />
                  {COVER_TYPE_LABELS[type]}
                </label>
              ))}
            </div>
          </div>
          <Tabs defaultValue="upload">
            <TabsList className="w-full">
              <TabsTrigger value="upload" className="flex-1">
                Upload
              </TabsTrigger>
              <TabsTrigger value="link" className="flex-1">
                Lien
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="space-y-3 pt-2">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-stone-300 px-4 py-8 text-sm text-stone-500 hover:bg-stone-50 dark:border-stone-600 dark:hover:bg-white/5">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) upload(file);
                  }}
                />
                Glisser-déposer ou parcourir
              </label>
              {isPending ? <p className="text-xs text-stone-500">Envoi en cours…</p> : null}
              {message ? <p className="text-xs text-red-600">{message}</p> : null}
              {draftUrl ? (
                <p className="truncate text-xs text-stone-500">Image sélectionnée</p>
              ) : null}
            </TabsContent>
            <TabsContent value="link" className="space-y-2 pt-2">
              <Input
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder="https://..."
              />
              <button
                type="button"
                className="text-sm text-stone-600 underline dark:text-stone-400"
                onClick={() => linkUrl.trim() && setDraftUrl(linkUrl.trim())}
              >
                Utiliser ce lien
              </button>
            </TabsContent>
          </Tabs>
          <button
            type="button"
            disabled={!draftUrl}
            className="w-full rounded-lg bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900"
            onClick={() => {
              onApply(draftUrl, draftType);
              onOpenChange(false);
            }}
          >
            Appliquer
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
