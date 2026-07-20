import type { LLMProvider } from "../types";

/**
 * Stubs volontaires : la Phase 2 valide le framework d'agents avec Claude uniquement.
 * Chaque stub respecte déjà l'interface LLMProvider — brancher le SDK correspondant
 * (openai, @google/generative-ai, ou l'API DeepSeek) suffira à les activer sans toucher
 * à l'orchestrateur ni au reste du routeur.
 */

function notImplemented(providerName: string): LLMProvider {
  return {
    handles: [],
    async complete() {
      throw new Error(
        `Le fournisseur ${providerName} n'est pas encore branché. Voir packages/llm-router/providers/stubs.ts.`
      );
    },
  };
}

export function createOpenAIProvider(_apiKey: string | undefined): LLMProvider {
  const provider = notImplemented("OpenAI");
  provider.handles = ["gpt-"];
  return provider;
}

export function createGeminiProvider(_apiKey: string | undefined): LLMProvider {
  const provider = notImplemented("Gemini");
  provider.handles = ["gemini-"];
  return provider;
}

export function createDeepSeekProvider(_apiKey: string | undefined): LLMProvider {
  const provider = notImplemented("DeepSeek");
  provider.handles = ["deepseek-"];
  return provider;
}
