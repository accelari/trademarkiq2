import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { registrationOrders, trademarkCases, caseLogos } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

// Kosten-Berechnung Konstanten
const OFFICE_FEES: Record<string, { base: number; classesIncluded: number; perExtraClass: number; currency: string }> = {
  // Deutschland - DPMA
  DE: { base: 290, classesIncluded: 3, perExtraClass: 100, currency: "EUR" },
  // EU - EUIPO
  EU: { base: 850, classesIncluded: 1, perExtraClass: 50, currency: "EUR" }, // 2. Klasse 50, ab 3. Klasse 150
  // Schweiz - IGE
  CH: { base: 550, classesIncluded: 3, perExtraClass: 100, currency: "CHF" },
  // UK - UKIPO
  GB: { base: 170, classesIncluded: 1, perExtraClass: 50, currency: "GBP" },
  // USA - USPTO
  US: { base: 250, classesIncluded: 1, perExtraClass: 250, currency: "USD" },
  // WIPO - International
  WO: { base: 653, classesIncluded: 1, perExtraClass: 100, currency: "CHF" },
  // Benelux - BOIP
  BX: { base: 244, classesIncluded: 1, perExtraClass: 37, currency: "EUR" },
};

// Vertreter-Servicegebühren
const SERVICE_FEES: Record<string, number> = {
  DE: 249, // Deutschland
  EU: 449, // EU-Marke
  CH: 349, // Schweiz
  GB: 299, // UK
  US: 599, // USA (lokaler Partner nötig)
  WO: 499, // WIPO
  BX: 299, // Benelux
  DEFAULT: 399, // Andere Länder
};

// Berechne Amtsgebühren für ein Land
function calculateOfficeFees(countryCode: string, numClasses: number): { amount: number; currency: string } {
  const fees = OFFICE_FEES[countryCode];
  
  if (!fees) {
    // Unbekanntes Land - Schätzung
    return { amount: 300, currency: "EUR" };
  }
  
  let amount = fees.base;
  
  // EUIPO hat spezielle Staffelung: 1. Klasse inkl., 2. Klasse +50€, ab 3. Klasse +150€
  if (countryCode === "EU") {
    if (numClasses > 1) amount += 50; // 2. Klasse
    if (numClasses > 2) amount += (numClasses - 2) * 150; // Ab 3. Klasse
  } else {
    // Standard-Berechnung
    const extraClasses = Math.max(0, numClasses - fees.classesIncluded);
    amount += extraClasses * fees.perExtraClass;
  }
  
  return { amount, currency: fees.currency };
}

// Berechne Gesamtkosten
function calculateTotalCosts(countries: string[], numClasses: number, viaRepresentative: boolean) {
  const breakdown: Array<{
    country: string;
    officeFee: number;
    serviceFee: number;
    currency: string;
  }> = [];
  
  let totalOfficeFees = 0;
  let totalServiceFees = 0;
  
  for (const country of countries) {
    const officeFee = calculateOfficeFees(country, numClasses);
    const serviceFee = viaRepresentative ? (SERVICE_FEES[country] || SERVICE_FEES.DEFAULT) : 0;
    
    breakdown.push({
      country,
      officeFee: officeFee.amount,
      serviceFee,
      currency: officeFee.currency,
    });
    
    // Für Gesamtsumme in EUR umrechnen (vereinfacht)
    let officeInEur = officeFee.amount;
    if (officeFee.currency === "CHF") officeInEur = officeFee.amount * 1.05;
    if (officeFee.currency === "GBP") officeInEur = officeFee.amount * 1.17;
    if (officeFee.currency === "USD") officeInEur = officeFee.amount * 0.92;
    
    totalOfficeFees += officeInEur;
    totalServiceFees += serviceFee;
  }
  
  return {
    breakdown,
    totalOfficeFees: Math.round(totalOfficeFees),
    totalServiceFees,
    totalCost: Math.round(totalOfficeFees) + totalServiceFees,
  };
}

// GET - Kosten berechnen (ohne Auftrag zu erstellen)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const countriesParam = searchParams.get("countries");
    const classesParam = searchParams.get("classes");
    const viaRepresentative = searchParams.get("viaRepresentative") === "true";

    if (!countriesParam || !classesParam) {
      return NextResponse.json(
        { error: "countries und classes Parameter sind erforderlich" },
        { status: 400 }
      );
    }

    const countries = countriesParam.split(",").filter(Boolean);
    const numClasses = parseInt(classesParam, 10) || 1;

    const costs = calculateTotalCosts(countries, numClasses, viaRepresentative);

    return NextResponse.json({ costs });
  } catch (error) {
    console.error("[GET /api/anmeldung/registration-order] Fehler:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// POST - Vertreter-Auftrag erstellen und Email senden
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await req.json();
    const {
      caseId,
      trademarkName,
      trademarkType,
      niceClasses,
      countries,
      applicantData,
    } = body;

    // Validierung
    if (!caseId || !trademarkName || !trademarkType || !niceClasses || !countries || !applicantData) {
      return NextResponse.json(
        { error: "Alle Felder sind erforderlich" },
        { status: 400 }
      );
    }

    // Prüfen ob Case dem User gehört
    const caseRecord = await db.query.trademarkCases.findFirst({
      where: and(
        eq(trademarkCases.id, caseId),
        eq(trademarkCases.userId, session.user.id)
      ),
    });

    if (!caseRecord) {
      return NextResponse.json({ error: "Fall nicht gefunden" }, { status: 404 });
    }

    // Kosten berechnen
    const costs = calculateTotalCosts(countries, niceClasses.length, true);

    // Auftrag in DB speichern
    const [order] = await db
      .insert(registrationOrders)
      .values({
        caseId,
        userId: session.user.id,
        trademarkName,
        trademarkType,
        niceClasses,
        countries,
        applicantData,
        officeFees: costs.totalOfficeFees.toString(),
        serviceFee: costs.totalServiceFees.toString(),
        totalCost: costs.totalCost.toString(),
        status: "pending",
        emailSent: false,
      })
      .returning();

    // Logo abrufen (falls vorhanden)
    const logos = await db.query.caseLogos.findMany({
      where: and(
        eq(caseLogos.caseId, caseId),
        eq(caseLogos.isSelected, true)
      ),
    });
    const selectedLogo = logos[0] || null;

    // Email an info@accelari.com senden
    const emailContent = generateOrderEmail({
      orderId: order.id,
      trademarkName,
      trademarkType,
      niceClasses,
      countries,
      applicantData,
      costs,
      userEmail: session.user.email || "Unbekannt",
      logoUrl: selectedLogo?.url || selectedLogo?.imageData || null,
    });

    // Email senden (hier könnte ein Email-Service wie Resend/SendGrid verwendet werden)
    // Für jetzt loggen wir die Email nur
    console.log("=== VERTRETER-AUFTRAG EMAIL ===");
    console.log("An: info@accelari.com");
    console.log("Betreff:", emailContent.subject);
    console.log("Inhalt:", emailContent.body);
    console.log("===============================");

    // In Produktion: Email-Service verwenden
    // await sendEmail({
    //   to: "info@accelari.com",
    //   subject: emailContent.subject,
    //   html: emailContent.body,
    // });

    // Auftrag als "Email gesendet" markieren
    await db
      .update(registrationOrders)
      .set({
        emailSent: true,
        emailSentAt: new Date(),
      })
      .where(eq(registrationOrders.id, order.id));

    return NextResponse.json({
      success: true,
      order,
      message: "Auftrag wurde erstellt. Wir melden uns innerhalb von 24 Stunden bei dir!",
    });
  } catch (error) {
    console.error("[POST /api/anmeldung/registration-order] Fehler:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

// Email-Inhalt generieren
function generateOrderEmail(data: {
  orderId: string;
  trademarkName: string;
  trademarkType: string;
  niceClasses: number[];
  countries: string[];
  applicantData: {
    type: string;
    name: string;
    street: string;
    zip: string;
    city: string;
    country: string;
    email: string;
    phone?: string;
    legalForm?: string;
  };
  costs: {
    breakdown: Array<{ country: string; officeFee: number; serviceFee: number; currency: string }>;
    totalOfficeFees: number;
    totalServiceFees: number;
    totalCost: number;
  };
  userEmail: string;
  logoUrl: string | null;
}) {
  const countryNames: Record<string, string> = {
    DE: "Deutschland (DPMA)",
    EU: "EU (EUIPO)",
    CH: "Schweiz (IGE)",
    GB: "UK (UKIPO)",
    US: "USA (USPTO)",
    WO: "International (WIPO)",
    BX: "Benelux (BOIP)",
  };

  const subject = `Neuer Markenanmeldung-Auftrag: ${data.trademarkName}`;

  const body = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #1a365d; color: white; padding: 20px; }
    .content { padding: 20px; }
    .section { margin-bottom: 20px; padding: 15px; background: #f7fafc; border-radius: 8px; }
    .section h3 { margin-top: 0; color: #2d3748; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #edf2f7; }
    .total { font-weight: bold; font-size: 1.2em; color: #2d3748; }
    .logo-img { max-width: 200px; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Neuer Markenanmeldung-Auftrag</h1>
    <p>Auftragsnummer: ${data.orderId}</p>
  </div>
  
  <div class="content">
    <div class="section">
      <h3>Marken-Daten</h3>
      <table>
        <tr><th>Markenname</th><td><strong>${data.trademarkName}</strong></td></tr>
        <tr><th>Markenart</th><td>${data.trademarkType === "wortmarke" ? "Wortmarke" : data.trademarkType === "bildmarke" ? "Bildmarke" : "Wort-/Bildmarke"}</td></tr>
        <tr><th>Nizza-Klassen</th><td>${data.niceClasses.join(", ")}</td></tr>
        <tr><th>Länder/Ämter</th><td>${data.countries.map(c => countryNames[c] || c).join(", ")}</td></tr>
      </table>
      ${data.logoUrl ? `<p><strong>Logo:</strong><br><img src="${data.logoUrl}" alt="Logo" class="logo-img"></p>` : ""}
    </div>
    
    <div class="section">
      <h3>Anmelder-Daten</h3>
      <table>
        <tr><th>Typ</th><td>${data.applicantData.type === "firma" ? "Firma" : "Privatperson"}</td></tr>
        <tr><th>Name/Firma</th><td><strong>${data.applicantData.name}</strong></td></tr>
        ${data.applicantData.legalForm ? `<tr><th>Rechtsform</th><td>${data.applicantData.legalForm}</td></tr>` : ""}
        <tr><th>Adresse</th><td>${data.applicantData.street}<br>${data.applicantData.zip} ${data.applicantData.city}<br>${data.applicantData.country}</td></tr>
        <tr><th>E-Mail</th><td><a href="mailto:${data.applicantData.email}">${data.applicantData.email}</a></td></tr>
        ${data.applicantData.phone ? `<tr><th>Telefon</th><td>${data.applicantData.phone}</td></tr>` : ""}
      </table>
    </div>
    
    <div class="section">
      <h3>Kostenübersicht</h3>
      <table>
        <tr><th>Land/Amt</th><th>Amtsgebühr</th><th>Servicegebühr</th></tr>
        ${data.costs.breakdown.map(b => `
          <tr>
            <td>${countryNames[b.country] || b.country}</td>
            <td>${b.officeFee} ${b.currency}</td>
            <td>${b.serviceFee} EUR</td>
          </tr>
        `).join("")}
        <tr class="total">
          <td>GESAMT</td>
          <td>${data.costs.totalOfficeFees} EUR</td>
          <td>${data.costs.totalServiceFees} EUR</td>
        </tr>
      </table>
      <p class="total">Gesamtkosten: ${data.costs.totalCost} EUR</p>
    </div>
    
    <div class="section">
      <h3>Kunde</h3>
      <p>User-Email: <a href="mailto:${data.userEmail}">${data.userEmail}</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject, body };
}
