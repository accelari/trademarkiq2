import { NextRequest, NextResponse } from "next/server";
import { auth, isAdminSession } from "@/lib/auth";
import { db } from "@/db";
import { chatLogs, users, trademarkCases } from "@/db/schema";
import { desc, eq, gte, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  // Admin-Check: Nur Admins dürfen Chat-Logs sehen
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Keine Admin-Berechtigung" }, { status: 403 });
  }

  // Filter aus Query-Parametern
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "today"; // today, week, all
  const userId = searchParams.get("userId");
  const caseId = searchParams.get("caseId");

  try {
    // Datum-Filter berechnen
    let dateFilter;
    const now = new Date();
    if (filter === "today") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateFilter = gte(chatLogs.createdAt, startOfDay);
    } else if (filter === "week") {
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = gte(chatLogs.createdAt, startOfWeek);
    }

    // Logs abrufen mit User- und Case-Infos
    const logs = await db
      .select({
        id: chatLogs.id,
        userId: chatLogs.userId,
        userEmail: users.email,
        userName: users.name,
        caseId: chatLogs.caseId,
        caseName: trademarkCases.trademarkName,
        sessionId: chatLogs.sessionId,
        role: chatLogs.role,
        content: chatLogs.content,
        inputTokens: chatLogs.inputTokens,
        outputTokens: chatLogs.outputTokens,
        totalTokens: chatLogs.totalTokens,
        costEur: chatLogs.costEur,
        credits: chatLogs.credits,
        model: chatLogs.model,
        durationMs: chatLogs.durationMs,
        createdAt: chatLogs.createdAt,
      })
      .from(chatLogs)
      .leftJoin(users, eq(chatLogs.userId, users.id))
      .leftJoin(trademarkCases, eq(chatLogs.caseId, trademarkCases.id))
      .where(
        and(
          dateFilter,
          userId ? eq(chatLogs.userId, userId) : undefined,
          caseId ? eq(chatLogs.caseId, caseId) : undefined
        )
      )
      .orderBy(desc(chatLogs.createdAt))
      .limit(500);

    // Logs nach Session gruppieren
    const sessionMap = new Map<string, {
      sessionId: string;
      userId: string;
      userEmail?: string;
      userName?: string;
      caseId?: string;
      caseName?: string;
      messages: typeof logs;
      totalInputTokens: number;
      totalOutputTokens: number;
      totalTokens: number;
      totalCostEur: number;
      totalCredits: number;
      startedAt: Date;
    }>();

    for (const log of logs) {
      const sessionId = log.sessionId || log.id; // Fallback auf Message-ID
      
      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, {
          sessionId,
          userId: log.userId,
          userEmail: log.userEmail || undefined,
          userName: log.userName || undefined,
          caseId: log.caseId || undefined,
          caseName: log.caseName || undefined,
          messages: [],
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalTokens: 0,
          totalCostEur: 0,
          totalCredits: 0,
          startedAt: log.createdAt,
        });
      }

      const session = sessionMap.get(sessionId)!;
      session.messages.push(log);
      session.totalInputTokens += log.inputTokens || 0;
      session.totalOutputTokens += log.outputTokens || 0;
      session.totalTokens += log.totalTokens || 0;
      session.totalCostEur += parseFloat(log.costEur || "0");
      session.totalCredits += log.credits || 0;
      
      // Frühestes Datum als Start
      if (log.createdAt < session.startedAt) {
        session.startedAt = log.createdAt;
      }
    }

    // Sessions sortieren (neueste zuerst) und Messages chronologisch ordnen
    const sessions = Array.from(sessionMap.values())
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .map((s) => ({
        ...s,
        messages: s.messages.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ),
      }));

    // Statistiken berechnen
    const stats = {
      totalSessions: sessions.length,
      totalMessages: logs.length,
      totalTokens: logs.reduce((acc, l) => acc + (l.totalTokens || 0), 0),
      totalCost: logs.reduce((acc, l) => acc + parseFloat(l.costEur || "0"), 0),
      totalCredits: logs.reduce((acc, l) => acc + (l.credits || 0), 0),
    };

    return NextResponse.json({ sessions, stats });
  } catch (error) {
    console.error("[GET /api/admin/chat-logs] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Chat-Logs" },
      { status: 500 }
    );
  }
}
