import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { applicantProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// GET - Anmelder-Profile des Users abrufen
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const profiles = await db.query.applicantProfiles.findMany({
      where: eq(applicantProfiles.userId, session.user.id),
    });

    // Standard-Profil finden
    const defaultProfile = profiles.find((p) => p.isDefault) || profiles[0] || null;

    return NextResponse.json({ profiles, defaultProfile });
  } catch (error) {
    console.error("[GET /api/anmeldung/applicant-profile] Fehler:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST - Neues Anmelder-Profil erstellen
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await req.json();
    const {
      applicantType,
      name,
      street,
      zip,
      city,
      country,
      email,
      phone,
      legalForm,
      registrationNumber,
      isDefault,
    } = body;

    // Validierung
    if (!applicantType || !name || !street || !zip || !city || !country || !email) {
      return NextResponse.json(
        { error: "Pflichtfelder fehlen: applicantType, name, street, zip, city, country, email" },
        { status: 400 }
      );
    }

    // Wenn isDefault=true, alle anderen Profile auf isDefault=false setzen
    if (isDefault) {
      await db
        .update(applicantProfiles)
        .set({ isDefault: false })
        .where(eq(applicantProfiles.userId, session.user.id));
    }

    const [newProfile] = await db
      .insert(applicantProfiles)
      .values({
        userId: session.user.id,
        applicantType,
        name,
        street,
        zip,
        city,
        country,
        email,
        phone: phone || null,
        legalForm: legalForm || null,
        registrationNumber: registrationNumber || null,
        isDefault: isDefault || false,
      })
      .returning();

    return NextResponse.json({ profile: newProfile });
  } catch (error) {
    console.error("[POST /api/anmeldung/applicant-profile] Fehler:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// PATCH - Anmelder-Profil aktualisieren
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await req.json();
    const { profileId, ...updateData } = body;

    if (!profileId) {
      return NextResponse.json({ error: "profileId ist erforderlich" }, { status: 400 });
    }

    // Prüfen ob Profil dem User gehört
    const existingProfile = await db.query.applicantProfiles.findFirst({
      where: and(
        eq(applicantProfiles.id, profileId),
        eq(applicantProfiles.userId, session.user.id)
      ),
    });

    if (!existingProfile) {
      return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });
    }

    // Wenn isDefault=true, alle anderen Profile auf isDefault=false setzen
    if (updateData.isDefault) {
      await db
        .update(applicantProfiles)
        .set({ isDefault: false })
        .where(eq(applicantProfiles.userId, session.user.id));
    }

    const [updatedProfile] = await db
      .update(applicantProfiles)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(applicantProfiles.id, profileId))
      .returning();

    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error("[PATCH /api/anmeldung/applicant-profile] Fehler:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// DELETE - Anmelder-Profil löschen
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get("profileId");

    if (!profileId) {
      return NextResponse.json({ error: "profileId ist erforderlich" }, { status: 400 });
    }

    // Prüfen ob Profil dem User gehört
    const existingProfile = await db.query.applicantProfiles.findFirst({
      where: and(
        eq(applicantProfiles.id, profileId),
        eq(applicantProfiles.userId, session.user.id)
      ),
    });

    if (!existingProfile) {
      return NextResponse.json({ error: "Profil nicht gefunden" }, { status: 404 });
    }

    await db.delete(applicantProfiles).where(eq(applicantProfiles.id, profileId));

    return NextResponse.json({ success: true, message: "Profil gelöscht" });
  } catch (error) {
    console.error("[DELETE /api/anmeldung/applicant-profile] Fehler:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
