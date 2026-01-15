import { NextRequest, NextResponse } from "next/server";
import { auth, isAdminSession } from "@/lib/auth";
import { db } from "@/db";
import { apiUsageLogs, users, creditTransactions } from "@/db/schema";
import { eq, sql, desc, and, gte, lte } from "drizzle-orm";

// GET: Admin API-Kosten Übersicht
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    // Admin-Check: Nur Admins dürfen API-Kosten sehen
    if (!isAdminSession(session)) {
      return NextResponse.json({ error: "Keine Admin-Berechtigung" }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "overview";
    const startDate = searchParams.get("startDate") 
      ? new Date(searchParams.get("startDate")!) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Letzte 30 Tage
    const endDate = searchParams.get("endDate") 
      ? new Date(searchParams.get("endDate")!) 
      : new Date();

    switch (type) {
      case "overview": {
        // Gesamtübersicht
        const [totals] = await db
          .select({
            totalCalls: sql<number>`COUNT(*)`,
            totalCostUsd: sql<number>`COALESCE(SUM(CAST(${apiUsageLogs.costUsd} AS DECIMAL)), 0)`,
            totalCostEur: sql<number>`COALESCE(SUM(CAST(${apiUsageLogs.costEur} AS DECIMAL)), 0)`,
            totalCreditsCharged: sql<number>`COALESCE(SUM(CAST(${apiUsageLogs.creditsCharged} AS DECIMAL)), 0)`,
            totalInputTokens: sql<number>`COALESCE(SUM(${apiUsageLogs.inputTokens}), 0)`,
            totalOutputTokens: sql<number>`COALESCE(SUM(${apiUsageLogs.outputTokens}), 0)`,
          })
          .from(apiUsageLogs)
          .where(
            and(
              gte(apiUsageLogs.createdAt, startDate),
              lte(apiUsageLogs.createdAt, endDate)
            )
          );

        // Aufschlüsselung nach API-Provider
        const byProvider = await db
          .select({
            apiProvider: apiUsageLogs.apiProvider,
            callCount: sql<number>`COUNT(*)`,
            totalCostUsd: sql<number>`COALESCE(SUM(CAST(${apiUsageLogs.costUsd} AS DECIMAL)), 0)`,
            totalCostEur: sql<number>`COALESCE(SUM(CAST(${apiUsageLogs.costEur} AS DECIMAL)), 0)`,
            totalCreditsCharged: sql<number>`COALESCE(SUM(CAST(${apiUsageLogs.creditsCharged} AS DECIMAL)), 0)`,
          })
          .from(apiUsageLogs)
          .where(
            and(
              gte(apiUsageLogs.createdAt, startDate),
              lte(apiUsageLogs.createdAt, endDate)
            )
          )
          .groupBy(apiUsageLogs.apiProvider)
          .orderBy(desc(sql`SUM(CAST(${apiUsageLogs.costEur} AS DECIMAL))`));

        // Credit-Einnahmen (Käufe)
        const [purchases] = await db
          .select({
            totalPurchases: sql<number>`COUNT(*)`,
            totalCreditsAdded: sql<number>`COALESCE(SUM(CAST(${creditTransactions.amount} AS DECIMAL)), 0)`,
          })
          .from(creditTransactions)
          .where(
            and(
              eq(creditTransactions.type, "purchase"),
              gte(creditTransactions.createdAt, startDate),
              lte(creditTransactions.createdAt, endDate)
            )
          );

        // Gewinn berechnen (Einnahmen - API-Kosten)
        const creditsValue = Number(totals?.totalCreditsCharged || 0) * 0.03; // 1 Credit = 0.03€
        const apiCosts = Number(totals?.totalCostEur || 0);
        const profit = creditsValue - apiCosts;

        return NextResponse.json({
          success: true,
          period: { startDate, endDate },
          totals: {
            calls: Number(totals?.totalCalls || 0),
            costUsd: Number(totals?.totalCostUsd || 0),
            costEur: Number(totals?.totalCostEur || 0),
            creditsCharged: Number(totals?.totalCreditsCharged || 0),
            inputTokens: Number(totals?.totalInputTokens || 0),
            outputTokens: Number(totals?.totalOutputTokens || 0),
          },
          byProvider: byProvider.map(p => ({
            provider: p.apiProvider,
            calls: Number(p.callCount),
            costUsd: Number(p.totalCostUsd),
            costEur: Number(p.totalCostEur),
            creditsCharged: Number(p.totalCreditsCharged),
          })),
          revenue: {
            purchases: Number(purchases?.totalPurchases || 0),
            creditsAdded: Number(purchases?.totalCreditsAdded || 0),
            creditsValue: creditsValue,
          },
          profit: {
            apiCosts,
            creditsValue,
            netProfit: profit,
            margin: creditsValue > 0 ? (profit / creditsValue * 100).toFixed(1) : 0,
          },
        });
      }

      case "by-user": {
        // Kosten pro Benutzer
        const limit = parseInt(searchParams.get("limit") || "20");
        
        const byUser = await db
          .select({
            userId: apiUsageLogs.userId,
            userName: users.name,
            userEmail: users.email,
            callCount: sql<number>`COUNT(*)`,
            totalCostEur: sql<number>`COALESCE(SUM(CAST(${apiUsageLogs.costEur} AS DECIMAL)), 0)`,
            totalCreditsCharged: sql<number>`COALESCE(SUM(CAST(${apiUsageLogs.creditsCharged} AS DECIMAL)), 0)`,
            currentCredits: users.credits,
          })
          .from(apiUsageLogs)
          .leftJoin(users, eq(apiUsageLogs.userId, users.id))
          .where(
            and(
              gte(apiUsageLogs.createdAt, startDate),
              lte(apiUsageLogs.createdAt, endDate)
            )
          )
          .groupBy(apiUsageLogs.userId, users.name, users.email, users.credits)
          .orderBy(desc(sql`SUM(CAST(${apiUsageLogs.costEur} AS DECIMAL))`))
          .limit(limit);

        return NextResponse.json({
          success: true,
          period: { startDate, endDate },
          users: byUser.map(u => ({
            userId: u.userId,
            name: u.userName,
            email: u.userEmail,
            calls: Number(u.callCount),
            costEur: Number(u.totalCostEur),
            creditsCharged: Number(u.totalCreditsCharged),
            currentCredits: parseFloat(u.currentCredits || "0"),
          })),
        });
      }

      case "by-endpoint": {
        // Kosten pro Endpoint
        const byEndpoint = await db
          .select({
            apiProvider: apiUsageLogs.apiProvider,
            apiEndpoint: apiUsageLogs.apiEndpoint,
            model: apiUsageLogs.model,
            callCount: sql<number>`COUNT(*)`,
            totalCostEur: sql<number>`COALESCE(SUM(CAST(${apiUsageLogs.costEur} AS DECIMAL)), 0)`,
            avgDurationMs: sql<number>`AVG(${apiUsageLogs.durationMs})`,
            errorCount: sql<number>`SUM(CASE WHEN ${apiUsageLogs.statusCode} >= 400 THEN 1 ELSE 0 END)`,
          })
          .from(apiUsageLogs)
          .where(
            and(
              gte(apiUsageLogs.createdAt, startDate),
              lte(apiUsageLogs.createdAt, endDate)
            )
          )
          .groupBy(apiUsageLogs.apiProvider, apiUsageLogs.apiEndpoint, apiUsageLogs.model)
          .orderBy(desc(sql`COUNT(*)`));

        return NextResponse.json({
          success: true,
          period: { startDate, endDate },
          endpoints: byEndpoint.map(e => ({
            provider: e.apiProvider,
            endpoint: e.apiEndpoint,
            model: e.model,
            calls: Number(e.callCount),
            costEur: Number(e.totalCostEur),
            avgDurationMs: Math.round(Number(e.avgDurationMs) || 0),
            errorCount: Number(e.errorCount),
            errorRate: Number(e.callCount) > 0 
              ? (Number(e.errorCount) / Number(e.callCount) * 100).toFixed(1) 
              : 0,
          })),
        });
      }

      case "recent": {
        // Letzte API-Aufrufe
        const limit = parseInt(searchParams.get("limit") || "50");
        
        const recent = await db
          .select({
            id: apiUsageLogs.id,
            userId: apiUsageLogs.userId,
            userName: users.name,
            apiProvider: apiUsageLogs.apiProvider,
            apiEndpoint: apiUsageLogs.apiEndpoint,
            model: apiUsageLogs.model,
            inputTokens: apiUsageLogs.inputTokens,
            outputTokens: apiUsageLogs.outputTokens,
            costEur: apiUsageLogs.costEur,
            creditsCharged: apiUsageLogs.creditsCharged,
            durationMs: apiUsageLogs.durationMs,
            statusCode: apiUsageLogs.statusCode,
            createdAt: apiUsageLogs.createdAt,
          })
          .from(apiUsageLogs)
          .leftJoin(users, eq(apiUsageLogs.userId, users.id))
          .orderBy(desc(apiUsageLogs.createdAt))
          .limit(limit);

        return NextResponse.json({
          success: true,
          logs: recent.map(l => ({
            id: l.id,
            userId: l.userId,
            userName: l.userName,
            provider: l.apiProvider,
            endpoint: l.apiEndpoint,
            model: l.model,
            inputTokens: l.inputTokens,
            outputTokens: l.outputTokens,
            costEur: parseFloat(l.costEur || "0"),
            creditsCharged: parseFloat(l.creditsCharged || "0"),
            durationMs: l.durationMs,
            statusCode: l.statusCode,
            createdAt: l.createdAt,
          })),
        });
      }

      default:
        return NextResponse.json({ error: "Ungültiger Typ" }, { status: 400 });
    }
  } catch (error) {
    console.error("[Admin API Costs] Error:", error);
    return NextResponse.json({ error: "Fehler beim Abrufen der API-Kosten" }, { status: 500 });
  }
}
