import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    
    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: "Keine Audio-Datei empfangen" },
        { status: 400 }
      );
    }

    // Audio an Whisper API senden
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "de", // Deutsch
      response_format: "text",
    });

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
