import { Command } from "commander";
import { XToolsClient } from "../client/index.js";
import { areCookiesPresent, getCookiePath } from "../storage.js";

export function authCommand(): Command {
  const auth = new Command("auth").description("Authentication management");

  auth
    .command("status")
    .description("Check if cookies are present and valid")
    .action(async () => {
      const hasCookies = await areCookiesPresent();
      if (!hasCookies) {
        console.log("No cookies found. Run 'x-tools login' first.");
        console.log(`Cookie path: ${getCookiePath()}`);
        return;
      }
      const client = await XToolsClient.fromStorage();
      const status = await client.authStatus();
      console.log(`Cookies: ${getCookiePath()}`);
      console.log(`Valid: ${status.valid ? "yes" : "no (expired)"}`);
    });

  auth
    .command("refresh")
    .description("Re-validate stored cookies")
    .action(async () => {
      const client = await XToolsClient.fromStorage();
      const status = await client.authStatus();
      if (status.valid) {
        console.log("Cookies are still valid.");
      } else {
        console.log("Cookies expired. Run 'x-tools login' to refresh.");
      }
    });

  auth
    .command("logout")
    .description("Delete stored cookies")
    .action(async () => {
      const client = new XToolsClient();
      await client.logout();
      console.log("Logged out. Cookies deleted.");
    });

  return auth;
}
