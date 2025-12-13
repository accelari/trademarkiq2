import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTMSearchClient } from "@/lib/tmsearch/client";
import { db } from "@/db";
import { alerts, watchlistItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const body = await request.json();
    const { watchlistItemId } = body;

    if (!watchlistItemId) {
      return NextResponse.json({ error: "Watchlist-Item ID erforderlich" }, { status: 400 });
    }

    const [item] = await db
      .select()
      .from(watchlistItems)
      .where(and(
        eq(watchlistItems.id, watchlistItemId),
        eq(watchlistItems.userId, session.user.id)
      ));

    if (!item) {
      return NextResponse.json({ error: "Watchlist-Item nicht gefunden" }, { status: 404 });
    }

    const client = getTMSearchClient();
    const isTestMode = client.isTestMode();

    const officeMap: { [key: string]: string } = {
      dpma: "DE",
      euipo: "EU",
      wipo: "WO"
    };

    const itemClasses = item.classes && Array.isArray(item.classes) 
      ? item.classes.map((c: string) => parseInt(c, 10)).filter((n: number) => !isNaN(n))
      : undefined;

    const filters = {
      status: "active" as const,
      offices: item.jurisdiction ? [officeMap[item.jurisdiction] || item.jurisdiction.toUpperCase()] : undefined,
      classes: itemClasses && itemClasses.length > 0 ? itemClasses : undefined,
      minAccuracy: 70,
    };

    const response = await client.searchWithFilters(item.name, filters);

    const conflicts = response.results
      .filter((r) => r.name.toLowerCase() !== item.name.toLowerCase())
      .filter((r) => r.accuracy >= 70)
      .slice(0, 10);

    const newAlerts = [];

    for (const conflict of conflicts) {
      const alertMessage = `Möglicher Konflikt: ${conflict.name} (${conflict.accuracy}% Übereinstimmung)`;
      
      const existingAlert = await db
        .select()
        .from(alerts)
        .where(and(
          eq(alerts.watchlistItemId, watchlistItemId),
          eq(alerts.type, "conflict"),
          eq(alerts.message, alertMessage)
        ));

      if (existingAlert.length === 0) {
        const severity = conflict.accuracy >= 90 ? "high" : conflict.accuracy >= 80 ? "medium" : "low";
        
        const [newAlert] = await db.insert(alerts).values({
          userId: session.user.id,
          watchlistItemId,
          type: "conflict",
          severity,
          message: alertMessage,
        }).returning();
        
        newAlerts.push(newAlert);
      }
    }

    await db
      .update(watchlistItems)
      .set({ lastChecked: new Date() })
      .where(eq(watchlistItems.id, watchlistItemId));

    return NextResponse.json({
      success: true,
      itemName: item.name,
      conflictsFound: conflicts.length,
      newAlertsCreated: newAlerts.length,
      conflicts: conflicts.map((c) => ({
        name: c.name,
        holder: c.holder,
        accuracy: c.accuracy,
        office: c.office,
        niceClasses: c.niceClasses,
        registrationNumber: c.registrationNumber,
        riskLevel: c.accuracy >= 90 ? "high" : c.accuracy >= 80 ? "medium" : "low"
      })),
      isTestMode,
      lastChecked: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Conflict check error:", error);
    return NextResponse.json({
      error: "Fehler bei der Konfliktprüfung",
      details: error.message
    }, { status: 500 });
  }
}
