import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logApiUsage } from "@/lib/api-logger";

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

    if (!process.env.BFL_API_KEY) {
      return NextResponse.json({ error: "BFL API Key nicht konfiguriert" }, { status: 500 });
    }

    // Get user for credit tracking
    const session = await auth();
    const userId = session?.user?.id;

    // Build edit prompt for Flux Kontext
    const finalPrompt = `Edit this logo: ${editPrompt}. Keep the brand name "${brandName || 'Brand'}" visible. Maintain professional vector logo style, clean design.`;

    console.log("=== LOGO EDIT DEBUG (BFL Flux Kontext Pro) ===");
    console.log("Original image URL:", imageUrl);
    console.log("Edit prompt:", editPrompt);
    console.log("Final prompt:", finalPrompt);
    console.log("==============================================");

    // Step 1: Create request to BFL API
    const createResponse = await fetch("https://api.bfl.ai/v1/flux-kontext-pro", {
      method: "POST",
      headers: {
        "x-key": process.env.BFL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        input_image: imageUrl, // BFL accepts URLs directly
        output_format: "png",
        safety_tolerance: 2,
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("BFL API create error:", errorText);
      return NextResponse.json({ error: `BFL API Fehler: ${errorText}` }, { status: 500 });
    }

    const createResult = await createResponse.json();
    console.log("BFL create response:", JSON.stringify(createResult, null, 2));

    const { polling_url } = createResult;
    if (!polling_url) {
      return NextResponse.json({ error: "Keine Polling-URL erhalten" }, { status: 500 });
    }

    // Step 2: Poll for result
    let editedImageUrl: string | null = null;
    const maxAttempts = 60; // Max 30 seconds (60 * 500ms)
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms

      const pollResponse = await fetch(polling_url, {
        method: "GET",
        headers: {
          "x-key": process.env.BFL_API_KEY,
          "accept": "application/json",
        },
      });

      if (!pollResponse.ok) {
        continue; // Retry on error
      }

      const pollResult = await pollResponse.json();
      console.log(`Poll attempt ${attempt + 1}:`, pollResult.status);

      if (pollResult.status === "Ready") {
        editedImageUrl = pollResult.result?.sample;
        break;
      } else if (pollResult.status === "Error" || pollResult.status === "Failed") {
        console.error("BFL generation failed:", pollResult);
        return NextResponse.json({ error: "Bildbearbeitung fehlgeschlagen" }, { status: 500 });
      }
      // Continue polling for "Pending" or other statuses
    }

    if (!editedImageUrl) {
      return NextResponse.json({ error: "Timeout bei der Bildbearbeitung" }, { status: 500 });
    }

    console.log("Edited image URL:", editedImageUrl);

    // Log API usage for credit tracking
    if (userId) {
      await logApiUsage({
        userId,
        apiProvider: "bfl",
        apiEndpoint: "/api/edit-logo",
        model: "flux-kontext-pro",
        units: 1, // 1 Bild bearbeitet
        unitType: "images",
      });
    }

    return NextResponse.json({
      imageUrl: editedImageUrl,
      prompt: finalPrompt,
      originalImageUrl: imageUrl,
    });

  } catch (error: unknown) {
    console.error("Logo edit error:", error);
    const message = error instanceof Error ? error.message : "Logo-Bearbeitung fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
