import type { AiProviderAdapter, ChatCompletionRequest, ChatCompletionResult, ChatMessage } from "./types";

export function createGoogleAdapter(apiKey: string | undefined): AiProviderAdapter {
  /** Convertit nos blocs de contenu génériques vers le format natif Gemini (parts: [...]). */
  function toGeminiParts(content: ChatMessage["content"]) {
    if (typeof content === "string") return [{ text: content }];
    return content.map((block) => {
      if (block.type === "text") return { text: block.text };
      return { inline_data: { mime_type: block.mimeType, data: block.base64 } };
    });
  }

  function toGeminiContents(req: ChatCompletionRequest) {
    const systemMsg = req.messages.find((m) => m.role === "system")?.content;
    const contents = req.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: toGeminiParts(m.content) }));
    return { systemMsg: typeof systemMsg === "string" ? systemMsg : undefined, contents };
  }

  async function callApi(req: ChatCompletionRequest, stream: boolean) {
    if (!apiKey) throw new Error('Clé API manquante pour le fournisseur "google"');
    const { systemMsg, contents } = toGeminiContents(req);
    const method = stream ? "streamGenerateContent" : "generateContent";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${req.model}:${method}?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: systemMsg ? { parts: [{ text: systemMsg }] } : undefined,
        generationConfig: {
          temperature: req.temperature ?? 0.7,
          maxOutputTokens: req.max_tokens ?? 1024,
        },
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`[google] Erreur API (${res.status}): ${errText}`);
    }
    return res;
  }

  return {
    id: "google",
    async chat(req: ChatCompletionRequest): Promise<ChatCompletionResult> {
      const res = await callApi(req, false);
      const data = await res.json();
      const content = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
      const usage = data?.usageMetadata ?? {};
      return {
        content,
        inputTokens: usage.promptTokenCount ?? 0,
        outputTokens: usage.candidatesTokenCount ?? 0,
        raw: data,
      };
    },
    async chatStream(req: ChatCompletionRequest): Promise<ReadableStream<Uint8Array>> {
      const res = await callApi(req, true);
      if (!res.body) throw new Error("[google] Pas de corps de réponse en streaming");
      return res.body;
    },
  };
}