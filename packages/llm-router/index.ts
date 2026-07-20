import { createAnthropicProvider } from "./providers/anthropic";
import { createOpenAIProvider, createGeminiProvider, createDeepSeekProvider } from "./providers/stubs";
import type { CompletionRequest, CompletionResult, LLMProvider } from "./types";

export * from "./types";

const providers: LLMProvider[] = [
  createAnthropicProvider(process.env.ANTHROPIC_API_KEY),
  createOpenAIProvider(process.env.OPENAI_API_KEY),
  createGeminiProvider(process.env.GOOGLE_AI_API_KEY),
  createDeepSeekProvider(process.env.DEEPSEEK_API_KEY),
];

export async function complete(req: CompletionRequest): Promise<CompletionResult> {
  const provider = providers.find((p) => p.handles.some((prefix) => req.model.startsWith(prefix)));

  if (!provider) {
    throw new Error(
      `Aucun fournisseur ne gère le modèle "${req.model}". Modèles supportés: claude-*, gpt-* (à venir), gemini-* (à venir), deepseek-* (à venir).`
    );
  }

  return provider.complete(req);
}
