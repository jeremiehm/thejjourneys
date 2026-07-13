"use client";

import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AdminImage } from "@/components/admin/admin-image";
import { uploadAdminImage } from "@/lib/admin/upload-image";
import { adminFieldInputClass, adminFieldLabelClass } from "@/components/admin/form-fields";
import { cn } from "@/lib/utils";

type ImageUploadFieldProps = {
  name: string;
  label: string;
  defaultValue?: string | null;
};

export function ImageUploadField({ name, label, defaultValue }: ImageUploadFieldProps) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function upload(file: File) {
    startTransition(async () => {
      setMessage(null);
      const result = await uploadAdminImage(file);
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setValue(result.url);
      setMessage("Image uploaded.");
    });
  }

  return (
    <div className="space-y-2 md:col-span-2">
      <Label className={adminFieldLabelClass}>{label}</Label>
      <input type="hidden" name={name} value={value} />
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="https://..."
        className={adminFieldInputClass}
      />
      <input
        type="file"
        accept="image/*"
        onChange={(event) => (event.target.files?.[0] ? upload(event.target.files[0]) : undefined)}
        className="block w-full text-sm text-stone-500 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-stone-700"
      />
      {isPending ? <p className="text-xs text-stone-500">Uploading...</p> : null}
      {message ? (
        <p className={cn("text-xs", message === "Image uploaded." ? "text-stone-500" : "text-red-600")}>{message}</p>
      ) : null}
      {value ? (
        <div className="relative mt-2 aspect-[16/9] max-w-md overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
          <AdminImage src={value} alt="Cover preview" fill />
        </div>
      ) : (
        <div
          className={cn(
            "mt-2 flex aspect-[16/9] max-w-md items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50 text-xs text-stone-400",
          )}
        >
          Cover preview
        </div>
      )}
    </div>
  );
}
