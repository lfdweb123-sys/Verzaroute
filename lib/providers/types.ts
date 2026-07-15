/**
 * Types de messages multimodaux : content peut être une simple chaîne (rétrocompatible)
 * ou un tableau de blocs (texte + images + documents), pour permettre l'envoi de
 * fichiers depuis l'interface de chat du dashboard.
 */
export interface TextContentBlock {
  type: "text";
  text: string;
}

export interface ImageContentBlock {
  type: "image";
  /** Image encodée en base64 (sans le préfixe data:...;base64,) */
  base64: string;
  mimeType: string; // ex: "image/png", "image/jpeg", "image/webp"
}

export interface DocumentContentBlock {
  type: "document";
  /** Document encodé en base64 (PDF principalement, supporté nativement par Claude/Gemini) */
  base64: string;
  mimeType: string; // ex: "application/pdf"
  filename?: string;
}

export type ContentBlock = TextContentBlock | ImageContentBlock | DocumentContentBlock;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentBlock[];
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