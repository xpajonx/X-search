# x-tools

Unofficial CLI and Python-free API for searching X (Twitter) using browser cookies. Replicates the `x_search` functionality from xAI's Agent Tools API without requiring an xAI API key.

## Authentication

```bash
x-tools login                  # opens Chromium, log in to X, auto-captures cookies
x-tools login --browser-cookies chrome   # extract from existing Chrome session
x-tools auth status            # check cookie validity
x-tools auth refresh           # re-validate
x-tools auth logout            # delete stored cookies
```

Cookies stored in `~/.x-cookies.json` (chmod 600). Lifetime is hours to days.

## Commands

```bash
x-tools search "query"         # keyword search (latest tweets)
x-tools search "query" -t top  # top tweets
x-tools search "query" -n 50   # 50 results
x-tools search "query" --json  # raw JSON

x-tools user "elonmusk"        # find users
x-tools user "elonmusk" -n 10  # 10 results

x-tools thread 1234567890      # fetch conversation thread
```

## Programmatic API

```ts
import { XToolsClient } from "x-tools";

const client = await XToolsClient.fromStorage();
const result = await client.search("AI news", { count: 20, type: "latest" });
for (const tweet of result.tweets) {
  console.log(`[@${tweet.authorHandle}] ${tweet.text}`);
}
```

## Development

```bash
npm install
npm run build     # tsc
npm test          # vitest
npm run typecheck # tsc --noEmit
```

## Limitations

- No semantic search (xAI-proprietary)
- No date range filtering
- Cookie expiry requires frequent re-login
- Rate limits on X's internal API
