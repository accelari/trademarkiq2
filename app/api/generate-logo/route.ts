import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";

// Professional prompt template for trademark-ready logos
function buildLogoPrompt(userPrompt: string, trademarkType: string, brandName: string): string {
  const baseStyle = `Professional trademark logo design, clean vector style, high contrast, simple memorable shapes, suitable for trademark registration, white or transparent background, no photorealistic elements, no gradients with more than 2 colors`;
  
  if (trademarkType === "bildmarke") {
    // Pure image mark - no text
    return `${baseStyle}. Abstract or symbolic logo WITHOUT any text or letters. ${userPrompt}. The design should be distinctive and unique, avoiding generic symbols like globes, arrows, or common geometric shapes.`;
  } else if (trademarkType === "wort-bildmarke") {
    // Word-image mark - include the brand name
    return `${baseStyle}. Logo design incorporating the text "${brandName}" as a key visual element. ${userPrompt}. The typography should be clear and legible, integrated harmoniously with any graphic elements.`;
  } else {
    // Wortmarke - stylized text only
    return `${baseStyle}. Typographic logo design featuring only the text "${brandName}" in a distinctive, memorable font style. ${userPrompt}. No additional graphic elements, focus on unique letterforms and typography.`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, trademarkType, brandName, quality = "high" } = body;

    if (!prompt && !brandName) {
      return NextResponse.json({ error: "Prompt oder Markenname ist erforderlich" }, { status: 400 });
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API Key nicht konfiguriert" }, { status: 500 });
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

    // Call OpenAI Images API with DALL-E 3
    const response = await fetch(OPENAI_IMAGES_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: finalPrompt,
        n: 1,
        size: "1024x1024", // dall-e-3 supports: 1024x1024, 1024x1792, 1792x1024
        quality: quality === "high" ? "hd" : "standard", // dall-e-3: "standard" or "hd"
        style: "vivid", // "vivid" or "natural"
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI Images API error:", errorData);
      
      // Handle specific error cases
      if (response.status === 401) {
        return NextResponse.json({ error: "OpenAI API Key ungültig" }, { status: 401 });
      }
      if (response.status === 429) {
        return NextResponse.json({ error: "Rate Limit erreicht. Bitte warte einen Moment." }, { status: 429 });
      }
      if (response.status === 400 && errorData?.error?.code === "content_policy_violation") {
        return NextResponse.json({ error: "Der Prompt verstößt gegen die Inhaltsrichtlinien. Bitte formuliere ihn um." }, { status: 400 });
      }
      
      return NextResponse.json(
        { error: errorData?.error?.message || `API Fehler: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // gpt-image-1 returns base64 encoded images
    if (data.data && data.data[0]) {
      const imageData = data.data[0];
      
      // Return the image - either as URL or base64
      if (imageData.url) {
        return NextResponse.json({ 
          imageUrl: imageData.url,
          revisedPrompt: imageData.revised_prompt,
        });
      } else if (imageData.b64_json) {
        // Return as data URL for immediate display
        return NextResponse.json({ 
          imageUrl: `data:image/png;base64,${imageData.b64_json}`,
          revisedPrompt: imageData.revised_prompt,
        });
      }
    }

    return NextResponse.json({ error: "Keine Bilddaten in der Antwort" }, { status: 500 });

  } catch (error: unknown) {
    console.error("Logo generation error:", error);
    const message = error instanceof Error ? error.message : "Logo-Generierung fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
