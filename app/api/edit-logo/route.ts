import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

// Configure fal.ai client
fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, editPrompt, brandName } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "Bild-URL ist erforderlich" }, { status: 400 });
    }

    if (!editPrompt) {
      return NextResponse.json({ error: "Bearbeitungsanweisung ist erforderlich" }, { status: 400 });
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: "fal.ai API Key nicht konfiguriert" }, { status: 500 });
    }

    // Build edit prompt for Flux Kontext
    const finalPrompt = `Edit this logo: ${editPrompt}. Keep the brand name "${brandName || 'Brand'}" visible. Maintain professional vector logo style, clean design.`;

    console.log("=== LOGO EDIT DEBUG (Flux Kontext) ===");
    console.log("Original image URL:", imageUrl);
    console.log("Edit prompt:", editPrompt);
    console.log("Final prompt:", finalPrompt);
    console.log("======================================");

    // Call Flux Kontext for image editing
    const result = await fal.subscribe("fal-ai/flux-pro/kontext", {
      input: {
        prompt: finalPrompt,
        image_url: imageUrl,
      },
      logs: true,
    });

    console.log("fal.ai Flux Kontext full response:", JSON.stringify(result, null, 2));

    // Extract image URL from result - try multiple possible structures
    const resultAny = result as Record<string, unknown>;
    const editedImageUrl = 
      (resultAny.data as { images?: { url: string }[] })?.images?.[0]?.url ||
      (resultAny.images as { url: string }[])?.[0]?.url ||
      (resultAny as { image?: { url: string } })?.image?.url ||
      (resultAny.data as { image?: { url: string } })?.image?.url ||
      (resultAny as { url?: string })?.url ||
      (resultAny.data as { url?: string })?.url;
    
    console.log("Extracted image URL:", editedImageUrl);

    if (editedImageUrl) {
      return NextResponse.json({
        imageUrl: editedImageUrl,
        prompt: finalPrompt,
        originalImageUrl: imageUrl,
      });
    }

    return NextResponse.json({ error: "Keine Bilddaten in der Antwort" }, { status: 500 });

  } catch (error: unknown) {
    console.error("Logo edit error:", error);
    const message = error instanceof Error ? error.message : "Logo-Bearbeitung fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
