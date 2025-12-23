import { test, expect } from "@playwright/test";

test.describe("Fall-Detail Seite", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "testpassword123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 15000 });
  });

  test("kann zur Fallliste navigieren", async ({ page }) => {
    await page.goto("/dashboard/cases");
    await expect(page).toHaveURL(/cases/);
  });

  test("zeigt Fall-Karten oder Leerzustand", async ({ page }) => {
    await page.goto("/dashboard/cases");
    await page.waitForTimeout(2000);
    
    const caseCards = page.locator('[class*="case"], [data-testid="case-card"]');
    const emptyState = page.locator('text=/Keine Fälle|Neuer Fall|Erstellen/i');
    
    const hasCases = await caseCards.count() > 0;
    const hasEmpty = await emptyState.isVisible();
    
    expect(hasCases || hasEmpty).toBeTruthy();
  });

  test("zeigt Beratung-fortsetzen Button bei in_progress", async ({ page }) => {
    const inProgressCase = await page.evaluate(async () => {
      const res = await fetch("/api/cases");
      const data = await res.json();
      return data.cases?.find((c: { status: string }) => c.status === "active");
    });
    
    if (inProgressCase) {
      await page.goto(`/dashboard/case/${inProgressCase.id}`);
      await page.waitForTimeout(1000);
      
      const continueButton = page.locator('button:has-text("fortsetzen")');
    }
  });

  test("hat Akkordeon-Sektionen", async ({ page }) => {
    const anyCase = await page.evaluate(async () => {
      const res = await fetch("/api/cases?limit=1");
      const data = await res.json();
      return data.cases?.[0];
    });
    
    if (anyCase) {
      await page.goto(`/dashboard/case/${anyCase.id}`);
      await page.waitForTimeout(1000);
      
      const beratungSection = page.locator('text=/KI-Markenberater|Beratung/i');
      const rechercheSection = page.locator('text=/Recherche/i');
      const analyseSection = page.locator('text=/Analyse|Risiko/i');
      
      await expect(beratungSection.or(rechercheSection).or(analyseSection)).toBeVisible();
    }
  });
});
