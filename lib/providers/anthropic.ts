import type { AiProviderAdapter, ChatCompletionRequest, ChatCompletionResult, ChatMessage } from "./types";

export function createAnthropicAdapter(apiKey: string | undefined): AiProviderAdapter {
  const baseUrl = "https://api.anthropic.com/v1/messages";

  /** Convertit nos blocs de contenu génériques vers le format natif Anthropic. */
  function toAnthropicContent(content: ChatMessage["content"]) {
    if (typeof content === "string") return content;
    return content.map((block) => {
      if (block.type === "text") {
        return { type: "text", text: block.text };
      }
      if (block.type === "image") {
        return {
          type: "image",
          source: { type: "base64", media_type: block.mimeType, data: block.base64 },
        };
      }
      return {
        type: "document",
        source: { type: "base64", media_type: block.mimeType, data: block.base64 },
      };
    });
  }

  function splitSystem(req: ChatCompletionRequest) {
    const system = req.messages.find((m) => m.role === "system")?.content;
    const messages = req.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: toAnthropicContent(m.content) }));
    return { system: typeof system === "string" ? system : undefined, messages };
  }

  async function callApi(req: ChatCompletionRequest, stream: boolean) {
    if (!apiKey) throw new Error('Clé API manquante pour le fournisseur "anthropic"');
    const { system, messages } = splitSystem(req);
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: req.model,
        system,
        messages,
        max_tokens: req.max_tokens ?? 1024,
        temperature: req.temperature ?? 0.7,
        stream,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`[anthropic] Erreur API (${res.status}): ${errText}`);
    }
    return res;
  }

  return {
    id: "anthropic",
    async chat(req: ChatCompletionRequest): Promise<ChatCompletionResult> {
      const res = await callApi(req, false);
      const data = await res.json();
      const content = (data?.content ?? []).map((b: { text?: string }) => b.text ?? "").join("");
      return {
        content,
        inputTokens: data?.usage?.input_tokens ?? 0,
        outputTokens: data?.usage?.output_tokens ?? 0,
        raw: data,
      };
    },
    async chatStream(req: ChatCompletionRequest): Promise<ReadableStream<Uint8Array>> {
      const res = await callApi(req, true);
      if (!res.body) throw new Error("[anthropic] Pas de corps de réponse en streaming");
      return res.body;
    },
  };
}