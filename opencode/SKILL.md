---
name: x-search
description: Search X (Twitter) using browser-cookie authentication. Keyword search, user search, thread fetch — replaces the xAI x_search tool with a local CLI.
---

# x-tools

Search X (Twitter) using browser-cookie authentication. Replaces the xAI `x_search` server-side tool with a local, cookie-based implementation.

## When to use this skill

- The user asks about current events, trends, or real-time information from X
- The user wants to search for posts by keyword, look up users, or fetch conversation threads
- The user asks "what are people saying about X on Twitter/X"
- The user wants a digest/report of what's happening on X about a topic

## Authentication

Before any search command works, the user must authenticate:

```
x-tools login
```

This launches a Chromium browser, navigates to x.com/login, and waits for the user to log in manually. After login, it extracts `auth_token` and `ct0` cookies and stores them in `~/.x-cookies.json` (chmod 600).

Cookie lifetime is hours to days. Re-run `x-tools login` whenever `x-tools auth status` reports expired.

Alternative auth methods:
- `x-tools login --browser-cookies chrome` — extract cookies from an already-running Chrome session (Chrome must be open with `--remote-debugging-port=9222`)
- `x-tools login --headless` — headless mode (less reliable, may trigger bot detection)

## Commands

### Search posts
```
x-tools search "AI news"                  # top tweets (default)
x-tools search "AI news" -t latest        # latest tweets
x-tools search "AI news" -n 50            # 50 results
x-tools search "AI news" --json           # raw JSON output
x-tools search "AI news" --report         # structured JSON for report generation
```

### Search users
```
x-tools user "elonmusk"                   # find users by handle/name
x-tools user "elonmusk" -n 10             # 10 results
x-tools user "elonmusk" --json            # raw JSON output
```

### Fetch thread
```
x-tools thread 1234567890                 # fetch conversation thread
x-tools thread 1234567890 --json          # raw JSON output
```

### Auth management
```
x-tools auth status                       # check cookie validity
x-tools auth logout                       # delete stored cookies
```

## --report workflow (recommended)

When the user wants to understand what's happening on X about a topic, use the `--report` flag to get structured data, then generate a full narrative report.

### Step 1: Fetch data
```bash
x-tools search "<query>" --report -n 20
```

This outputs structured JSON with:
- `query`, `type`, `generatedAt`, `totalResults`
- `tweets[]` — each with `id`, `text`, `authorHandle`, `authorName`, `createdAt`, `likeCount`, `retweetCount`, `replyCount`, `link`
- `nextCursor` — for pagination

### Step 2: Generate the report

Transform the JSON into a full narrative report with this structure:

```
═══════════════════════════════════════════════════
  X REPORT: "<query>" · <type> posts
  Generated: <generatedAt> · <totalResults> posts
═══════════════════════════════════════════════════

━━ SUMMARY ━━
  🔥 N posts with 1K+ likes
  📊 Total: X likes · Y retweets · Z replies
  👤 Top voices: @handle1, @handle2, @handle3
  📈 Biggest engagement: <topic> (X likes)

━━ SENTIMENT ━━
  Positive: X%  Neutral: Y%  Negative: Z%

━━ CATEGORIES ━━
  🚀 Product launch: N    📄 Research/Model: N
  💬 Opinion: N           🎭 Meme/Humor: N

━━ TOP POSTS ━━

[1] @handle · X likes · Y retweets
    "Full tweet text..."
    🔗 <link>

[2] @handle · X likes · Y retweets
    "Full tweet text..."
    🔗 <link>

...

━━ AI SUMMARY ━━
  [2-3 paragraph narrative: what's happening, key themes, notable takes,
   the dominant narrative, and what the engagement patterns reveal]
```

### Report guidelines

- **SUMMARY**: Aggregate metrics — total engagement, top voices by likes, the single biggest story
- **SENTIMENT**: Estimate positive/neutral/negative split based on tweet tone
- **CATEGORIES**: Classify each post (product launch, research/model announcement, opinion/hot take, meme/humor, news, other)
- **TOP POSTS**: List all posts with full text (not truncated), metrics, and direct links. Sort by engagement (likes + retweets)
- **AI SUMMARY**: Synthesize the narrative. What's the dominant story? What are the key themes? What do the engagement patterns reveal about what the X community cares about right now? Name the notable voices and their takes.

## Output format (default, without --report)

Default (human-readable) output for search:
```
[@handle] tweet text
  123 likes · 45 retweets · 12 replies
  https://x.com/handle/status/tweet_id
```

`--json` emits the raw API response for programmatic use.

## How it works

x-tools tries the GraphQL API first (with dynamic operation hash extraction from X's JS bundle). If the API is blocked (403/404), it automatically falls back to headless browser automation — opening a Chromium instance, navigating to the search page with your cookies, and extracting tweets from the rendered DOM.

## Limitations

- **No semantic search** — X's semantic search is xAI-proprietary; only keyword search is available
- **No date range filtering** — no `from_date`/`to_date` support
- **Cookie expiry** — auth tokens expire in hours-days; frequent re-login required
- **Rate limits** — X aggressively rate-limits; add delays between rapid calls
- **No image/video understanding** — images/videos in posts are noted but not analyzed
- **Browser automation** — fallback requires Playwright + Chromium (~5-10s per search)

## Error handling

When calling `x-tools search` or other authenticated commands:
1. If output contains "No cookies found" → run `x-tools login`
2. If output contains "expired" → run `x-tools login`
3. If output contains "rate limit" → wait 60 seconds and retry once
4. If output contains "Could not find GraphQL hash" → the JS bundle format changed; report as a bug
5. On success with `--report` → generate the full narrative report (see above)

## Installation

```bash
npm install -g x-tools    # or: bun install -g x-tools
x-tools login             # first run
```
