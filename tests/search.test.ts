import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../src/client/auth.js", () => ({
  getAuthHeaders: vi.fn().mockResolvedValue({
    cookie: "auth_token=test; ct0=test",
    "x-csrf-token": "test",
    authorization: "Bearer test",
  }),
}));

vi.mock("../src/client/graphql-hashes.js", () => ({
  getOperationHash: vi.fn().mockResolvedValue("testhash123"),
  clearHashCache: vi.fn(),
}));

import { search } from "../src/client/search.js";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const MOCK_TWEETS: Record<string, any> = {
  "123": {
    rest_id: "123",
    legacy: {
      full_text: "Hello world",
      user_id_str: "456",
      created_at: "Thu Jan 01 00:00:00 +0000 2024",
      reply_count: 5,
      retweet_count: 10,
      favorite_count: 20,
      ext_views: { count: "100" },
    },
    core: {
      user_results: {
        result: {
          legacy: { screen_name: "testuser", name: "Test User" },
        },
      },
    },
  },
  "456": {
    rest_id: "456",
    legacy: {
      full_text: "Second tweet without media",
      user_id_str: "789",
      created_at: "Thu Jan 01 00:01:00 +0000 2024",
      reply_count: 1,
      retweet_count: 2,
      favorite_count: 3,
    },
    core: {
      user_results: {
        result: {
          legacy: { screen_name: "another_user", name: "Another User" },
        },
      },
    },
  },
};

function buildResponse(
  overrides?: Partial<{
    tweets: Record<string, any>;
    cursor: any;
  }>,
) {
  const tweets = overrides?.tweets ?? MOCK_TWEETS;
  const entries: any[] = Object.values(tweets).map((t: any) => ({
    content: {
      itemContent: {
        tweet_results: { result: t },
      },
    },
  }));

  // Add a bottom cursor entry
  if (overrides?.cursor !== null) {
    entries.push({
      content: {
        cursorType: "Bottom",
        value: overrides?.cursor ?? "next_cursor_val",
      },
    });
  }

  return {
    ok: true,
    json: async () => ({
      data: {
        search_by_raw_query: {
          search_timeline: {
            timeline: {
              instructions: [{ entries }],
            },
          },
        },
      },
    }),
  };
}

describe("search", () => {
  it("constructs the correct GraphQL URL with query params", async () => {
    mockFetch.mockResolvedValue(buildResponse());

    await search("test query", { count: 20, type: "latest" });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = new URL(mockFetch.mock.calls[0]![0] as string);

    expect(url.origin).toBe("https://x.com");
    expect(url.pathname).toBe("/i/api/graphql/testhash123/SearchTimeline");
    expect(url.searchParams.get("variables")).toContain("test query");
  });

  it("sends correct auth headers", async () => {
    mockFetch.mockResolvedValue(buildResponse());

    await search("test");

    const headers = (mockFetch.mock.calls[0]![1] as RequestInit).headers;
    expect(headers).toMatchObject({
      cookie: "auth_token=test; ct0=test",
      "x-csrf-token": "test",
    });
  });

  it("parses a mock GraphQL response correctly", async () => {
    mockFetch.mockResolvedValue(buildResponse());

    const result = await search("test");

    expect(result.tweets).toHaveLength(2);

    const first = result.tweets[0]!;
    expect(first.id).toBe("123");
    expect(first.text).toBe("Hello world");
    expect(first.authorHandle).toBe("testuser");
    expect(first.authorName).toBe("Test User");
    expect(first.replyCount).toBe(5);
    expect(first.retweetCount).toBe(10);
    expect(first.likeCount).toBe(20);
    expect(first.viewCount).toBe(100);

    const second = result.tweets[1]!;
    expect(second.id).toBe("456");
    expect(second.text).toBe("Second tweet without media");
    expect(second.authorHandle).toBe("another_user");
    expect(second.authorName).toBe("Another User");
    expect(second.replyCount).toBe(1);
    expect(second.retweetCount).toBe(2);
    expect(second.likeCount).toBe(3);
    expect(second.viewCount).toBeNull();

    expect(result.nextCursor).toBe("next_cursor_val");
  });

  it("returns null when no next cursor", async () => {
    mockFetch.mockResolvedValue(buildResponse({ cursor: null }));

    const result = await search("test");
    expect(result.nextCursor).toBeNull();
  });

  it("handles empty results gracefully", async () => {
    mockFetch.mockResolvedValue(buildResponse({ tweets: {}, cursor: null }));

    const result = await search("test");
    expect(result.tweets).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });
});
