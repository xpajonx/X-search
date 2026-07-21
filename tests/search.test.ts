import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../src/client/auth.js", () => ({
  getAuthHeaders: vi.fn().mockResolvedValue({
    cookie: "auth_token=test; ct0=test",
    "x-csrf-token": "test",
  }),
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
    id: 123,
    id_str: "123",
    full_text: "Hello world",
    user_id_str: "456",
    created_at: "Thu Jan 01 00:00:00 +0000 2024",
    reply_count: 5,
    retweet_count: 10,
    favorite_count: 20,
    ext_views: { count: "100" },
    extended_entities: {
      media: [{ media_url_https: "https://pbs.twimg.com/media/test.jpg" }],
    },
  },
  "456": {
    id: 456,
    id_str: "456",
    full_text: "Second tweet without media",
    user_id_str: "789",
    created_at: "Thu Jan 01 00:01:00 +0000 2024",
    reply_count: 1,
    retweet_count: 2,
    favorite_count: 3,
  },
};

const MOCK_USERS: Record<string, any> = {
  "456": { screen_name: "testuser", name: "Test User" },
  "789": { screen_name: "another_user", name: "Another User" },
};

function buildResponse(
  overrides?: Partial<{
    tweets: Record<string, any>;
    users: Record<string, any>;
    cursor: any;
  }>,
) {
  return {
    ok: true,
    json: async () => ({
      globalObjects: {
        tweets: overrides?.tweets ?? MOCK_TWEETS,
        users: overrides?.users ?? MOCK_USERS,
      },
      cursor: overrides?.cursor ?? { bottom: { value: "next_cursor_val" } },
    }),
  };
}

describe("search", () => {
  it("constructs the correct URL with query params", async () => {
    mockFetch.mockResolvedValue(buildResponse());

    await search("test query", { count: 20, type: "latest" });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = new URL(mockFetch.mock.calls[0]![0] as string);

    expect(url.origin).toBe("https://x.com");
    expect(url.pathname).toBe("/i/api/2/search/adaptive.json");
    expect(url.searchParams.get("q")).toBe("test query");
    expect(url.searchParams.get("count")).toBe("20");
    expect(url.searchParams.get("tweet_search_mode")).toBe("live");
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

  it("parses a mock X API response correctly", async () => {
    mockFetch.mockResolvedValue(buildResponse());

    const result = await search("test");

    expect(result.tweets).toHaveLength(2);

    const first = result.tweets[0]!;
    expect(first.id).toBe("456");
    expect(first.text).toBe("Second tweet without media");
    expect(first.authorId).toBe("789");
    expect(first.authorHandle).toBe("another_user");
    expect(first.authorName).toBe("Another User");
    expect(first.replyCount).toBe(1);
    expect(first.retweetCount).toBe(2);
    expect(first.likeCount).toBe(3);
    expect(first.viewCount).toBeNull();
    expect(first.mediaUrls).toEqual([]);

    const second = result.tweets[1]!;
    expect(second.id).toBe("123");
    expect(second.text).toBe("Hello world");
    expect(second.authorId).toBe("456");
    expect(second.authorHandle).toBe("testuser");
    expect(second.authorName).toBe("Test User");
    expect(second.replyCount).toBe(5);
    expect(second.retweetCount).toBe(10);
    expect(second.likeCount).toBe(20);
    expect(second.viewCount).toBe(100);
    expect(second.mediaUrls).toEqual([
      "https://pbs.twimg.com/media/test.jpg",
    ]);

    expect(result.nextCursor).toBe("next_cursor_val");
  });

  it("returns null when no next cursor", async () => {
    mockFetch.mockResolvedValue(buildResponse({ cursor: {} }));

    const result = await search("test");
    expect(result.nextCursor).toBeNull();
  });

  it("handles empty results gracefully", async () => {
    mockFetch.mockResolvedValue(
      buildResponse({ tweets: {}, users: {}, cursor: { bottom: null } }),
    );

    const result = await search("test");
    expect(result.tweets).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });
});
