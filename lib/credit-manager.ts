import { db } from "@/db";
import { users, creditTransactions, apiUsageLogs } from "@/db/schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

// Credit-Pakete für Stripe (Januar 2026)
// Preisberechnung: 1 Credit = 0.03 EUR (3x Markup auf API-Kosten)
// Rabatte für größere Pakete motivieren zum Kauf
export const CREDIT_PACKAGES = [
  {
    id: "credits_350",
    name: "350 Credits",
    credits: 350,
    priceEur: 10.00, // Einstiegspaket, kein Rabatt
    stripePriceId: process.env.STRIPE_PRICE_350_CREDITS,
    popular: false,
  },
  {
    id: "credits_900",
    name: "900 Credits",
    credits: 900,
    priceEur: 25.00, // ~3% Rabatt (0.0278 EUR/Credit)
    stripePriceId: process.env.STRIPE_PRICE_900_CREDITS,
    popular: true,
  },
  {
    id: "credits_1900",
    name: "1900 Credits",
    credits: 1900,
    priceEur: 50.00, // ~7% Rabatt (0.0263 EUR/Credit)
    stripePriceId: process.env.STRIPE_PRICE_1900_CREDITS,
    popular: false,
  },
] as const;

// Credit-Stand eines Users abrufen
export async function getUserCredits(userId: string): Promise<{
  credits: number;
  warningThreshold: number;
  isLow: boolean;
  isEmpty: boolean;
}> {
  const [user] = await db
    .select({
      credits: users.credits,
      warningThreshold: users.creditWarningThreshold,
    })
    .from(users)
    .where(eq(users.id, userId));

  const credits = parseFloat(user?.credits || "0");
  const warningThreshold = user?.warningThreshold || 10;

  return {
    credits,
    warningThreshold,
    isLow: credits <= warningThreshold && credits > 0,
    isEmpty: credits <= 0,
  };
}

// Prüfen ob User genug Credits hat
export async function hasEnoughCredits(
  userId: string,
  requiredCredits: number
): Promise<{
  hasEnough: boolean;
  currentCredits: number;
  missing: number;
}> {
  const { credits } = await getUserCredits(userId);
  const missing = Math.max(0, requiredCredits - credits);

  return {
    hasEnough: credits >= requiredCredits,
    currentCredits: credits,
    missing,
  };
}

// Credits abziehen
export async function deductCredits(
  userId: string,
  amount: number,
  description: string,
  apiUsageLogId?: string
): Promise<{
  success: boolean;
  newBalance?: number;
  error?: string;
}> {
  try {
    const [user] = await db
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const currentBalance = parseFloat(user.credits || "0");
    const newBalance = Math.max(0, currentBalance - amount);

    // Credits aktualisieren
    await db
      .update(users)
      .set({
        credits: newBalance.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Transaktion loggen
    await db.insert(creditTransactions).values({
      userId,
      type: "usage",
      amount: (-amount).toFixed(2),
      balanceBefore: currentBalance.toFixed(2),
      balanceAfter: newBalance.toFixed(2),
      description,
      apiUsageLogId,
    });

    return { success: true, newBalance };
  } catch (error) {
    console.error("[deductCredits] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Credits hinzufügen (Kauf, Bonus, Refund)
export async function addCredits(
  userId: string,
  amount: number,
  description: string,
  options?: {
    type?: "purchase" | "bonus" | "refund" | "adjustment";
    stripePaymentIntentId?: string;
    stripeCheckoutSessionId?: string;
    createdBy?: string;
  }
): Promise<{
  success: boolean;
  newBalance?: number;
  error?: string;
}> {
  try {
    const [user] = await db
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const currentBalance = parseFloat(user.credits || "0");
    const newBalance = currentBalance + amount;

    // Credits aktualisieren
    await db
      .update(users)
      .set({
        credits: newBalance.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Transaktion loggen
    await db.insert(creditTransactions).values({
      userId,
      type: options?.type || "purchase",
      amount: amount.toFixed(2),
      balanceBefore: currentBalance.toFixed(2),
      balanceAfter: newBalance.toFixed(2),
      description,
      stripePaymentIntentId: options?.stripePaymentIntentId,
      stripeCheckoutSessionId: options?.stripeCheckoutSessionId,
      createdBy: options?.createdBy,
    });

    return { success: true, newBalance };
  } catch (error) {
    console.error("[addCredits] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Transaktionshistorie eines Users abrufen
export async function getCreditHistory(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    type?: string;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<{
  transactions: Array<{
    id: string;
    type: string;
    amount: string;
    balanceBefore: string;
    balanceAfter: string;
    description: string;
    createdAt: Date | null;
  }>;
  total: number;
}> {
  const { limit = 50, offset = 0, type, startDate, endDate } = options || {};

  const conditions = [eq(creditTransactions.userId, userId)];

  if (type) {
    conditions.push(eq(creditTransactions.type, type));
  }
  if (startDate) {
    conditions.push(gte(creditTransactions.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(creditTransactions.createdAt, endDate));
  }

  const transactions = await db
    .select({
      id: creditTransactions.id,
      type: creditTransactions.type,
      amount: creditTransactions.amount,
      balanceBefore: creditTransactions.balanceBefore,
      balanceAfter: creditTransactions.balanceAfter,
      description: creditTransactions.description,
      createdAt: creditTransactions.createdAt,
    })
    .from(creditTransactions)
    .where(and(...conditions))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(creditTransactions)
    .where(and(...conditions));

  return {
    transactions,
    total: Number(count),
  };
}

// Verbrauchsstatistiken eines Users
export async function getUserUsageStats(
  userId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
  }
): Promise<{
  totalCreditsUsed: number;
  totalCostEur: number;
  apiBreakdown: Array<{
    apiProvider: string;
    totalCredits: number;
    totalCostEur: number;
    callCount: number;
  }>;
}> {
  const { startDate, endDate } = options || {};

  const conditions = [eq(apiUsageLogs.userId, userId)];

  if (startDate) {
    conditions.push(gte(apiUsageLogs.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(apiUsageLogs.createdAt, endDate));
  }

  // Gesamtverbrauch
  const [totals] = await db
    .select({
      totalCredits: sql<number>`COALESCE(SUM(CAST(${apiUsageLogs.creditsCharged} AS DECIMAL)), 0)`,
      totalCostEur: sql<number>`COALESCE(SUM(CAST(${apiUsageLogs.costEur} AS DECIMAL)), 0)`,
    })
    .from(apiUsageLogs)
    .where(and(...conditions));

  // Aufschlüsselung nach API
  const breakdown = await db
    .select({
      apiProvider: apiUsageLogs.apiProvider,
      totalCredits: sql<number>`COALESCE(SUM(CAST(${apiUsageLogs.creditsCharged} AS DECIMAL)), 0)`,
      totalCostEur: sql<number>`COALESCE(SUM(CAST(${apiUsageLogs.costEur} AS DECIMAL)), 0)`,
      callCount: sql<number>`COUNT(*)`,
    })
    .from(apiUsageLogs)
    .where(and(...conditions))
    .groupBy(apiUsageLogs.apiProvider);

  return {
    totalCreditsUsed: Number(totals?.totalCredits || 0),
    totalCostEur: Number(totals?.totalCostEur || 0),
    apiBreakdown: breakdown.map((b) => ({
      apiProvider: b.apiProvider,
      totalCredits: Number(b.totalCredits),
      totalCostEur: Number(b.totalCostEur),
      callCount: Number(b.callCount),
    })),
  };
}

// Warning-Threshold setzen
export async function setWarningThreshold(
  userId: string,
  threshold: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(users)
      .set({
        creditWarningThreshold: threshold,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return { success: true };
  } catch (error) {
    console.error("[setWarningThreshold] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Stripe Checkout Session verarbeiten (nach erfolgreicher Zahlung)
export async function processStripePayment(
  userId: string,
  checkoutSessionId: string,
  paymentIntentId: string,
  creditsAmount: number
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  // Prüfen ob diese Session bereits verarbeitet wurde
  const existing = await db
    .select({ id: creditTransactions.id })
    .from(creditTransactions)
    .where(eq(creditTransactions.stripeCheckoutSessionId, checkoutSessionId))
    .limit(1);

  if (existing.length > 0) {
    return { success: false, error: "Payment already processed" };
  }

  // Credits gutschreiben
  return addCredits(userId, creditsAmount, `${creditsAmount} Credits gekauft`, {
    type: "purchase",
    stripePaymentIntentId: paymentIntentId,
    stripeCheckoutSessionId: checkoutSessionId,
  });
}
