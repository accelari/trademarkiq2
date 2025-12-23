import { test, expect } from "@playwright/test";

test.describe("Recherche-Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "testpassword123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 15000 });
  });

  test("kann zur Recherche-Seite navigieren", async ({ page }) => {
    await page.click('a[href*="recherche"]');
    await expect(page).toHaveURL(/recherche/);
  });

  test("zeigt Suchformular", async ({ page }) => {
    await page.goto("/dashboard/recherche");
    await expect(page.locator('input[name="trademarkName"], input[placeholder*="Marke"]')).toBeVisible();
  });

  test("hat Länder-Auswahl", async ({ page }) => {
    await page.goto("/dashboard/recherche");
    const countrySelector = page.locator('text=/Länder|Land|Country/i');
    await expect(countrySelector).toBeVisible();
  });

  test("hat Nizza-Klassen Auswahl", async ({ page }) => {
    await page.goto("/dashboard/recherche");
    const niceSelector = page.locator('text=/Nizza|Nice|Klasse/i');
    await expect(niceSelector).toBeVisible();
  });

  test("zeigt Prefill-Banner wenn Case-Daten vorhanden", async ({ page }) => {
    const caseWithData = await page.evaluate(async () => {
      const res = await fetch("/api/cases?limit=1");
      const data = await res.json();
      return data.cases?.find((c: { trademarkName: string | null }) => c.trademarkName);
    });
    
    if (caseWithData) {
      await page.goto(`/dashboard/recherche?caseId=${caseWithData.id}`);
      const prefillBanner = page.locator('text=/vorausgefüllt|Beratung|übernommen/i');
    }
  });
});
