import { readCookies, writeCookies, deleteCookies } from "../storage.js";
import { chromium } from "playwright-core";

export interface LoginResult {
  success: boolean;
  auth_token: string;
  ct_n: string;
  createdAt: string;
}

export async function captureCookies(opts?: { headless?: boolean }): Promise<LoginResult> {
  const browser = await chromium.launch({
    headless: opts?.headless ?? false,
    args: ["--no-sandbox"],
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("https://x.com/login", { waitUntil: "networkidle" });
    await page.waitForURL("**/home", { timeout: 120_000 });
    const cookies = await context.cookies();
    const authToken = cookies.find((c) => c.name === "auth_token")?.value;
    const ct0 = cookies.find((c) => c.name === "ct0")?.value;

    if (!authToken || !ct0) {
      throw new Error("Failed to capture auth_token or ct0 cookies");
    }

    return {
      success: true,
      auth_token: authToken,
      ct_n: ct0,
      createdAt: new Date().toISOString(),
    };
  } finally {
    await browser.close();
  }
}

export async function validateCookies(): Promise<boolean> {
  const headers = await getAuthHeaders();
  if (!headers) return false;

  try {
    const res = await fetch("https://x.com/i/api/1.1/account/verify_credentials.json", {
      headers,
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const cookies = await readCookies();
  if (!cookies) {
    throw new Error("No cookies found. Run 'x-tools login' first.");
  }
  return {
    cookie: `auth_token=${cookies.auth_token}; ct0=${cookies.ct_n}`,
    "x-csrf-token": cookies.ct_n,
  };
}
