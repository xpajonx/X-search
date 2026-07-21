import { getAuthHeaders } from "./auth.js";

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

export async function userSearch(query: string, limit?: number): Promise<UserSearchResult> {
  const count = limit ?? 5;

  const params = new URLSearchParams();
  params.set("q", query);
  params.set("src", "search_box");
  params.set("result_type", "users");
  params.set("count", String(count));

  const headers = await getAuthHeaders();

  const res = await fetch(
    `https://x.com/i/api/1.1/search/typeahead.json?${params.toString()}`,
    { headers },
  );

  if (!res.ok) {
    throw new Error(`User search request failed with status ${res.status}`);
  }

  const data = await res.json() as any;
  const users: UserResult[] = (data.users ?? []).map((u: any) => ({
    id: u.id_str,
    handle: u.screen_name,
    name: u.name,
    profileImageUrl: u.profile_image_url_https ?? null,
    followersCount: u.followers_count ?? 0,
    verified: u.verified ?? false,
  }));

  return { users };
}
