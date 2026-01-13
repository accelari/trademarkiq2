import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const MARKUP_FACTOR = 3;
const CREDIT_VALUE = 0.03; // 1 Credit = 0,03€

// Claude Opus 4 Preise
const CLAUDE_INPUT_PRICE_PER_1M = 5.0; // $5 pro 1M Input Tokens
const CLAUDE_OUTPUT_PRICE_PER_1M = 25.0; // $25 pro 1M Output Tokens

// Andere API Preise
const TMSEARCH_PRICE_PER_REQUEST = 0.05; // €0,05 pro Suche
const FALAI_PRICE_PER_IMAGE = 0.04; // €0,04 pro Bild
const WHISPER_PRICE_PER_MINUTE = 0.006; // $0,006 pro Minute

function calculateCosts(inputTokens: number, outputTokens: number) {
  const inputCost = (inputTokens / 1_000_000) * CLAUDE_INPUT_PRICE_PER_1M * 0.92; // USD to EUR
  const outputCost = (outputTokens / 1_000_000) * CLAUDE_OUTPUT_PRICE_PER_1M * 0.92;
  const totalCost = inputCost + outputCost;
  const finalCost = totalCost * MARKUP_FACTOR;
  const credits = Math.ceil(finalCost / CREDIT_VALUE);

  return {
    inputCost,
    outputCost,
    totalCost,
    markup: MARKUP_FACTOR,
    finalCost,
    credits,
  };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { apiType, input } = body;

  if (!input?.trim()) {
    return NextResponse.json({ error: "Input ist erforderlich" }, { status: 400 });
  }

  try {
    switch (apiType) {
      case "claude": {
        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
        });

        // Request speichern
        const requestPayload = {
          model: "claude-sonnet-4-20250514" as const,
          max_tokens: 500,
          messages: [{ role: "user" as const, content: input }],
        };

        const response = await anthropic.messages.create(requestPayload);

        const inputTokens = response.usage.input_tokens;
        const outputTokens = response.usage.output_tokens;
        const totalTokens = inputTokens + outputTokens;

        const costs = calculateCosts(inputTokens, outputTokens);
        const outputContent = response.content[0].type === "text" ? response.content[0].text : "";

        return NextResponse.json({
          success: true,
          apiType: "claude",
          // Was gesendet wurde
          request: {
            endpoint: "https://api.anthropic.com/v1/messages",
            method: "POST",
            payload: requestPayload,
          },
          // Was empfangen wurde
          response: {
            id: response.id,
            model: response.model,
            type: response.type,
            role: response.role,
            content: outputContent,
            stopReason: response.stop_reason,
            usage: response.usage,
          },
          // Rohe API-Antwort
          rawResponse: response,
          usage: {
            inputTokens,
            outputTokens,
            totalTokens,
          },
          costs,
        });
      }

      case "tmsearch": {
        // TMSearch ist pauschal - simuliere Token-Tracking
        const costs = {
          inputCost: 0,
          outputCost: 0,
          totalCost: TMSEARCH_PRICE_PER_REQUEST,
          markup: MARKUP_FACTOR,
          finalCost: TMSEARCH_PRICE_PER_REQUEST * MARKUP_FACTOR,
          credits: Math.ceil((TMSEARCH_PRICE_PER_REQUEST * MARKUP_FACTOR) / CREDIT_VALUE),
        };

        return NextResponse.json({
          success: true,
          apiType: "tmsearch",
          response: {
            note: "TMSearch verwendet pauschale Preise, keine Token-Berechnung",
            pricePerRequest: TMSEARCH_PRICE_PER_REQUEST + "€",
          },
          usage: {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
          },
          costs,
        });
      }

      case "falai": {
        const costs = {
          inputCost: 0,
          outputCost: 0,
          totalCost: FALAI_PRICE_PER_IMAGE,
          markup: MARKUP_FACTOR,
          finalCost: FALAI_PRICE_PER_IMAGE * MARKUP_FACTOR,
          credits: Math.ceil((FALAI_PRICE_PER_IMAGE * MARKUP_FACTOR) / CREDIT_VALUE),
        };

        return NextResponse.json({
          success: true,
          apiType: "falai",
          response: {
            note: "fal.ai verwendet pauschale Preise pro Bild",
            pricePerImage: FALAI_PRICE_PER_IMAGE + "€",
          },
          usage: {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
          },
          costs,
        });
      }

      case "whisper": {
        // Whisper simulieren (1 Minute geschätzt)
        const estimatedMinutes = 1;
        const whisperCost = WHISPER_PRICE_PER_MINUTE * estimatedMinutes * 0.92;
        
        const costs = {
          inputCost: 0,
          outputCost: 0,
          totalCost: whisperCost,
          markup: MARKUP_FACTOR,
          finalCost: whisperCost * MARKUP_FACTOR,
          credits: Math.ceil((whisperCost * MARKUP_FACTOR) / CREDIT_VALUE),
        };

        return NextResponse.json({
          success: true,
          apiType: "whisper",
          response: {
            note: "Whisper berechnet nach Minuten",
            pricePerMinute: WHISPER_PRICE_PER_MINUTE + "$ (~" + (WHISPER_PRICE_PER_MINUTE * 0.92).toFixed(4) + "€)",
            estimatedMinutes,
          },
          usage: {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
          },
          costs,
        });
      }

      default:
        return NextResponse.json({ error: "Unbekannter API-Typ" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Admin API Test] Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "API-Fehler",
        apiType,
      },
      { status: 500 }
    );
  }
}
