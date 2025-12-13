import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trademarkSearches, watchlistItems, alerts, playbooks } from "@/db/schema";
import { eq, desc, and, gte, count } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [searchCount] = await db
      .select({ count: count() })
      .from(trademarkSearches)
      .where(eq(trademarkSearches.userId, session.user.id));

    const [weeklySearchCount] = await db
      .select({ count: count() })
      .from(trademarkSearches)
      .where(
        and(
          eq(trademarkSearches.userId, session.user.id),
          gte(trademarkSearches.createdAt, oneWeekAgo)
        )
      );

    const [watchlistCount] = await db
      .select({ count: count() })
      .from(watchlistItems)
      .where(eq(watchlistItems.userId, session.user.id));

    const [unacknowledgedAlerts] = await db
      .select({ count: count() })
      .from(alerts)
      .where(
        and(
          eq(alerts.userId, session.user.id),
          eq(alerts.acknowledged, false)
        )
      );

    const recentSearches = await db
      .select()
      .from(trademarkSearches)
      .where(eq(trademarkSearches.userId, session.user.id))
      .orderBy(desc(trademarkSearches.createdAt))
      .limit(5);

    const activePlaybooks = await db
      .select()
      .from(playbooks)
      .where(
        and(
          eq(playbooks.userId, session.user.id),
          eq(playbooks.status, "in_progress")
        )
      )
      .limit(3);

    return NextResponse.json({
      searches: {
        total: searchCount.count,
        thisWeek: weeklySearchCount.count,
      },
      watchlist: {
        total: watchlistCount.count,
      },
      alerts: {
        unacknowledged: unacknowledgedAlerts.count,
      },
      recentSearches,
      activePlaybooks,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}
