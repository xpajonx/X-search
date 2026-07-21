import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  access: vi.fn(),
}));

vi.mock("node:os", () => ({
  homedir: vi.fn(() => "/home/testuser"),
}));

import { readFile, writeFile, unlink, access } from "node:fs/promises";
import {
  getCookiePath,
  areCookiesPresent,
  readCookies,
  writeCookies,
  deleteCookies,
} from "../src/storage.js";

const EXPECTED_PATH = "/home/testuser/.x-cookies.json";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCookiePath", () => {
  it("returns ~/.x-cookies.json", () => {
    expect(getCookiePath()).toBe(EXPECTED_PATH);
  });
});

describe("areCookiesPresent", () => {
  it("returns false when file doesn't exist", async () => {
    const err = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    vi.mocked(access).mockRejectedValue(err);
    expect(await areCookiesPresent()).toBe(false);
  });

  it("returns true when file exists", async () => {
    vi.mocked(access).mockResolvedValue(undefined);
    expect(await areCookiesPresent()).toBe(true);
  });
});

describe("readCookies", () => {
  it("returns null when file doesn't exist", async () => {
    const err = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    vi.mocked(readFile).mockRejectedValue(err);
    expect(await readCookies()).toBeNull();
  });

  it("returns parsed object when file exists", async () => {
    const data = {
      auth_token: "abc",
      ct_n: "xyz",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(data));
    expect(await readCookies()).toEqual(data);
  });

  it("returns null when file content is invalid JSON", async () => {
    vi.mocked(readFile).mockResolvedValue("not-json");
    expect(await readCookies()).toBeNull();
  });
});

describe("writeCookies", () => {
  it("writes JSON with auth_token, ct_n, createdAt", async () => {
    vi.mocked(writeFile).mockResolvedValue(undefined);
    await writeCookies("tok123", "ct0val");

    expect(writeFile).toHaveBeenCalledTimes(1);
    const [, content] = vi.mocked(writeFile).mock.calls[0]!;
    const parsed = JSON.parse(content as string);
    expect(parsed).toMatchObject({
      auth_token: "tok123",
      ct_n: "ct0val",
    });
    expect(parsed).toHaveProperty("createdAt");
    expect(typeof parsed.createdAt).toBe("string");
  });

  it("sets file mode to 0o600", async () => {
    vi.mocked(writeFile).mockResolvedValue(undefined);
    await writeCookies("tok", "ct0");
    expect(writeFile).toHaveBeenCalledWith(
      EXPECTED_PATH,
      expect.any(String),
      { mode: 0o600 },
    );
  });
});

describe("deleteCookies", () => {
  it("calls unlink", async () => {
    vi.mocked(unlink).mockResolvedValue(undefined);
    await deleteCookies();
    expect(unlink).toHaveBeenCalledWith(EXPECTED_PATH);
  });
});
