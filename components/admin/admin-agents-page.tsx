"use client";

import Link from "next/link";
import { Bot } from "lucide-react";
import { DeleteAiAgentButton } from "@/components/admin/delete-ai-agent-button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import type { AiAgent } from "@/lib/ai/types";

type AdminAgentsPageProps = {
  agents: AiAgent[];
};

export function AdminAgentsPageClient({ agents }: AdminAgentsPageProps) {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={[{ label: "AI Agents" }]}
        actions={
          <Link
            href="/admin/agents/new"
            className="inline-flex h-9 items-center rounded-xl bg-amber-500 px-4 text-sm font-semibold text-stone-950 transition hover:bg-amber-400"
          >
            New agent
          </Link>
        }
      />

      {agents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-white p-10 text-center shadow-sm">
          <Bot className="mx-auto size-10 text-stone-300" />
          <p className="mt-3 text-sm text-stone-600">
            Create an agent with your travel context (neighborhoods you lived in, experiences, tone) to help the AI
            write your articles.
          </p>
          <Link
            href="/admin/agents/new"
            className="mt-4 inline-flex h-9 items-center rounded-xl bg-amber-500 px-4 text-sm font-semibold text-stone-950 hover:bg-amber-400"
          >
            Create your first agent
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-100 bg-stone-50/80 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Default</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {agents.map((agent) => (
                <tr key={agent.id} className="transition hover:bg-stone-50/50">
                  <td className="px-4 py-3.5 font-medium text-stone-900">{agent.name}</td>
                  <td className="max-w-md truncate px-4 py-3.5 text-stone-600">
                    {agent.description || agent.context.slice(0, 80)}
                  </td>
                  <td className="px-4 py-3.5 text-stone-600">{agent.is_default ? "Yes" : "—"}</td>
                  <td className="flex gap-3 px-4 py-3.5">
                    <Link href={`/admin/agents/${agent.id}`} className="font-medium text-amber-600 hover:text-amber-700">
                      Edit
                    </Link>
                    <DeleteAiAgentButton id={agent.id} name={agent.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
