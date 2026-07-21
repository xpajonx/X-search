---
name: x-search
description: Search X (Twitter) using browser-cookie authentication. Keyword search, user search, thread fetch — replaces the xAI x_search tool with a local CLI.
---

# x-tools

Search X (Twitter) using browser-cookie authentication. Replaces the xAI `x_search` server-side tool with a local, cookie-based implementation.

When to use this skill:
- The user asks about current events, trends, or real-time information from X
- The user wants to search for posts by keyword, look up users, or fetch conversation threads
- The user asks "what are people saying about X on Twitter/X"

## Authentication

Before any search command works, the user must authenticate:

```
x-tools login
```

This launches a Chromium browser, navigates to x.com/login, and waits for the user to log in manually. After login, it extracts `auth_token` and `ct0` cookies and stores them in `~/.x-cookies.json` (chmod 600).

Cookie lifetime is hours to days. Re-run `x-tools login` whenever `x-tools auth status` reports expired.

Alternative_auth methods:
- `x-tools login --browser-cookies chrome` — extract cookies from an already-running Chrome session
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
x-tools auth refresh                      # re-validate
x-tools auth logout                       # delete stored cookies
```

## Output format

Default (human-readable) output for search:
```
[@handle] tweet text
  123 likes · 45 retweets · 12 replies
  https://x.com/handle/status/tweet_id

--next-cursor: <cursor_token>
```

`--json` emits the raw API response for programmatic use.
`--report` outputs a structured JSON envelope (query, type, generatedAt, tweets with full metrics + links) for AI-powered report generation.

## Limitations

- **No semantic search** — X's semantic search is xAI-proprietary; only keyword search is available
- **No date range filtering** — X's adaptive search endpoint doesn't support `from_date`/`to_date`
- **Cookie expiry** —/auth tokens expire in hours-days; frequent re-login required
- **Rate limits** — X aggressively rate-limits internal API; add delays between rapid calls
- **No image/video understanding** — unlike xAI's tool, images/videos in posts are noted but not analyzed

## Error handling

When the LLM calls `x-tools search` or other authenticated commands:
1. If output contains "No cookies found" → run `x-tools login`
2. If output contains "expired" → run `x-tools login`
3. If output contains "rate limit" → wait 60 seconds and retry once
4. On success → format the tweet data for the user

## Installation

```bash
npm install -g x-tools    # or: bun install -g x-tools
x-tools login             # first run
```
