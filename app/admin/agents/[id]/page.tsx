import { notFound } from "next/navigation";
import { AiAgentForm } from "@/components/admin/ai-agent-form";
import { getAiAgentById } from "@/lib/ai/agents";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditAiAgentPage({ params }: PageProps) {
  const { id } = await params;
  const agent = await getAiAgentById(id);
  if (!agent) notFound();

  return (
    <AiAgentForm
      agent={agent}
      breadcrumbs={[
        { label: "Agents IA", href: "/admin/agents" },
        { label: agent.name },
      ]}
    />
  );
}
