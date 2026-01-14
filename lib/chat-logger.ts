import { db } from "@/db";
import { chatLogs } from "@/db/schema";

// Claude Opus 4 Preise (Januar 2026)
// Quelle: https://www.anthropic.com/pricing
const CLAUDE_OPUS_INPUT_PRICE_PER_1M = 15.0; // $15 pro 1M Input Tokens
const CLAUDE_OPUS_OUTPUT_PRICE_PER_1M = 75.0; // $75 pro 1M Output Tokens
const USD_TO_EUR = 0.92;
const MARKUP_FACTOR = 3; // ×3 Markup für Kundenpreis
const CREDIT_VALUE = 0.03; // 1 Credit = 0,03€

export interface LogChatParams {
  userId: string;
  caseId?: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  inputTokens?: number;
  outputTokens?: number;
  model?: string;
  durationMs?: number;
}

export function calculateCosts(inputTokens: number, outputTokens: number) {
  const inputCost = (inputTokens / 1_000_000) * CLAUDE_OPUS_INPUT_PRICE_PER_1M * USD_TO_EUR;
  const outputCost = (outputTokens / 1_000_000) * CLAUDE_OPUS_OUTPUT_PRICE_PER_1M * USD_TO_EUR;
  const totalCost = inputCost + outputCost;
  const finalCost = totalCost * MARKUP_FACTOR;
  const credits = Math.ceil(finalCost / CREDIT_VALUE);

  return {
    inputCost,
    outputCost,
    totalCost,
    finalCost,
    credits: credits > 0 ? credits : 0,
  };
}

export async function logChatMessage(params: LogChatParams) {
  const { userId, caseId, sessionId, role, content, inputTokens = 0, outputTokens = 0, model, durationMs } = params;

  const totalTokens = inputTokens + outputTokens;
  const costs = calculateCosts(inputTokens, outputTokens);

  try {
    await db.insert(chatLogs).values({
      userId,
      caseId,
      sessionId,
      role,
      content,
      inputTokens,
      outputTokens,
      totalTokens,
      costEur: costs.totalCost.toFixed(6),
      credits: costs.credits,
      model,
      durationMs,
    });

    return { success: true, costs };
  } catch (error) {
    console.error("[logChatMessage] Error:", error);
    return { success: false, error };
  }
}

export function generateSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
