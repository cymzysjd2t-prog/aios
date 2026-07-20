import Anthropic from "@anthropic-ai/sdk";
import type { CompletionRequest, CompletionResult, LLMProvider, ToolCall } from "../types";

// Tarifs approximatifs (USD / million de tokens) — à ajuster selon le modèle réel utilisé.
// Sert uniquement à alimenter AgentInstance.budgetUsedUsd / AgentRun.costUsd à titre indicatif.
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-opus-4-8": { input: 15, output: 75 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4 },
};

const DEFAULT_PRICING = { input: 3, output: 15 };

function estimateCost(model: string, inputTokens: number, outputTokens: number) {
  const rate = PRICING[model] ?? PRICING["claude-sonnet-5"] ?? DEFAULT_PRICING;
  return (inputTokens / 1_000_000) * rate.input + (outputTokens / 1_000_000) * rate.output;
}

export function createAnthropicProvider(apiKey: string | undefined): LLMProvider {
  const client = apiKey ? new Anthropic({ apiKey }) : null;

  return {
    handles: ["claude-"],
    async complete(req: CompletionRequest): Promise<CompletionResult> {
      if (!client) {
        throw new Error(
          "ANTHROPIC_API_KEY manquante — impossible d'appeler le fournisseur Claude."
        );
      }

      const response = await client.messages.create({
        model: req.model,
        max_tokens: req.maxTokens ?? 1024,
        system: req.system,
        messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
        tools: req.tools as Anthropic.Tool[] | undefined,
      });

      let text = "";
      const toolCalls: ToolCall[] = [];

      for (const block of response.content) {
        if (block.type === "text") {
          text += block.text;
        } else if (block.type === "tool_use") {
          toolCalls.push({
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>,
          });
        }
      }

      return {
        text,
        toolCalls,
        stopReason: response.stop_reason ?? "end_turn",
        costUsd: estimateCost(
          req.model,
          response.usage.input_tokens,
          response.usage.output_tokens
        ),
        raw: response,
      };
    },
  };
}