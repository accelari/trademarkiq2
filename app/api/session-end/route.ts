import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { consultations } from "@/db/schema";

const anthropic = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
});

async function generateSmartTitle(summary: string): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-5-20251101",
      max_tokens: 100,
      messages: [{
        role: "user",
        content: `Erstelle einen kurzen, prägnanten Titel (max 50 Zeichen) für diese Markenberatung. Der Titel soll das Hauptthema der Beratung widerspiegeln. Gib NUR den Titel zurück, ohne Anführungszeichen oder zusätzlichen Text.\n\nZusammenfassung:\n${summary}`
      }]
    });
    
    const content = response.content[0];
    if (content.type === "text") {
      return content.text.trim().replace(/^["']|["']$/g, '').substring(0, 60);
    }
  } catch (error) {
    console.error("Title generation error:", error);
  }
  return `Markenberatung ${new Date().toLocaleDateString("de-DE")}`;
}

async function generateSummary(conversation: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-5-20251101",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: `Du bist ein Experte für Markenrecht. Erstelle eine strukturierte Zusammenfassung dieser Markenberatungs-Sitzung.

WICHTIG - Korrektur und Überprüfung:
1. Korrigiere offensichtliche Transkriptionsfehler (z.B. falsch verstandene Wörter durch Spracherkennung)
2. Korrigiere Fachbegriffe: "Nissa" → "Nizza", "DBMA" → "DPMA", "Madriter System" → "Madrider System", etc.
3. Überprüfe die genannten Fakten auf Richtigkeit (Kosten, Fristen, Verfahren) und korrigiere sie falls nötig
4. Wenn Informationen unvollständig oder unklar sind, ergänze sie sinnvoll

Gliederung der Zusammenfassung:
1) Besprochene Themen
2) Wichtige Erkenntnisse (mit korrigierten/geprüften Fakten)
3) Empfehlungen
4) Nächste Schritte

Gespräch:
${conversation}`
    }]
  });

  const content = response.content[0];
  if (content.type !== "text") {
    return "";
  }
  return content.text;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email || !session?.user?.id) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const body = await request.json();
    const { conversation, source, duration } = body;

    if (!conversation) {
      return NextResponse.json({ error: "Keine Konversation" }, { status: 400 });
    }

    // Mindestens 100 Zeichen für sinnvolle Analyse
    if (conversation.length < 100) {
      return NextResponse.json({ saved: false, reason: "Konversation zu kurz" });
    }

    // Mindestens eine Antwort muss vorhanden sein
    if (!conversation.includes("Antwort:")) {
      return NextResponse.json({ saved: false, reason: "Keine Antworten in Konversation" });
    }

    // Zusammenfassung generieren und speichern
    const summary = await generateSummary(conversation);
    const title = await generateSmartTitle(summary);

    // Beratung in Datenbank speichern
    await db.insert(consultations).values({
      userId: session.user.id,
      title,
      summary,
      transcript: conversation,
      duration: duration || 0,
      mode: source === "voice" ? "sprache" : "text",
      emailSent: false,
    });

    console.log("Beratung automatisch gespeichert:", title);

    return NextResponse.json({ saved: true });

  } catch (error: any) {
    console.error("Session-end error:", error);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
