import { readFile, writeFile, unlink, access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { chmod } from "node:fs";

export interface StoredCookies {
  auth_token: string;
  ct_n: string;
  createdAt: string;
}

export function getCookiePath(): string {
  return join(homedir(), ".x-cookies.json");
}

export async function readCookies(): Promise<StoredCookies | null> {
  try {
    const raw = await readFile(getCookiePath(), "utf-8");
    return JSON.parse(raw) as StoredCookies;
  } catch {
    return null;
  }
}

export async function writeCookies(auth_token: string, ct_n: string): Promise<void> {
  const data: StoredCookies = {
    auth_token,
    ct_n,
    createdAt: new Date().toISOString(),
  };
  await writeFile(getCookiePath(), JSON.stringify(data, null, 2), { mode: 0o600 });
}

export async function deleteCookies(): Promise<void> {
  try {
    await unlink(getCookiePath());
  } catch {
    // file not found — nothing to delete
  }
}

export async function areCookiesPresent(): Promise<boolean> {
  try {
    await access(getCookiePath());
    return true;
  } catch {
    return false;
  }
}
