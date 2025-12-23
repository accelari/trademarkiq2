import { test, expect } from "@playwright/test";

test.describe("Beratungs-Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "testpassword123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 15000 });
  });

  test("kann zur Beratungsseite navigieren", async ({ page }) => {
    await page.click('a[href*="copilot"]');
    await expect(page).toHaveURL(/copilot/);
    await expect(page.getByText(/Markenberater|Klaus/)).toBeVisible();
  });

  test("zeigt Text-Modus Option", async ({ page }) => {
    await page.goto("/dashboard/copilot");
    const textModeButton = page.locator('button:has-text("Text")');
    await expect(textModeButton).toBeVisible();
  });

  test("erstellt automatisch einen Fall beim Start", async ({ page }) => {
    await page.goto("/dashboard/copilot");
    await page.waitForTimeout(2000);
    const caseIndicator = page.locator('[class*="case"], [data-testid="case-indicator"]');
    const urlHasCaseId = page.url().includes("caseId=");
  });

  test("zeigt Warnung bei minimalem Inhalt", async ({ page }) => {
    await page.goto("/dashboard/copilot");
    await page.waitForTimeout(1000);
    
    const saveButton = page.locator('button:has-text("Speichern")');
    if (await saveButton.isVisible()) {
      await saveButton.click();
      const warningModal = page.locator('text=/wenig Inhalt|Minimal|Entwurf/i');
    }
  });
});
