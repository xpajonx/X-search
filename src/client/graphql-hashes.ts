import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";

interface HashEntry {
  hash: string;
  cachedAt: string;
}

interface HashCache {
  [operation: string]: HashEntry;
}

const CACHE_PATH = join(homedir(), ".x-graphql-hashes.json");
const TTL_MS = 24 * 60 * 60 * 1000;

async function readCache(): Promise<HashCache> {
  try {
    const raw = await readFile(CACHE_PATH, "utf-8");
    return JSON.parse(raw) as HashCache;
  } catch {
    return {};
  }
}

async function writeCache(cache: HashCache): Promise<void> {
  await writeFile(CACHE_PATH, JSON.stringify(cache, null, 2), { mode: 0o600 });
}

async function extractHashFromBundle(operationName: string): Promise<string> {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.goto("https://x.com", { waitUntil: "domcontentloaded", timeout: 30_000 });

    const bundleUrls: string[] = await page.$$eval("script", (els: any[]) =>
      els
        .map((el) => el.src)
        .filter(
          (src: string) =>
            src &&
            (src.includes("abs.twimg.com") || src.includes("x.com")) &&
            src.endsWith(".js") &&
            !src.includes("cdn-cgi"),
        ),
    );

    if (bundleUrls.length === 0) {
      throw new Error("Could not find any JS bundle URLs on x.com");
    }

    // Prioritize main bundle, then vendor, then others
    const priorityOrder = ["main.", "vendor.", "bundle.", "shared~", "loader."];
    const sorted = [...bundleUrls].sort((a, b) => {
      const ai = priorityOrder.findIndex((p) => a.includes(p));
      const bi = priorityOrder.findIndex((p) => b.includes(p));
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    const escapedName = operationName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // X's JS bundle stores hashes as: queryId:"<hash>",operationName:"<name>"
    const patterns = [
      new RegExp(`queryId:"([A-Za-z0-9_-]+)",operationName:"${escapedName}"`),
      new RegExp(`operationName:"${escapedName}"[^}]*queryId:"([A-Za-z0-9_-]+)"`),
      new RegExp(`${escapedName}:"([A-Za-z0-9_-]+)"`),
      new RegExp(`"${escapedName}":"([A-Za-z0-9_-]+)"`),
    ];

    for (const bundleUrl of sorted) {
      const res = await fetch(bundleUrl);
      if (!res.ok) continue;
      const js = await res.text();

      for (const pattern of patterns) {
        const match = js.match(pattern);
        if (match?.[1]) {
          return match[1];
        }
      }
    }

    throw new Error(
      `Could not find GraphQL hash for operation "${operationName}" in the JS bundle`,
    );
  } finally {
    await browser.close();
  }
}

export async function getOperationHash(operationName: string): Promise<string> {
  const cache = await readCache();
  const entry = cache[operationName];

  if (entry && Date.now() - new Date(entry.cachedAt).getTime() < TTL_MS) {
    return entry.hash;
  }

  const hash = await extractHashFromBundle(operationName);

  cache[operationName] = {
    hash,
    cachedAt: new Date().toISOString(),
  };
  await writeCache(cache);

  return hash;
}

export async function clearHashCache(): Promise<void> {
  try {
    await writeFile(CACHE_PATH, JSON.stringify({}));
  } catch {
    // cache file does not exist — nothing to clear
  }
}
