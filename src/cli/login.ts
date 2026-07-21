import { Command } from "commander";
import { XToolsClient } from "../client/index.js";
import { getCookiePath, writeCookies } from "../storage.js";
import { captureCookiesFromChromeCDP } from "../client/auth.js";

export function loginCommand(): Command {
  return new Command("login")
    .description("Log in to X and capture cookies")
    .option("--headless", "Run browser in headless mode", false)
    .option("--browser-cookies <browser>", "Extract cookies from a running browser (chrome)")
    .action(async (opts) => {
      if (opts.browserCookies === "chrome") {
        const result = await captureCookiesFromChromeCDP();
        await writeCookies(result.auth_token, result.ct_n);
        console.log(`Cookies extracted from Chrome. auth_token and ct0 saved.`);
        console.log(`Cookie file: ${getCookiePath()}`);
        console.log(`Created at: ${result.createdAt}`);
        return;
      }

      const client = new XToolsClient();
      const result = await client.login();
      console.log(`Logged in. auth_token and ct0 saved.`);
      console.log(`Cookie file: ${getCookiePath()}`);
      console.log(`Created at: ${result.createdAt}`);
    });
}
