import { Command } from "commander";
import { XToolsClient } from "../client/index.js";
import { searchViaBrowser } from "../client/browser-extract.js";

export function searchCommand(): Command {
  return new Command("search")
    .description("Search X posts")
    .argument("<query>", "Search query")
    .option("-n, --count <number>", "Number of results (max 100)", "20")
    .option("-t, --type <type>", "Search type: top or latest", "top")
    .option("--json", "Output as JSON", false)
    .option(
      "--report",
      "Output structured JSON for report generation (includes metadata envelope)",
      false,
    )
    .action(async (query, opts) => {
      const count = parseInt(opts.count, 10);
      const type = opts.type as "top" | "latest";

      let result;
      try {
        const client = await XToolsClient.fromStorage();
        result = await client.search(query, { count, type });
      } catch {
        // API blocked — fall back to browser automation
        const browserResult = await searchViaBrowser(query, type, count);
        result = { tweets: browserResult.tweets, nextCursor: null };
      }

      if (opts.report) {
        const reportData = {
          query,
          type,
          generatedAt: new Date().toISOString(),
          totalResults: result.tweets.length,
          tweets: result.tweets.map((t) => ({
            id: t.id,
            text: t.text,
            authorHandle: t.authorHandle,
            authorName: t.authorName,
            authorId: t.authorId,
            createdAt: t.createdAt,
            likeCount: t.likeCount,
            retweetCount: t.retweetCount,
            replyCount: t.replyCount,
            viewCount: t.viewCount ?? null,
            mediaUrls: t.mediaUrls ?? [],
            link: `https://x.com/${(t.authorHandle || "").replace("@", "")}/status/${t.id}`,
          })),
          nextCursor: result.nextCursor,
        };
        console.log(JSON.stringify(reportData, null, 2));
        return;
      }

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        for (const tweet of result.tweets) {
          console.log(`\n[${tweet.authorHandle}] ${tweet.text}`);
          console.log(
            `  ${tweet.likeCount} likes · ${tweet.retweetCount} retweets · ${tweet.replyCount} replies`,
          );
          console.log(
            `  https://x.com/${tweet.authorHandle}/status/${tweet.id}`,
          );
        }
        if (result.nextCursor) {
          console.log(`\n--next-cursor: ${result.nextCursor}`);
        }
      }
    });
}
