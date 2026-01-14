import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logApiUsage } from "@/lib/api-logger";

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
    const session = await auth();
    const userId = session?.user?.id;
    
    const body = await req.json();
    const { prompt, trademarkType, brandName, model = "V_2_TURBO" } = body;

    if (!prompt && !brandName) {
      return NextResponse.json({ error: "Prompt oder Markenname ist erforderlich" }, { status: 400 });
    }

    if (!process.env.IDEOGRAM_API_KEY) {
      return NextResponse.json({ error: "Ideogram API Key nicht konfiguriert" }, { status: 500 });
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
      model,
      finalPrompt: finalPrompt.substring(0, 100) + "...",
    });

    // Call Ideogram API v2 directly
    const response = await fetch("https://api.ideogram.ai/generate", {
      method: "POST",
      headers: {
        "Api-Key": process.env.IDEOGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_request: {
          prompt: finalPrompt,
          model: model, // V_2_TURBO ($0.05) or V_2 ($0.08)
          aspect_ratio: "ASPECT_1_1", // Quadratisch für Logos
          magic_prompt_option: "AUTO",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Ideogram API error:", errorText);
      return NextResponse.json({ error: `Ideogram API Fehler: ${response.status}` }, { status: 500 });
    }

    const result = await response.json();
    console.log("Ideogram API response:", JSON.stringify(result, null, 2));

    // Extract image URL from result
    const imageUrl = result.data?.[0]?.url;
    
    if (imageUrl) {
            // Log API usage for credit tracking
            if (userId) {
              await logApiUsage({
                userId,
                apiProvider: "ideogram",
                apiEndpoint: "/api/generate-logo",
                model: model,
                units: 1, // 1 Bild generiert
                unitType: "images",
              });
            }
      
      return NextResponse.json({ 
        imageUrl,
        prompt: finalPrompt,
        model,
      });
    }

    return NextResponse.json({ error: "Keine Bilddaten in der Antwort" }, { status: 500 });

  } catch (error: unknown) {
    console.error("Logo generation error:", error);
    const message = error instanceof Error ? error.message : "Logo-Generierung fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
