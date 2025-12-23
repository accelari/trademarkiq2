import { test as setup, expect } from "@playwright/test";

const testUser = {
  email: "test@example.com",
  password: "testpassword123",
};

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  
  await page.fill('input[name="email"]', testUser.email);
  await page.fill('input[name="password"]', testUser.password);
  await page.click('button[type="submit"]');
  
  await page.waitForURL(/dashboard/, { timeout: 10000 });
  
  await page.context().storageState({ path: ".auth/user.json" });
});
