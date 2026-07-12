"use client";

import { HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const adminFieldLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500";

export const adminFieldInputClass =
  "h-11 rounded-xl border-stone-200 bg-stone-50/80 shadow-none transition focus-visible:border-amber-400 focus-visible:ring-amber-400/30";

export function AdminField({
  label,
  name,
  defaultValue,
  required,
  placeholder,
  type = "text",
  className,
  tooltip,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  required?: boolean;
  placeholder?: string;
  type?: string;
  className?: string;
  tooltip?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5">
        <Label htmlFor={name} className={adminFieldLabelClass}>
          {label}
        </Label>
        {tooltip ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <button type="button" className="text-stone-400 hover:text-stone-600">
                  <HelpCircle className="size-3.5" />
                </button>
              }
            />
            <TooltipContent side="top" className="max-w-xs text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={adminFieldInputClass}
      />
    </div>
  );
}

export function AdminTextarea({
  label,
  name,
  defaultValue,
  rows = 3,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name} className={adminFieldLabelClass}>
        {label}
      </Label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        className={cn(
          "w-full resize-y rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2.5 text-sm shadow-none outline-none transition focus-visible:border-amber-400 focus-visible:ring-[3px] focus-visible:ring-amber-400/30",
        )}
      />
    </div>
  );
}

export function AdminSelect({
  label,
  name,
  defaultValue,
  options,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <AdminSelectField label={label} name={name} defaultValue={defaultValue} options={options} className={className} />
  );
}

export function AdminSelectField({
  label,
  name,
  defaultValue,
  options,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <AdminNativeSelect label={label} name={name} defaultValue={defaultValue} options={options} className={className} />
  );
}

export function AdminNativeSelect({
  label,
  name,
  defaultValue,
  options,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name} className={adminFieldLabelClass}>
        {label}
      </Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className={cn(
          "h-11 w-full appearance-none rounded-xl border border-stone-200 bg-stone-50/80 bg-[length:16px] bg-[position:right_12px_center] bg-no-repeat px-3 text-sm shadow-none outline-none transition focus-visible:border-amber-400 focus-visible:ring-[3px] focus-visible:ring-amber-400/30",
          "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%2378716c%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E')]",
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function StatusBadge({ status }: { status: "draft" | "published" | string }) {
  if (status === "published") {
    return (
      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Publié</Badge>
    );
  }
  if (status === "archived") {
    return <Badge className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50">Archived</Badge>;
  }
    return <Badge variant="secondary" className="bg-stone-100 text-stone-600 hover:bg-stone-100">Brouillon</Badge>;
}

export function AdminStatusSelect({
  name,
  defaultValue = "draft",
}: {
  name: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className={adminFieldLabelClass}>Status</Label>
      <div className="flex items-center gap-3">
        <StatusBadge status={defaultValue} />
        <AdminNativeSelect
          label=""
          name={name}
          defaultValue={defaultValue}
          options={[
            { value: "draft", label: "Draft" },
            { value: "published", label: "Published" },
          ]}
          className="flex-1 [&_label]:sr-only"
        />
      </div>
    </div>
  );
}
