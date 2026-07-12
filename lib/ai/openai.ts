const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o";

export function getOpenAiModel(): string {
  return process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
}

export function requireOpenAiApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY non configurée.");
  return key;
}

type MessageOptions = {
  system: string;
  userMessage: string;
  maxTokens?: number;
};

/** Stream text deltas from OpenAI Chat Completions API as a ReadableStream. */
export function streamOpenAiMessage(options: MessageOptions): ReadableStream<Uint8Array> {
  const apiKey = requireOpenAiApiKey();
  const model = getOpenAiModel();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const abort = new AbortController();
      const timeout = setTimeout(() => abort.abort(), 90_000);

      try {
        const response = await fetch(OPENAI_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            max_tokens: options.maxTokens ?? 4096,
            stream: true,
            messages: [
              { role: "system", content: options.system },
              { role: "user", content: options.userMessage },
            ],
          }),
          signal: abort.signal,
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          controller.enqueue(encoder.encode(`[ERROR] ${response.status}: ${errText.slice(0, 200)}`));
          controller.close();
          return;
        }

        if (!response.body) {
          controller.enqueue(encoder.encode("[ERROR] Réponse vide de l'API."));
          controller.close();
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const event = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const text = event.choices?.[0]?.delta?.content;
              if (text) controller.enqueue(encoder.encode(text));
            } catch {
              // ignore malformed SSE chunks
            }
          }
        }
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur API";
        controller.enqueue(encoder.encode(`[ERROR] ${message}`));
        controller.close();
      } finally {
        clearTimeout(timeout);
      }
    },
  });
}

export async function fetchOpenAiJson(options: MessageOptions): Promise<string> {
  const apiKey = requireOpenAiApiKey();
  const model = getOpenAiModel();
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 120_000);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens ?? 8192,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: options.system },
          { role: "user", content: options.userMessage },
        ],
      }),
      signal: abort.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`API ${response.status}: ${errText.slice(0, 300)}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return (json.choices?.[0]?.message?.content ?? "").trim();
  } finally {
    clearTimeout(timeout);
  }
}

export function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}
