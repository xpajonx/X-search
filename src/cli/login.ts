import { Command } from "commander";
import { XToolsClient } from "../client/index.js";
import { getCookiePath } from "../storage.js";

export function loginCommand(): Command {
  return new Command("login")
    .description("Log in to X and capture cookies")
    .option("--headless", "Run browser in headless mode", false)
    .action(async (opts) => {
      const client = new XToolsClient();
      const result = await client.login();
      console.log(`Logged in. auth_token and ct0 saved.`);
      console.log(`Cookie file: ${getCookiePath()}`);
      console.log(`Created at: ${result.createdAt}`);
    });
}
