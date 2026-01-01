import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

// Configure fal.ai client
fal.config({
  credentials: process.env.FAL_KEY,
});

// Professional prompt template for trademark-ready logos
function buildLogoPrompt(userPrompt: string, trademarkType: string, brandName: string): string {
  // Basis-Stil OHNE white background - Farben kommen aus userPrompt von Claude
  const baseStyle = `Professional trademark logo design, clean vector style, high contrast, simple memorable shapes, suitable for trademark registration, no photorealistic elements, minimalist, modern`;
  
  if (trademarkType === "bildmarke") {
    // Pure image mark - no text at all
    return `${baseStyle}. Abstract or symbolic logo WITHOUT any text, letters or words. Pure graphic symbol only. ${userPrompt}. The design should be distinctive and unique, avoiding generic symbols.`;
  } else if (trademarkType === "wort-bildmarke") {
    // Word-image mark - text artistically INTEGRATED into the design
    return `${baseStyle}. Combined word-image logo where the text "${brandName}" is ARTISTICALLY INTEGRATED into the graphic design as ONE unified visual. The text should be part of the artwork, not placed separately below. Creative typography merged with graphic elements. ${userPrompt}. The word and image must form a single cohesive design.`;
  } else {
    // Wortmarke - stylized text only, no graphics
    return `${baseStyle}. Typographic logo featuring ONLY the text "${brandName}" in a distinctive, artistic font style. No additional graphic elements or symbols. ${userPrompt}. Focus on unique letterforms, creative typography and text design only.`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, trademarkType, brandName } = body;

    if (!prompt && !brandName) {
      return NextResponse.json({ error: "Prompt oder Markenname ist erforderlich" }, { status: 400 });
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: "fal.ai API Key nicht konfiguriert" }, { status: 500 });
    }

    // Build the optimized prompt for trademark logos
    const finalPrompt = buildLogoPrompt(
      prompt || `Modern, minimalist logo design`,
      trademarkType || "wort-bildmarke",
      brandName || "Brand"
    );

    console.log("Logo generation request:", {
      originalPrompt: prompt,
      trademarkType,
      brandName,
      finalPrompt: finalPrompt.substring(0, 100) + "...",
    });

    // Call fal.ai NanoBanana for logo generation (outputs PNG for Flux Kontext editing)
    const result = await fal.subscribe("fal-ai/ideogram/v2/turbo", {
      input: {
        prompt: finalPrompt,
        aspect_ratio: "1:1", // Quadratisch für Logos
      },
      logs: true,
    }) as { data?: { images?: { url: string }[] } };

    console.log("fal.ai response:", result);

    // Extract image URL from result
    const imageUrl = result.data?.images?.[0]?.url;
    
    if (imageUrl) {
      return NextResponse.json({ 
        imageUrl,
        prompt: finalPrompt,
      });
    }

    return NextResponse.json({ error: "Keine Bilddaten in der Antwort" }, { status: 500 });

  } catch (error: unknown) {
    console.error("Logo generation error:", error);
    const message = error instanceof Error ? error.message : "Logo-Generierung fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
