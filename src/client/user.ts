import { getAuthHeaders } from "./auth.js";
import { getOperationHash, clearHashCache } from "./graphql-hashes.js";

export interface UserResult {
  id: string;
  handle: string;
  name: string;
  profileImageUrl: string | null;
  followersCount: number;
  verified: boolean;
}

export interface UserSearchResult {
  users: UserResult[];
}

export async function userSearch(
  query: string,
  limit?: number,
): Promise<UserSearchResult> {
  const count = limit ?? 5;

  const variables: Record<string, any> = {
    screen_name: query,
    withSafetyModeUserFields: true,
  };

  const params = new URLSearchParams();
  params.set("variables", JSON.stringify(variables));

  const headers = await getAuthHeaders();
  headers["content-type"] = "application/json";
  headers["x-twitter-active-user"] = "yes";
  headers["x-twitter-auth-type"] = "OAuth2Session";
  headers["referer"] = `https://x.com/${query}`;

  let hash = await getOperationHash("UserByScreenName");

  let res = await fetch(
    `https://x.com/i/api/graphql/${hash}/UserByScreenName?${params.toString()}`,
    { headers },
  );

  if (res.status === 404) {
    clearHashCache();
    hash = await getOperationHash("UserByScreenName");
    res = await fetch(
      `https://x.com/i/api/graphql/${hash}/UserByScreenName?${params.toString()}`,
      { headers },
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `User search request failed with status ${res.status}: ${text.substring(0, 200)}`,
    );
  }

  const data = (await res.json()) as any;
  const userData = data?.data?.user?.result;

  const users: UserResult[] = [];
  if (userData) {
    const legacy = userData.legacy || {};
    users.push({
      id: userData.rest_id ?? "",
      handle: legacy.screen_name ?? "",
      name: legacy.name ?? "",
      profileImageUrl: legacy.profile_image_url_https ?? null,
      followersCount: legacy.followers_count ?? 0,
      verified: legacy.verified ?? false,
    });
  }

  return { users };
}
