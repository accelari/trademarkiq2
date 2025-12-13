import { chromium, Browser, Page } from "playwright-core";
import path from "path";
import fs from "fs";

export interface TMViewSearchResult {
  applicationNumber: string;
  registrationNumber?: string;
  markName: string;
  status: string;
  applicantName?: string;
  filingDate?: string;
  office: string;
  niceClasses?: string[];
  imageUrl?: string;
}

export interface TMViewSearchResponse {
  total: number;
  trademarks: TMViewSearchResult[];
  method: string;
  searchTime: number;
  error?: string;
  screenshots?: string[];
  steps?: string[];
}

export class TMViewAgent {
  private browser: Browser | null = null;
  private screenshotDir = "public/tmview-screenshots";

  async init(): Promise<void> {
    if (!this.browser) {
      if (!fs.existsSync(this.screenshotDir)) {
        fs.mkdirSync(this.screenshotDir, { recursive: true });
      }

      for (const file of fs.readdirSync(this.screenshotDir)) {
        fs.unlinkSync(path.join(this.screenshotDir, file));
      }

      const executablePath = "/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium";

      console.log(`[TMView Agent] Using System Chromium at: ${executablePath}`);

      this.browser = await chromium.launch({
        headless: true,
        executablePath,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-software-rasterizer",
          "--single-process",
        ],
      });
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private async takeScreenshot(page: Page, name: string): Promise<string> {
    const filename = `${Date.now()}-${name}.png`;
    const filepath = path.join(this.screenshotDir, filename);
    await page.screenshot({ path: filepath, fullPage: false });
    return `/tmview-screenshots/${filename}`;
  }

  async search(
    query: string,
    offices: string[] = ["DE", "EM"]
  ): Promise<TMViewSearchResponse> {
    const startTime = Date.now();
    let page: Page | null = null;
    const screenshots: string[] = [];
    const steps: string[] = [];

    try {
      steps.push("Browser wird gestartet...");
      await this.init();
      if (!this.browser) throw new Error("Browser not initialized");

      page = await this.browser.newPage();
      await page.setViewportSize({ width: 1280, height: 800 });

      await page.setExtraHTTPHeaders({
        "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
      });

      steps.push("Navigiere zu TMview...");
      console.log(`[TMView Agent] Navigating to TMview...`);
      await page.goto("https://www.tmdn.org/tmview/", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await page.waitForTimeout(3000);
      screenshots.push(await this.takeScreenshot(page, "01-homepage"));
      steps.push("TMview geladen");

      const cookieButton = page.locator('button:has-text("Accept all")');
      if (await cookieButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cookieButton.click();
        steps.push("Cookie-Banner akzeptiert");
        await page.waitForTimeout(1000);
      }

      steps.push(`Suche nach "${query}"...`);
      console.log(`[TMView Agent] Entering search term: ${query}`);
      
      const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
      await searchInput.waitFor({ state: "visible", timeout: 10000 });
      await searchInput.click();
      await searchInput.fill(query);
      
      screenshots.push(await this.takeScreenshot(page, "02-search-input"));
      steps.push("Suchbegriff eingegeben");

      steps.push("Suche wird ausgeführt...");
      console.log(`[TMView Agent] Pressing Enter to search...`);
      await searchInput.press("Enter");

      await page.waitForTimeout(5000);
      screenshots.push(await this.takeScreenshot(page, "03-search-results"));
      steps.push("Ergebnisse werden geladen...");

      console.log(`[TMView Agent] Waiting for results...`);
      
      await page.waitForSelector("table, .results, [class*='trademark'], [class*='result']", {
        timeout: 15000,
      }).catch(() => {
        console.log(`[TMView Agent] No specific result container found`);
      });

      await page.waitForTimeout(2000);
      screenshots.push(await this.takeScreenshot(page, "04-final-results"));
      
      const trademarks = await this.extractResults(page);
      steps.push(`${trademarks.length} Marken gefunden`);

      const searchTime = Date.now() - startTime;
      console.log(`[TMView Agent] Found ${trademarks.length} results in ${searchTime}ms`);

      return {
        total: trademarks.length,
        trademarks,
        method: "browser-agent",
        searchTime,
        screenshots,
        steps,
      };
    } catch (error) {
      console.error(`[TMView Agent] Error:`, error);
      
      if (page) {
        try {
          screenshots.push(await this.takeScreenshot(page, "error"));
        } catch {}
      }

      steps.push(`Fehler: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`);
      
      return {
        total: 0,
        trademarks: [],
        method: "browser-agent",
        searchTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
        screenshots,
        steps,
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  private async extractResults(page: Page): Promise<TMViewSearchResult[]> {
    const results: TMViewSearchResult[] = [];

    try {
      const pageContent = await page.content();
      
      const jsonPatterns = [
        /tradeMarks["']?\s*:\s*(\[[\s\S]*?\])/,
        /"results":\s*(\[[\s\S]*?\])/,
        /data\s*=\s*(\[[\s\S]*?\]);/,
      ];

      for (const pattern of jsonPatterns) {
        const match = pageContent.match(pattern);
        if (match) {
          try {
            const trademarks = JSON.parse(match[1]);
            if (Array.isArray(trademarks) && trademarks.length > 0) {
              for (const tm of trademarks.slice(0, 20)) {
                results.push({
                  markName: tm.tmName || tm.markName || tm.wordElements || tm.markVerbalElement || "",
                  applicationNumber: tm.applicationNumber || tm.ST13 || tm.appNumber || "",
                  office: tm.office || tm.officeCode || "",
                  status: tm.tmStatus || tm.status || tm.markCurrentStatusCode || "Unknown",
                  applicantName: tm.applicantName || tm.holderName,
                  filingDate: tm.applicationDate || tm.filingDate,
                  niceClasses: tm.niceClasses || tm.goodsServicesClassNumbers,
                });
              }
              console.log(`[TMView Agent] Extracted ${results.length} from JSON`);
              return results;
            }
          } catch (jsonError) {
            console.log(`[TMView Agent] JSON parse failed for pattern`);
          }
        }
      }

      const rows = await page.locator("table tbody tr").all();
      console.log(`[TMView Agent] Found ${rows.length} table rows`);
      
      for (const row of rows.slice(0, 20)) {
        try {
          const cells = await row.locator("td").all();
          if (cells.length >= 2) {
            const cellTexts = await Promise.all(cells.map(c => c.textContent()));
            
            results.push({
              office: (cellTexts[0] || "").trim(),
              markName: (cellTexts[1] || "").trim(),
              applicationNumber: (cellTexts[2] || "").trim(),
              status: (cellTexts[3] || "Unknown").trim(),
              applicantName: cellTexts[4]?.trim(),
              filingDate: cellTexts[5]?.trim(),
            });
          }
        } catch (rowError) {
          console.log(`[TMView Agent] Error extracting row`);
        }
      }

      if (results.length === 0) {
        const allText = await page.locator("body").textContent();
        const hasResults = allText?.includes("result") || allText?.includes("trademark");
        console.log(`[TMView Agent] Page has result indicators: ${hasResults}`);
      }

    } catch (error) {
      console.error(`[TMView Agent] Error extracting results:`, error);
    }

    return results;
  }
}

let agentInstance: TMViewAgent | null = null;

export function getTMViewAgent(): TMViewAgent {
  if (!agentInstance) {
    agentInstance = new TMViewAgent();
  }
  return agentInstance;
}
