import { getAuthHeaders } from "./auth.js";
import { getOperationHash, clearHashCache } from "./graphql-hashes.js";

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

const FEATURES = {
  rweb_video_screen_enabled: false,
  rweb_cashtags_enabled: true,
  profile_label_improvements_pcf_label_in_post_enabled: true,
  responsive_web_profile_redirect_enabled: true,
  rweb_tipjar_consumption_enabled: false,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  premium_content_api_read_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  responsive_web_grok_analyze_button_fetch_trends_enabled: false,
  responsive_web_grok_analyze_post_followups_enabled: true,
  rweb_cashtags_composer_attachment_enabled: true,
  responsive_web_jetfuel_frame: true,
  responsive_web_grok_share_attachment_enabled: true,
  responsive_web_grok_annotations_enabled: true,
  articles_preview_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  rweb_conversational_replies_downvote_enabled: false,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  content_disclosure_indicator_enabled: true,
  content_disclosure_ai_generated_indicator_enabled: true,
  responsive_web_grok_show_grok_translated_post: true,
  responsive_web_grok_analysis_button_from_backend: true,
  post_ctas_fetch_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: false,
  responsive_web_grok_image_annotation_enabled: true,
  responsive_web_grok_imagine_annotation_enabled: true,
  responsive_web_grok_community_note_auto_translation_is_enabled: true,
  responsive_web_enhance_cards_enabled: false,
};

function extractTweets(data: any): TweetResult[] {
  const instructions =
    data?.data?.search_by_raw_query?.search_timeline?.timeline?.instructions ?? [];
  const entries: any[] = [];
  for (const inst of instructions) {
    if (inst.entries) entries.push(...inst.entries);
    if (inst.moduleItems) entries.push(...inst.moduleItems);
  }

  const tweetResults: TweetResult[] = [];
  for (const entry of entries) {
    const content = entry.content?.itemContent?.tweet_results?.result;
    if (!content) continue;
    const legacy = content.legacy || content;
    const userResult =
      content.core?.user_results?.result?.legacy ??
      content.core?.user_result?.result?.legacy ??
      legacy;

    tweetResults.push({
      id: legacy.id_str ?? content.rest_id ?? "",
      text: legacy.full_text ?? "",
      authorId:
        legacy.user_id_str ??
        content.core?.user_results?.result?.rest_id ??
        "",
      authorHandle: userResult?.screen_name ?? legacy?.screen_name ?? "",
      authorName: userResult?.name ?? legacy?.name ?? "",
      createdAt: legacy.created_at ?? "",
      replyCount: legacy.reply_count ?? 0,
      retweetCount: legacy.retweet_count ?? 0,
      likeCount: legacy.favorite_count ?? 0,
      viewCount:
        legacy.ext_views?.count != null
          ? Number(legacy.ext_views.count)
          : null,
      mediaUrls: [],
    });
  }
  return tweetResults;
}

export async function search(
  query: string,
  opts?: SearchOpts,
): Promise<SearchResult> {
  const count = opts?.count ?? 20;
  const type = opts?.type ?? "top";
  const cursor = opts?.cursor;

  const variables: Record<string, any> = {
    rawQuery: query,
    count: Math.min(count, 100),
    querySource: "typed_query",
    product: type === "top" ? "Top" : "Latest",
    withGrokTranslatedBio: true,
    withQuickPromoteEligibilityTweetFields: false,
  };
  if (cursor) {
    variables.cursor = cursor;
  }

  const params = new URLSearchParams();
  params.set("variables", JSON.stringify(variables));
  params.set("features", JSON.stringify(FEATURES));

  const headers = await getAuthHeaders();
  headers["content-type"] = "application/json";
  headers["x-twitter-active-user"] = "yes";
  headers["x-twitter-auth-type"] = "OAuth2Session";
  headers["referer"] =
    "https://x.com/search?q=" +
    encodeURIComponent(query) +
    "&src=typed_query&f=" +
    (type === "top" ? "top" : "live");

  let hash = await getOperationHash("SearchTimeline");

  let res = await fetch(
    `https://x.com/i/api/graphql/${hash}/SearchTimeline?${params.toString()}`,
    { headers },
  );

  if (res.status === 404) {
    await clearHashCache();
    hash = await getOperationHash("SearchTimeline");
    res = await fetch(
      `https://x.com/i/api/graphql/${hash}/SearchTimeline?${params.toString()}`,
      { headers },
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Search request failed with status ${res.status}: ${text.substring(0, 200)}`,
    );
  }

  const data = (await res.json()) as any;
  const tweets = extractTweets(data);

  let nextCursor: string | null = null;
  const instructions2 =
    (data as any)?.data?.search_by_raw_query?.search_timeline?.timeline?.instructions ?? [];
  for (const inst of instructions2) {
    if (inst.entries) {
      for (const entry of inst.entries) {
        if (entry.content?.cursorType === "Bottom" && entry.content?.value) {
          nextCursor = entry.content.value;
        }
      }
    }
  }

  return { tweets, nextCursor };
}
