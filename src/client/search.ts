import { getAuthHeaders } from "./auth.js";

export interface SearchOpts {
  count?: number;
  type?: "top" | "latest";
  cursor?: string;
}

export interface TweetResult {
  id: string;
  text: string;
  authorId: string;
  authorHandle: string;
  authorName: string;
  createdAt: string;
  replyCount: number;
  retweetCount: number;
  likeCount: number;
  viewCount?: number | null;
  mediaUrls: string[];
}

export interface SearchResult {
  tweets: TweetResult[];
  nextCursor: string | null;
}

export async function search(query: string, opts?: SearchOpts): Promise<SearchResult> {
  const count = opts?.count ?? 20;
  const type = opts?.type ?? "latest";

  const params = new URLSearchParams();
  params.set("q", query);
  params.set("count", String(Math.min(count, 100)));
  params.set("tweet_search_mode", type === "latest" ? "live" : "");
  params.set("query_source", "typed_query");
  params.set("pc", "1");
  params.set("spelling_corrections", "1");
  if (opts?.cursor) {
    params.set("cursor", opts.cursor);
  }

  const headers = await getAuthHeaders();

  const res = await fetch(
    `https://x.com/i/api/2/search/adaptive.json?${params.toString()}`,
    { headers },
  );

  if (!res.ok) {
    throw new Error(`Search request failed with status ${res.status}`);
  }

  const data = await res.json() as any;
  const tweets = data.globalObjects?.tweets ?? {};
  const users = data.globalObjects?.users ?? {};
  const tweetIds = Object.keys(tweets).sort(
    (a, b) => tweets[b].id - tweets[a].id,
  );

  const tweetResults: TweetResult[] = tweetIds.map((id) => {
    const t = tweets[id];
    const author = users[t.user_id_str];
    const media = t.extended_entities?.media ?? [];
    const viewCount =
      t.ext_views?.count ?? t.views?.count ?? null;

    return {
      id: t.id_str,
      text: t.full_text,
      authorId: t.user_id_str,
      authorHandle: author?.screen_name ?? "",
      authorName: author?.name ?? "",
      createdAt: t.created_at,
      replyCount: t.reply_count ?? 0,
      retweetCount: t.retweet_count ?? 0,
      likeCount: t.favorite_count ?? 0,
      viewCount: viewCount !== null ? Number(viewCount) : null,
      mediaUrls: media.map((m: any) => m.media_url_https),
    };
  });

  const cursor = data.cursor?.bottom?.value ?? null;

  return { tweets: tweetResults, nextCursor: cursor };
}
