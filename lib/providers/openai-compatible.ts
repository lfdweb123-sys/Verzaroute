import type { AiProviderAdapter, ChatCompletionRequest, ChatCompletionResult } from "./types";

/**
 * De nombreux fournisseurs (OpenAI, DeepSeek, Mistral, Moonshot/Kimi, MiniMax, Z.ai, StepFun, xAI/Grok)
 * exposent une API compatible avec le format /chat/completions d'OpenAI.
 * Cet adapter générique évite de dupliquer le code HTTP pour chacun.
 */
export function createOpenAiCompatibleAdapter(opts: {
  id: string;
  baseUrl: string;
  apiKey: string | undefined;
  authHeader?: (key: string) => Record<string, string>;
}): AiProviderAdapter {
  const authHeader = opts.authHeader ?? ((key: string) => ({ Authorization: `Bearer ${key}` }));

  async function callApi(req: ChatCompletionRequest, stream: boolean) {
    if (!opts.apiKey) {
      throw new Error(`Clé API manquante pour le fournisseur "${opts.id}"`);
    }
    const res = await fetch(`${opts.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader(opts.apiKey),
      },
      body: JSON.stringify({
        model: req.model,
        messages: req.messages,
        temperature: req.temperature ?? 0.7,
        max_tokens: req.max_tokens ?? 1024,
        top_p: req.top_p,
        stream,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`[${opts.id}] Erreur API (${res.status}): ${errText}`);
    }
    return res;
  }

  return {
    id: opts.id,
    async chat(req: ChatCompletionRequest): Promise<ChatCompletionResult> {
      const res = await callApi(req, false);
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content ?? "";
      const usage = data?.usage ?? {};
      return {
        content,
        inputTokens: usage.prompt_tokens ?? 0,
        outputTokens: usage.completion_tokens ?? 0,
        raw: data,
      };
    },
    async chatStream(req: ChatCompletionRequest): Promise<ReadableStream<Uint8Array>> {
      const res = await callApi(req, true);
      if (!res.body) throw new Error(`[${opts.id}] Pas de corps de réponse en streaming`);
      return res.body;
    },
  };
}
