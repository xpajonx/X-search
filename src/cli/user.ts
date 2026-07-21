import { Command } from "commander";
import { XToolsClient } from "../client/index.js";

export function userCommand(): Command {
  return new Command("user")
    .description("Search X users")
    .argument("<query>", "Username or name to search")
    .option("-n, --limit <number>", "Number of results", "5")
    .option("--json", "Output as JSON", false)
    .action(async (query, opts) => {
      const client = await XToolsClient.fromStorage();
      const result = await client.userSearch(query, parseInt(opts.limit, 10));
      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        for (const user of result.users) {
          console.log(`@${user.handle} (${user.name}) — ${user.followersCount} followers${user.verified ? " ✓" : ""}`);
        }
      }
    });
}
