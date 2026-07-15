export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  top_p?: number;
}

export interface ChatCompletionResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  raw: unknown;
}

export interface AiProviderAdapter {
  id: string;
  /** Appelle le fournisseur et normalise la réponse. Ne gère pas le streaming (voir chatStream). */
  chat(req: ChatCompletionRequest): Promise<ChatCompletionResult>;
  /** Retourne un ReadableStream de tokens texte bruts pour le mode stream. */
  chatStream(req: ChatCompletionRequest): Promise<ReadableStream<Uint8Array>>;
}
