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

export async function captureCookiesFromChromeCDP(endpoint?: string): Promise<LoginResult> {
  const url = endpoint || "http://127.0.0.1:9222";
  const browser = await chromium.connectOverCDP(url);
  try {
    const ctx = browser.contexts()[0] || (await browser.newContext());
    const cookies = await ctx.cookies("https://x.com");
    const authToken = cookies.find((c) => c.name === "auth_token")?.value;
    const ct0 = cookies.find((c) => c.name === "ct0")?.value;

    if (!authToken || !ct0) {
      throw new Error(
        "Could not find auth_token or ct0 cookies for x.com. " +
          "Make sure you're logged into X in Chrome."
      );
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

const X_BEARER_TOKEN =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const cookies = await readCookies();
  if (!cookies) {
    throw new Error("No cookies found. Run 'x-tools login' first.");
  }
  return {
    authorization: `Bearer ${X_BEARER_TOKEN}`,
    cookie: `auth_token=${cookies.auth_token}; ct0=${cookies.ct_n}`,
    "x-csrf-token": cookies.ct_n,
    "x-twitter-active-user": "yes",
    "x-twitter-auth-type": "OAuth2Session",
    "content-type": "application/json",
    "x-twitter-client-language": "en",
    referer: "https://x.com/",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
  };
}
