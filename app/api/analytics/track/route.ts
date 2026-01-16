import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { userEvents, userSessions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || null;

    const body = await request.json();
    const {
      sessionId,
      eventType,
      eventName,
      pagePath,
      elementId,
      elementText,
      metadata,
    } = body;

    if (!sessionId || !eventType || !eventName) {
      return NextResponse.json(
        { error: "sessionId, eventType and eventName required" },
        { status: 400 }
      );
    }

    // User-Agent und Referrer aus Headers
    const userAgent = request.headers.get("user-agent") || undefined;
    const referrer = request.headers.get("referer") || undefined;

    // Event speichern
    await db.insert(userEvents).values({
      userId,
      sessionId,
      eventType,
      eventName,
      pagePath,
      elementId,
      elementText,
      metadata: metadata || null,
      referrer,
      userAgent,
    });

    // Session aktualisieren oder erstellen
    const existingSession = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.sessionId, sessionId))
      .limit(1);

    if (existingSession.length === 0) {
      // Neue Session erstellen
      const device = detectDevice(userAgent || "");
      const browser = detectBrowser(userAgent || "");

      await db.insert(userSessions).values({
        userId,
        sessionId,
        entryPage: pagePath,
        exitPage: pagePath,
        pageViews: eventType === "page_view" ? 1 : 0,
        events: 1,
        device,
        browser,
      });
    } else {
      // Session aktualisieren
      const current = existingSession[0];
      await db
        .update(userSessions)
        .set({
          exitPage: pagePath || current.exitPage,
          pageViews: eventType === "page_view" 
            ? (current.pageViews || 0) + 1 
            : current.pageViews,
          events: (current.events || 0) + 1,
          endedAt: new Date(),
          duration: Math.floor(
            (new Date().getTime() - new Date(current.startedAt).getTime()) / 1000
          ),
        })
        .where(eq(userSessions.sessionId, sessionId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/analytics/track] Error:", error);
    return NextResponse.json(
      { error: "Failed to track event" },
      { status: 500 }
    );
  }
}

function detectDevice(userAgent: string): string {
  if (/mobile/i.test(userAgent)) return "mobile";
  if (/tablet|ipad/i.test(userAgent)) return "tablet";
  return "desktop";
}

function detectBrowser(userAgent: string): string {
  if (/chrome/i.test(userAgent) && !/edge/i.test(userAgent)) return "Chrome";
  if (/firefox/i.test(userAgent)) return "Firefox";
  if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) return "Safari";
  if (/edge/i.test(userAgent)) return "Edge";
  if (/msie|trident/i.test(userAgent)) return "IE";
  return "Other";
}
