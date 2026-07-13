import { AdminAgentsPageClient } from "@/components/admin/admin-agents-page";
import { getAiAgents } from "@/lib/ai/agents";

export default async function AdminAgentsPage() {
  const agents = await getAiAgents();
  return <AdminAgentsPageClient agents={agents} />;
}
