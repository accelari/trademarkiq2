import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { logApiUsage } from "@/lib/api-logger";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Auth für Logging
    const session = await auth();
    const userId = session?.user?.id;
    
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    
    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: "Keine Audio-Datei empfangen" },
        { status: 400 }
      );
    }

    // Audio an Whisper API senden - automatische Spracherkennung
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      // language entfernt → Whisper erkennt automatisch ~100 Sprachen
      response_format: "text",
    });

    const durationMs = Date.now() - startTime;
    
    // Audio-Dauer schätzen (Whisper berechnet pro Minute)
    // Durchschnittliche Audio-Datei: ~1 Minute pro 1MB
    const audioMinutes = Math.max(0.1, audioFile.size / (1024 * 1024));
    
    // API-Nutzung loggen und Credits abziehen
    if (userId) {
      await logApiUsage({
        userId,
        apiProvider: "openai",
        apiEndpoint: "/api/whisper",
        model: "whisper-1",
        units: audioMinutes,
        unitType: "minutes",
        durationMs,
        statusCode: 200,
        metadata: {
          fileSize: audioFile.size,
          fileName: audioFile.name,
        },
      });
    }

    return NextResponse.json({
      success: true,
      text: transcription,
    });
  } catch (error) {
    console.error("Whisper API Error:", error);
    return NextResponse.json(
      { success: false, error: "Transkription fehlgeschlagen" },
      { status: 500 }
    );
  }
}
