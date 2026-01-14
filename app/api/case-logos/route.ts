import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { caseLogos, trademarkCases } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const caseId = searchParams.get("caseId");

    if (!caseId) {
      return NextResponse.json({ error: "caseId ist erforderlich" }, { status: 400 });
    }

    const caseRecord = await db.query.trademarkCases.findFirst({
      where: and(
        eq(trademarkCases.id, caseId),
        eq(trademarkCases.userId, session.user.id)
      ),
    });

    if (!caseRecord) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    const logos = await db.query.caseLogos.findMany({
      where: eq(caseLogos.caseId, caseId),
      orderBy: [desc(caseLogos.createdAt)],
    });

    return NextResponse.json({ logos });
  } catch (error) {
    console.error("[GET /api/case-logos] Fehler:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await req.json();
    const { caseId, url, thumbnailUrl, source, prompt, model } = body;

    if (!caseId || !url || !source) {
      return NextResponse.json(
        { error: "caseId, url und source sind erforderlich" },
        { status: 400 }
      );
    }

    const caseRecord = await db.query.trademarkCases.findFirst({
      where: and(
        eq(trademarkCases.id, caseId),
        eq(trademarkCases.userId, session.user.id)
      ),
    });

    if (!caseRecord) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    const existingLogos = await db.query.caseLogos.findMany({
      where: eq(caseLogos.caseId, caseId),
    });
    const nextSortOrder = existingLogos.length;

    const [newLogo] = await db
      .insert(caseLogos)
      .values({
        caseId,
        userId: session.user.id,
        url,
        thumbnailUrl: thumbnailUrl || null,
        source,
        prompt: prompt || null,
        model: model || null,
        sortOrder: nextSortOrder,
      })
      .returning();

    return NextResponse.json({ logo: newLogo });
  } catch (error) {
    console.error("[POST /api/case-logos] Fehler:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await req.json();
    const { logoId, isSelected } = body;

    if (!logoId || typeof isSelected !== "boolean") {
      return NextResponse.json(
        { error: "logoId und isSelected sind erforderlich" },
        { status: 400 }
      );
    }

    const logo = await db.query.caseLogos.findFirst({
      where: and(
        eq(caseLogos.id, logoId),
        eq(caseLogos.userId, session.user.id)
      ),
    });

    if (!logo) {
      return NextResponse.json({ error: "Logo nicht gefunden" }, { status: 404 });
    }

    const [updatedLogo] = await db
      .update(caseLogos)
      .set({ isSelected })
      .where(eq(caseLogos.id, logoId))
      .returning();

    return NextResponse.json({ logo: updatedLogo });
  } catch (error) {
    console.error("[PATCH /api/case-logos] Fehler:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const logoIds = searchParams.get("ids");
    const caseId = searchParams.get("caseId");
    const deleteAll = searchParams.get("all") === "true";

    if (deleteAll && caseId) {
      const caseRecord = await db.query.trademarkCases.findFirst({
        where: and(
          eq(trademarkCases.id, caseId),
          eq(trademarkCases.userId, session.user.id)
        ),
      });

      if (!caseRecord) {
        return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
      }

      await db.delete(caseLogos).where(eq(caseLogos.caseId, caseId));

      return NextResponse.json({ success: true, message: "Alle Logos gelöscht" });
    }

    if (!logoIds) {
      return NextResponse.json(
        { error: "ids Parameter ist erforderlich (kommagetrennt)" },
        { status: 400 }
      );
    }

    const idsArray = logoIds.split(",").filter(Boolean);

    if (idsArray.length === 0) {
      return NextResponse.json({ error: "Keine gültigen IDs" }, { status: 400 });
    }

    const logosToDelete = await db.query.caseLogos.findMany({
      where: and(
        inArray(caseLogos.id, idsArray),
        eq(caseLogos.userId, session.user.id)
      ),
    });

    if (logosToDelete.length === 0) {
      return NextResponse.json({ error: "Keine Logos gefunden" }, { status: 404 });
    }

    const validIds = logosToDelete.map((l) => l.id);

    await db.delete(caseLogos).where(inArray(caseLogos.id, validIds));

    return NextResponse.json({
      success: true,
      deletedCount: validIds.length,
      message: `${validIds.length} Logo(s) gelöscht`,
    });
  } catch (error) {
    console.error("[DELETE /api/case-logos] Fehler:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
