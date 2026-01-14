import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, userEvents, userSessions, chatLogs, trademarkCases } from "@/db/schema";
import { desc, eq, gte, count, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") || "overview"; // overview, users, user-detail
  const userId = searchParams.get("userId");
  const filter = searchParams.get("filter") || "week"; // today, week, month, all

  try {
    // Datum-Filter berechnen
    const now = new Date();
    let dateFilter;
    if (filter === "today") {
      dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (filter === "week") {
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (filter === "month") {
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    if (view === "overview") {
      // Übersicht-Statistiken
      const totalUsers = await db.select({ count: count() }).from(users);
      
      const activeUsersQuery = dateFilter
        ? db.select({ count: sql<number>`count(distinct ${userSessions.userId})` })
            .from(userSessions)
            .where(gte(userSessions.startedAt, dateFilter))
        : db.select({ count: sql<number>`count(distinct ${userSessions.userId})` }).from(userSessions);
      const activeUsers = await activeUsersQuery;

      const totalSessionsQuery = dateFilter
        ? db.select({ count: count() }).from(userSessions).where(gte(userSessions.startedAt, dateFilter))
        : db.select({ count: count() }).from(userSessions);
      const totalSessions = await totalSessionsQuery;

      const totalEventsQuery = dateFilter
        ? db.select({ count: count() }).from(userEvents).where(gte(userEvents.createdAt, dateFilter))
        : db.select({ count: count() }).from(userEvents);
      const totalEvents = await totalEventsQuery;

      const totalChatsQuery = dateFilter
        ? db.select({ count: count() }).from(chatLogs).where(gte(chatLogs.createdAt, dateFilter))
        : db.select({ count: count() }).from(chatLogs);
      const totalChats = await totalChatsQuery;

      // Letzte Aktivitäten
      const recentEvents = await db
        .select({
          id: userEvents.id,
          userId: userEvents.userId,
          userName: users.name,
          userEmail: users.email,
          eventType: userEvents.eventType,
          eventName: userEvents.eventName,
          pagePath: userEvents.pagePath,
          createdAt: userEvents.createdAt,
        })
        .from(userEvents)
        .leftJoin(users, eq(userEvents.userId, users.id))
        .orderBy(desc(userEvents.createdAt))
        .limit(20);

      return NextResponse.json({
        stats: {
          totalUsers: totalUsers[0]?.count || 0,
          activeUsers: activeUsers[0]?.count || 0,
          totalSessions: totalSessions[0]?.count || 0,
          totalEvents: totalEvents[0]?.count || 0,
          totalChats: totalChats[0]?.count || 0,
        },
        recentEvents,
      });
    }

    if (view === "users") {
      // Benutzerliste mit Statistiken
      const userList = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          createdAt: users.createdAt,
          isAdmin: users.isAdmin,
        })
        .from(users)
        .orderBy(desc(users.createdAt));

      // Für jeden Benutzer: Session-Count, Event-Count, Chat-Count
      const enrichedUsers = await Promise.all(
        userList.map(async (user) => {
          const sessionCount = await db
            .select({ count: count() })
            .from(userSessions)
            .where(eq(userSessions.userId, user.id));

          const eventCount = await db
            .select({ count: count() })
            .from(userEvents)
            .where(eq(userEvents.userId, user.id));

          const chatCount = await db
            .select({ count: count() })
            .from(chatLogs)
            .where(eq(chatLogs.userId, user.id));

          const caseCount = await db
            .select({ count: count() })
            .from(trademarkCases)
            .where(eq(trademarkCases.userId, user.id));

          const lastSession = await db
            .select({ startedAt: userSessions.startedAt })
            .from(userSessions)
            .where(eq(userSessions.userId, user.id))
            .orderBy(desc(userSessions.startedAt))
            .limit(1);

          return {
            ...user,
            sessions: sessionCount[0]?.count || 0,
            events: eventCount[0]?.count || 0,
            chats: chatCount[0]?.count || 0,
            cases: caseCount[0]?.count || 0,
            lastActive: lastSession[0]?.startedAt || user.createdAt,
          };
        })
      );

      return NextResponse.json({ users: enrichedUsers });
    }

    if (view === "user-detail" && userId) {
      // Benutzer-Detail mit Journey
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length) {
        return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
      }

      // Sessions des Benutzers
      const sessions = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.userId, userId))
        .orderBy(desc(userSessions.startedAt))
        .limit(50);

      // Events des Benutzers (letzte 200)
      const events = await db
        .select()
        .from(userEvents)
        .where(eq(userEvents.userId, userId))
        .orderBy(desc(userEvents.createdAt))
        .limit(200);

      // Chats des Benutzers
      const chats = await db
        .select({
          id: chatLogs.id,
          role: chatLogs.role,
          content: chatLogs.content,
          inputTokens: chatLogs.inputTokens,
          outputTokens: chatLogs.outputTokens,
          totalTokens: chatLogs.totalTokens,
          costEur: chatLogs.costEur,
          credits: chatLogs.credits,
          createdAt: chatLogs.createdAt,
        })
        .from(chatLogs)
        .where(eq(chatLogs.userId, userId))
        .orderBy(desc(chatLogs.createdAt))
        .limit(100);

      // Fälle des Benutzers
      const cases = await db
        .select({
          id: trademarkCases.id,
          caseNumber: trademarkCases.caseNumber,
          trademarkName: trademarkCases.trademarkName,
          status: trademarkCases.status,
          createdAt: trademarkCases.createdAt,
        })
        .from(trademarkCases)
        .where(eq(trademarkCases.userId, userId))
        .orderBy(desc(trademarkCases.createdAt));

      return NextResponse.json({
        user: user[0],
        sessions,
        events,
        chats,
        cases,
      });
    }

    return NextResponse.json({ error: "Ungültige Ansicht" }, { status: 400 });
  } catch (error) {
    console.error("[GET /api/admin/analytics] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Analytics" },
      { status: 500 }
    );
  }
}
