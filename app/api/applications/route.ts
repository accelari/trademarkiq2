import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trademarkApplications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const applications = await db
      .select()
      .from(trademarkApplications)
      .where(eq(trademarkApplications.userId, session.user.id))
      .orderBy(desc(trademarkApplications.createdAt));

    return NextResponse.json(applications);
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await request.json();
    const { markName, markType, description, jurisdiction, niceClasses, goodsServices, currentStep, estimatedCost, searchId } = body;

    if (!markName) {
      return NextResponse.json({ error: "Markenname ist erforderlich" }, { status: 400 });
    }

    const [application] = await db
      .insert(trademarkApplications)
      .values({
        userId: session.user.id,
        markName,
        markType: markType || null,
        description: description || null,
        jurisdiction: jurisdiction || null,
        niceClasses: niceClasses || [],
        goodsServices: goodsServices || null,
        currentStep: currentStep || 1,
        estimatedCost: estimatedCost || null,
        searchId: searchId || null,
        status: "draft",
      })
      .returning();

    return NextResponse.json(application);
  } catch (error) {
    console.error("Error creating application:", error);
    return NextResponse.json({ error: "Fehler beim Erstellen" }, { status: 500 });
  }
}
