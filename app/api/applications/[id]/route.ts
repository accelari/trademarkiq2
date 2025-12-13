import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { trademarkApplications } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { id } = await params;

    const [application] = await db
      .select()
      .from(trademarkApplications)
      .where(
        and(
          eq(trademarkApplications.id, id),
          eq(trademarkApplications.userId, session.user.id)
        )
      );

    if (!application) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error("Error fetching application:", error);
    return NextResponse.json({ error: "Fehler beim Laden" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { markName, markType, description, jurisdiction, niceClasses, goodsServices, currentStep, status, expertId, estimatedCost, searchId } = body;

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (markName !== undefined) updateData.markName = markName;
    if (markType !== undefined) updateData.markType = markType;
    if (description !== undefined) updateData.description = description;
    if (jurisdiction !== undefined) updateData.jurisdiction = jurisdiction;
    if (niceClasses !== undefined) updateData.niceClasses = niceClasses;
    if (goodsServices !== undefined) updateData.goodsServices = goodsServices;
    if (currentStep !== undefined) updateData.currentStep = currentStep;
    if (status !== undefined) updateData.status = status;
    if (expertId !== undefined) updateData.expertId = expertId;
    if (estimatedCost !== undefined) updateData.estimatedCost = estimatedCost;
    if (searchId !== undefined) updateData.searchId = searchId;

    const [application] = await db
      .update(trademarkApplications)
      .set(updateData)
      .where(
        and(
          eq(trademarkApplications.id, id),
          eq(trademarkApplications.userId, session.user.id)
        )
      )
      .returning();

    if (!application) {
      return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error("Error updating application:", error);
    return NextResponse.json({ error: "Fehler beim Aktualisieren" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { id } = await params;

    await db
      .delete(trademarkApplications)
      .where(
        and(
          eq(trademarkApplications.id, id),
          eq(trademarkApplications.userId, session.user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting application:", error);
    return NextResponse.json({ error: "Fehler beim Löschen" }, { status: 500 });
  }
}
