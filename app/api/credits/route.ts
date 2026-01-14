import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserCredits, getCreditHistory, getUserUsageStats, setWarningThreshold, CREDIT_PACKAGES } from "@/lib/credit-manager";

// GET: Credit-Stand und Statistiken abrufen
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "balance";

    switch (type) {
      case "balance": {
        // Aktueller Credit-Stand
        const creditInfo = await getUserCredits(userId);
        return NextResponse.json({
          success: true,
          ...creditInfo,
        });
      }

      case "history": {
        // Transaktionshistorie
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");
        const transactionType = searchParams.get("transactionType") || undefined;
        
        const history = await getCreditHistory(userId, {
          limit,
          offset,
          type: transactionType,
        });
        
        return NextResponse.json({
          success: true,
          ...history,
        });
      }

      case "usage": {
        // Verbrauchsstatistiken
        const startDate = searchParams.get("startDate") 
          ? new Date(searchParams.get("startDate")!) 
          : undefined;
        const endDate = searchParams.get("endDate") 
          ? new Date(searchParams.get("endDate")!) 
          : undefined;
        
        const stats = await getUserUsageStats(userId, { startDate, endDate });
        
        return NextResponse.json({
          success: true,
          ...stats,
        });
      }

      case "packages": {
        // Verfügbare Credit-Pakete
        return NextResponse.json({
          success: true,
          packages: CREDIT_PACKAGES,
        });
      }

      default:
        return NextResponse.json({ error: "Ungültiger Typ" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Credits API] Error:", error);
    return NextResponse.json({ error: "Fehler beim Abrufen der Credits" }, { status: 500 });
  }
}

// POST: Credit-Einstellungen ändern
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case "setWarningThreshold": {
        const { threshold } = params;
        if (typeof threshold !== "number" || threshold < 0) {
          return NextResponse.json({ error: "Ungültiger Schwellenwert" }, { status: 400 });
        }
        
        const result = await setWarningThreshold(userId, threshold);
        return NextResponse.json({
          success: result.success,
          error: result.error,
        });
      }

      default:
        return NextResponse.json({ error: "Ungültige Aktion" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Credits API] Error:", error);
    return NextResponse.json({ error: "Fehler bei der Credit-Aktion" }, { status: 500 });
  }
}
