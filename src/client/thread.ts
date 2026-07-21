import { getAuthHeaders } from "./auth.js";
import type { TweetResult } from "./search.js";

export interface ThreadResult {
  tweets: TweetResult[];
  rootTweetId: string;
  totalReplies: number;
}

export async function fetchThread(tweetId: string): Promise<ThreadResult> {
  const params = new URLSearchParams({
    include_profile_interstitial_type: "1",
    include_blocking: "1",
    include_blocked_by: "1",
    include_followed_by: "1",
    include_want_retweets: "1",
    include_mute_edge: "1",
    include_can_dm: "1",
    include_can_media_tag: "1",
    include_ext_has_nft_avatar: "1",
    include_ext_is_blue_verified: "1",
    include_ext_verified_type: "1",
    include_ext_profile_image_shape: "1",
    skip_status: "1",
    cards_platform: "Web-12",
    include_cards: "1",
    include_ext_alt_text: "true",
    include_ext_limited_action_results: "false",
    include_quote_count: "true",
    include_reply_count: "1",
    tweet_mode: "extended",
    include_ext_views: "true",
    include_entities: "true",
    include_user_entities: "true",
    include_ext_media_color: "true",
    include_ext_media_availability: "true",
    include_ext_sensitive_media_warning: "true",
    include_ext_trusted_friends_metadata: "true",
    send_error_codes: "true",
    simple_quoted_tweet: "true",
    count: "20",
    ext: "mediaStats,highlightedLabel,hasNftAvatar,voiceInfo,birdwatchPivot,enrichments,superFollowMetadata,unmentionInfo,editControl,vibe",
  });

  const headers = await getAuthHeaders();

  const res = await fetch(
    `https://x.com/i/api/2/timeline/conversation/${tweetId}.json?${params.toString()}`,
    { headers },
  );

  if (!res.ok) {
    throw new Error(`Thread request failed with status ${res.status}`);
  }

  const data = await res.json() as any;
  const tweets = data.globalObjects?.tweets ?? {};
  const users = data.globalObjects?.users ?? {};
  const tweetIds = Object.keys(tweets);

  const tweetResults: TweetResult[] = tweetIds.map((id) => {
    const t = tweets[id];
    const author = users[t.user_id_str];
    const media = t.extended_entities?.media ?? [];
    const viewCount = t.ext_views?.count ?? t.views?.count ?? null;

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

  const rootTweet = tweets[tweetId];
  const totalReplies = rootTweet?.reply_count ?? tweetResults.length - 1;

  return {
    tweets: tweetResults,
    rootTweetId: tweetId,
    totalReplies,
  };
}
