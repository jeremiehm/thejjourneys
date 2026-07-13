"use client";

import { useState } from "react";
import { saveAiAgent } from "@/app/admin/actions";
import { AdminPageHeader, type BreadcrumbItem } from "@/components/admin/admin-page-header";
import { AdminField, AdminTextarea, adminFieldLabelClass } from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { AiAgent } from "@/lib/ai/types";

type AiAgentFormProps = {
  agent?: AiAgent | null;
  breadcrumbs: BreadcrumbItem[];
};

export function AiAgentForm({ agent, breadcrumbs }: AiAgentFormProps) {
  const [isDefault, setIsDefault] = useState(agent?.is_default ?? false);

  function handleSubmit() {
    sessionStorage.setItem("admin-toast", agent?.id ? "Agent updated" : "Agent saved");
  }

  return (
    <form action={saveAiAgent} onSubmit={handleSubmit} className="pb-12">
      <input type="hidden" name="id" value={agent?.id ?? ""} />

      <AdminPageHeader
        breadcrumbs={breadcrumbs}
        actions={
          <Button type="submit" className="rounded-xl bg-amber-500 text-stone-950 hover:bg-amber-400">
            Save agent
          </Button>
        }
      />

      <div className="space-y-5 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <AdminField label="Name" name="name" required defaultValue={agent?.name ?? ""} />
          <AdminField label="Slug" name="slug" defaultValue={agent?.slug ?? ""} placeholder="auto if empty" />
        </div>

        <AdminTextarea
          label="Short description"
          name="description"
          defaultValue={agent?.description ?? ""}
          rows={2}
        />

        <AdminTextarea
          label="Travel context (system prompt)"
          name="context"
          defaultValue={agent?.context ?? ""}
          rows={12}
        />

        <AdminField
          label="Voice & tone"
          name="tone"
          defaultValue={agent?.tone ?? ""}
        />

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_default"
            name="is_default"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="size-4 rounded border-stone-300"
          />
          <Label htmlFor="is_default" className={adminFieldLabelClass}>
            Default agent in the editor
          </Label>
        </div>
      </div>
    </form>
  );
}
