export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface CompletionRequest {
  model: string;
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  tools?: ToolDefinition[];
  maxTokens?: number;
}

export interface CompletionResult {
  text: string;
  toolCalls: ToolCall[];
  stopReason: string;
  costUsd: number;
  raw: unknown;
}

export interface LLMProvider {
  /** Préfixes de modèles que ce fournisseur sait servir, ex: ["claude-"] */
  handles: string[];
  complete(req: CompletionRequest): Promise<CompletionResult>;
}
