import { Command } from "commander";
import { XToolsClient } from "../client/index.js";

export function searchCommand(): Command {
  return new Command("search")
    .description("Search X posts")
    .argument("<query>", "Search query")
    .option("-n, --count <number>", "Number of results (max 100)", "20")
    .option("-t, --type <type>", "Search type: top or latest", "latest")
    .option("--json", "Output as JSON", false)
    .action(async (query, opts) => {
      const client = await XToolsClient.fromStorage();
      const result = await client.search(query, {
        count: parseInt(opts.count, 10),
        type: opts.type,
      });
      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        for (const tweet of result.tweets) {
          console.log(`\n[${tweet.authorHandle}] ${tweet.text}`);
          console.log(`  ${tweet.likeCount} likes · ${tweet.retweetCount} retweets · ${tweet.replyCount} replies`);
          console.log(`  https://x.com/${tweet.authorHandle}/status/${tweet.id}`);
        }
        if (result.nextCursor) {
          console.log(`\n--next-cursor: ${result.nextCursor}`);
        }
      }
    });
}
