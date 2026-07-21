import { Command } from "commander";
import { XToolsClient } from "../client/index.js";

export function threadCommand(): Command {
  return new Command("thread")
    .description("Fetch a conversation thread")
    .argument("<tweetId>", "Tweet ID to fetch thread for")
    .option("--json", "Output as JSON", false)
    .action(async (tweetId, opts) => {
      const client = await XToolsClient.fromStorage();
      const result = await client.thread(tweetId);
      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(
          `Thread root: ${result.rootTweetId} (${result.totalReplies} replies)\n`,
        );
        for (const tweet of result.tweets) {
          console.log(`[${tweet.authorHandle}] ${tweet.text}`);
          console.log(
            `  https://x.com/${tweet.authorHandle}/status/${tweet.id}`,
          );
          console.log("");
        }
      }
    });
}
