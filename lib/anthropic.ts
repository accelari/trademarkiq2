import Anthropic from "@anthropic-ai/sdk";

export const anthropicClient = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
});

export const CLAUDE_SONNET = "claude-sonnet-4-20250514";
export const CLAUDE_OPUS = "claude-opus-4-5-20251101";
export const CLAUDE_HAIKU = "claude-3-5-haiku-20241022";
