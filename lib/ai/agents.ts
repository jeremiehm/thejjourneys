import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AiAgent } from "@/lib/ai/types";

export type AgentContext = {
  id: string;
  name: string;
  context: string;
  tone: string | null;
};

export async function getAiAgents(): Promise<AiAgent[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("ai_agents")
    .select("*")
    .order("is_default", { ascending: false })
    .order("name");
  if (error) {
    if (process.env.NODE_ENV === "development") console.error("[getAiAgents]", error.message);
    return [];
  }
  return (data ?? []) as AiAgent[];
}

export async function getAiAgentById(id: string): Promise<AiAgent | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("ai_agents").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return data as AiAgent;
}

export async function resolveAgentContext(agentId?: string): Promise<AgentContext | null> {
  if (!agentId) return null;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("ai_agents")
    .select("id, name, context, tone")
    .eq("id", agentId)
    .maybeSingle();
  return data as AgentContext | null;
}
