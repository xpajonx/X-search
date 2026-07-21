import * as auth from "./auth.js";
import * as search from "./search.js";
import * as user from "./user.js";
import * as thread from "./thread.js";
import {
  readCookies,
  writeCookies,
  deleteCookies,
  areCookiesPresent,
} from "../storage.js";

export type XToolsClientOpts = {
  cookiePath?: string;
};

export class XToolsClient {
  private cookiePath?: string;

  constructor(opts?: XToolsClientOpts) {
    this.cookiePath = opts?.cookiePath;
  }

  static async fromStorage(opts?: XToolsClientOpts): Promise<XToolsClient> {
    const cookies = await readCookies();
    if (!cookies) {
      throw new Error("No cookies found. Run 'x-tools login' first.");
    }
    return new XToolsClient(opts);
  }

  async login(): Promise<auth.LoginResult> {
    const result = await auth.captureCookies();
    await writeCookies(result.auth_token, result.ct_n);
    return result;
  }

  async authStatus(): Promise<{ hasCookies: boolean; valid: boolean }> {
    const hasCookies = await areCookiesPresent();
    if (!hasCookies) return { hasCookies: false, valid: false };
    const valid = await auth.validateCookies();
    return { hasCookies: true, valid };
  }

  async search(query: string, opts?: search.SearchOpts): Promise<search.SearchResult> {
    return search.search(query, opts);
  }

  async userSearch(query: string, limit?: number): Promise<user.UserSearchResult> {
    return user.userSearch(query, limit);
  }

  async thread(tweetId: string): Promise<thread.ThreadResult> {
    return thread.fetchThread(tweetId);
  }

  async logout(): Promise<void> {
    await deleteCookies();
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    return auth.getAuthHeaders();
  }
}

export { auth, search, user, thread };
