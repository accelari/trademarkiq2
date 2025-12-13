import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { contactRequests } from "@/db/schema";

interface ContactRequestBody {
  message?: string;
  subject?: string;
  requestType?: "message" | "appointment";
  preferredDate?: string;
  timePreference?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { id } = await params;
    const body: ContactRequestBody = await request.json();
    const { message, subject, requestType, preferredDate, timePreference } = body;

    let formattedMessage = "";
    
    if (requestType === "appointment") {
      formattedMessage = `[TERMINANFRAGE]
Gewünschtes Datum: ${preferredDate || "Nicht angegeben"}
Zeitpräferenz: ${timePreference || "Flexibel"}
Beschreibung: ${message || "Keine Beschreibung"}`;
    } else if (requestType === "message") {
      formattedMessage = `[NACHRICHT]
Betreff: ${subject || "Allgemeine Anfrage"}
Nachricht: ${message || "Keine Nachricht"}`;
    } else {
      formattedMessage = message || "";
    }

    const [contactRequest] = await db
      .insert(contactRequests)
      .values({
        userId: session.user.id,
        expertId: id,
        message: formattedMessage || null,
        status: "pending",
      })
      .returning();

    return NextResponse.json(contactRequest);
  } catch (error) {
    console.error("Error creating contact request:", error);
    return NextResponse.json({ error: "Fehler beim Senden" }, { status: 500 });
  }
}
