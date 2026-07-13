import { AiAgentForm } from "@/components/admin/ai-agent-form";

export default function NewAiAgentPage() {
  return (
    <AiAgentForm
      breadcrumbs={[
        { label: "AI Agents", href: "/admin/agents" },
        { label: "New agent" },
      ]}
    />
  );
}
